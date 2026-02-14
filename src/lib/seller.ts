import { db } from './firebaseClient';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  setDoc,
  getDoc,
  collectionGroup,
  serverTimestamp,
  limit,
} from 'firebase/firestore';

// Access control
export function canSellerPerform(role: string) {
  return role === 'seller' || role === 'admin';
}

// ============ 1. ORDER MANAGEMENT ============

export async function fetchSellerOrders(sellerId: string, pageSize = 50) {
  // Query orders where this seller is involved (via sellers array)
  // Note: Removed orderBy to avoid requiring composite index in development
  const q = query(
    collection(db, 'orders'),
    where('sellers', 'array-contains', sellerId),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // Sort client-side by created_at descending
  return docs.sort((a: any, b: any) => {
    const timeA = a.created_at?.toDate?.()?.getTime?.() || 0;
    const timeB = b.created_at?.toDate?.()?.getTime?.() || 0;
    return timeB - timeA;
  });
}

export async function getOrderDetail(orderId: string) {
  const snap = await getDoc(doc(db, 'orders', orderId));
  if (!snap.exists()) throw new Error('Order not found');
  return { id: snap.id, ...snap.data() };
}

export async function searchSellerOrders(
  sellerId: string,
  searchTerm: string,
  searchBy: 'order_id' | 'buyer_name' | 'product_name' = 'order_id'
) {
  if (searchBy === 'order_id') {
    const snap = await getDoc(doc(db, 'orders', searchTerm));
    if (!snap.exists() || !(snap.data() as any)?.sellers?.includes(sellerId)) {
      return [];
    }
    return [{ id: snap.id, ...snap.data() }];
  }

  // For buyer_name and product_name, fetch all seller orders and filter client-side
  const orders = await fetchSellerOrders(sellerId);
  const searchLower = searchTerm.toLowerCase();
  if (searchBy === 'buyer_name') {
    return orders.filter((o) =>
      ((o as any)?.buyer_name || '').toLowerCase().includes(searchLower)
    );
  } else if (searchBy === 'product_name') {
    return orders.filter((o) =>
      (o as any)?.items?.some((item: any) =>
        ((item?.product_name) || '').toLowerCase().includes(searchLower)
      )
    );
  }
  return [];
}

// ============ 2. ORDER STATUS UPDATES ============

export async function updateOrderItemStatus(
  orderId: string,
  itemIndex: number,
  newStatus: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled',
  sellerId: string,
  reason?: string
) {
  const orderRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) throw new Error('Order not found');

  const order = orderSnap.data() as any;
  if (!order.items || !order.items[itemIndex]) {
    throw new Error('Item not found');
  }

  // Update item status
  const items = [...order.items];
  items[itemIndex] = { ...items[itemIndex], status: newStatus };

  await updateDoc(orderRef, { items });

  // Log to order history
  const historyRef = collection(orderRef, 'history');
  await addDoc(historyRef, {
    item_index: itemIndex,
    product_id: items[itemIndex]?.product_id,
    previous_status: order.items[itemIndex]?.status || 'pending',
    new_status: newStatus,
    reason: reason || null,
    changed_by: sellerId,
    changed_by_role: 'seller',
    created_at: serverTimestamp(),
  });

  await logActivity({
    actor_id: sellerId,
    actor_role: 'seller',
    action: `order_item_status_${newStatus}`,
    target: { type: 'order', id: orderId, itemIndex },
  });
}

export async function getOrderHistory(orderId: string) {
  const orderRef = doc(db, 'orders', orderId);
  const historyRef = collection(orderRef, 'history');
  const snap = await getDocs(query(historyRef, orderBy('created_at', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ============ 3. ORDER MESSAGING ============

export async function sendOrderMessage(
  orderId: string,
  senderId: string,
  senderRole: string,
  recipientRole: string, // 'buyer' or 'seller'
  subject: string,
  body: string
) {
  const orderRef = doc(db, 'orders', orderId);
  const messagesRef = collection(orderRef, 'messages');
  const res = await addDoc(messagesRef, {
    sender_id: senderId,
    sender_role: senderRole,
    recipient_role: recipientRole,
    subject,
    body,
    created_at: serverTimestamp(),
  });

  await logActivity({
    actor_id: senderId,
    actor_role: senderRole,
    action: 'order_message_send',
    target: { type: 'order', id: orderId },
  });

  return res.id;
}

export async function fetchOrderMessages(orderId: string) {
  const orderRef = doc(db, 'orders', orderId);
  const messagesRef = collection(orderRef, 'messages');
  const snap = await getDocs(query(messagesRef, orderBy('created_at', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ============ 4. INTERNAL COMMUNICATION ============

export async function sendSellerMessage(
  senderId: string,
  recipients: { role?: string; uid?: string }[],
  subject: string,
  body: string
) {
  const mRef = collection(db, 'messages');
  
  // Extract UIDs and roles for easier querying
  const recipientUids = recipients.filter(r => r.uid).map(r => r.uid);
  const recipientRoles = recipients.filter(r => r.role).map(r => (r.role || '').toLowerCase());
  
  const res = await addDoc(mRef, {
    subject,
    body,
    sender_id: senderId,
    sender_role: 'seller',
    recipients,
    recipient_uids: recipientUids,
    recipient_roles: recipientRoles,
    created_at: serverTimestamp(),
  });

  await logActivity({
    actor_id: senderId,
    actor_role: 'seller',
    action: 'send_message',
    target: { type: 'message', id: res.id },
  });

  return res.id;
}

export async function fetchSellerMessages(userId: string) {
  // Query messages where this seller is explicitly listed as a recipient (by UID)
  // This covers messages sent directly to the seller by admins/editors
  const q = query(
    collection(db, 'messages'),
    where('recipient_uids', 'array-contains', userId)
  );
  
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  
  // Sort client-side by created_at descending
  return docs.sort((a: any, b: any) => {
    const timeA = a.created_at?.toDate?.()?.getTime?.() || 0;
    const timeB = b.created_at?.toDate?.()?.getTime?.() || 0;
    return timeB - timeA;
  });
}

// ============ PRODUCT MANAGEMENT ============

export async function getSellerProducts(sellerId: string) {
  const q = query(
    collection(db, 'products'),
    where('seller_id', '==', sellerId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ============ SELLER AGGREGATION / STATS ============

export async function getSellerSoldAndRevenue(sellerId: string) {
  try {
    const orders = await fetchSellerOrders(sellerId, 1000);
    let soldCount = 0;
    let revenue = 0;

      for (const o of orders as Array<Record<string, any>>) {
        const items: Array<Record<string, any>> = o.items || [];
        for (const item of items) {
        // item should contain product_id, seller_id, quantity, price, status
        if ((item.seller_id || item.sellerId) === sellerId) {
          // count sold items excluding cancelled
          if (item.status && item.status !== 'cancelled') {
            const qty = item.quantity || 0;
            soldCount += qty;
            const price = item.price || item.unit_price || item.product_price || 0;
            revenue += (price * qty);
          }
        }
      }
    }

    return { soldCount, revenue };
  } catch (error) {
    console.error('Error computing seller sold/revenue:', error, sellerId);
    return { soldCount: 0, revenue: 0 };
  }
}

export async function getSellerInCartCount(sellerId: string) {
  try {
    // Query all cart subcollections across users
    const cartQuery = collectionGroup(db, 'cart');
    const snap = await getDocs(cartQuery);

    // Build map of productId -> totalQuantity
    const productQuantities: Record<string, number> = {};
    const productIds = new Set<string>();

    for (const docSnap of snap.docs) {
      const data = docSnap.data() as Record<string, any>;
      const pid = data.product_id;
      const qty = data.quantity || 1;
      if (!pid) continue;
      productQuantities[pid] = (productQuantities[pid] || 0) + qty;
      productIds.add(pid);
    }

    // Fetch product docs in batches
    const productIdList = Array.from(productIds);
    let inCartTotal = 0;
    const batchSize = 50;
    for (let i = 0; i < productIdList.length; i += batchSize) {
      const batch = productIdList.slice(i, i + batchSize);
      const fetches = batch.map((pid) => getDoc(doc(db, 'products', pid)));
      const snaps = await Promise.all(fetches);
      for (const psnap of snaps) {
        if (!psnap || !psnap.exists()) continue;
        const pdata = psnap.data() as Record<string, any>;
        const pid = psnap.id;
        if ((pdata.seller_id || pdata.sellerId) === sellerId) {
          inCartTotal += (productQuantities[pid] || 0);
        }
      }
    }

    return inCartTotal;
  } catch (error) {
    console.error('Error computing in-cart count for seller:', error, sellerId);
    return 0;
  }
}

export async function getSellerStatsWithCache(sellerId: string, ttlSeconds = 300) {
  try {
    const cacheRef = doc(db, 'seller_stats_cache', sellerId);
    const cacheSnap = await getDoc(cacheRef);
    if (cacheSnap.exists()) {
      const data = cacheSnap.data() as any;
      const createdAt = data.created_at?.toDate?.()?.getTime?.();
      if (createdAt && Date.now() - createdAt < ttlSeconds * 1000) {
        return {
          soldCount: data.soldCount || 0,
          revenue: data.revenue || 0,
          inCart: data.inCart || 0,
          cached: true,
        };
      }
    }

    const { soldCount, revenue } = await getSellerSoldAndRevenue(sellerId);
    const inCart = await getSellerInCartCount(sellerId);

    const payload = { soldCount, revenue, inCart, created_at: serverTimestamp() };
    await setDoc(cacheRef, payload);

    return { soldCount, revenue, inCart, cached: false };
  } catch (error) {
    console.error('Error computing cached seller stats:', error, sellerId);
    const { soldCount, revenue } = await getSellerSoldAndRevenue(sellerId).catch(() => ({ soldCount: 0, revenue: 0 }));
    const inCart = await getSellerInCartCount(sellerId).catch(() => 0);
    return { soldCount, revenue, inCart, cached: false };
  }
}

export async function addSellerProduct(sellerId: string, productData: {
  name: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image: string;
}) {
  const productsRef = collection(db, 'products');
  const docRef = await addDoc(productsRef, {
    ...productData,
    seller_id: sellerId,
    status: 'draft',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateSellerProduct(productId: string, updates: any) {
  const productRef = doc(db, 'products', productId);
  await updateDoc(productRef, {
    ...updates,
    updated_at: serverTimestamp(),
  });
}

export async function decreaseProductStock(productId: string, quantity: number) {
  const productRef = doc(db, 'products', productId);
  const productSnap = await getDoc(productRef);
  
  if (!productSnap.exists()) throw new Error('Product not found');
  
  const currentStock = productSnap.data().stock || 0;
  const newStock = Math.max(0, currentStock - quantity);
  
  await updateDoc(productRef, {
    stock: newStock,
    updated_at: serverTimestamp(),
  });
}

// ============ 5. CLAIMS MANAGEMENT ============

export async function submitClaim(
  senderId: string,
  senderRole: string,
  title: string,
  description: string,
  claimType: string,
  department: string
) {
  const claimsRef = collection(db, 'claims');
  const res = await addDoc(claimsRef, {
    title,
    description,
    claim_type: claimType,
    department,
    sender_id: senderId,
    sender_role: senderRole,
    status: 'sent',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  await logActivity({
    actor_id: senderId,
    actor_role: senderRole,
    action: 'claim_submitted',
    target: { type: 'claim', id: res.id },
  });

  return res.id;
}

export async function fetchUserClaims(userId: string) {
  // Query claims submitted by this user
  const q = query(
    collection(db, 'claims'),
    where('sender_id', '==', userId)
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // Sort client-side by created_at descending
  return docs.sort((a: any, b: any) => {
    const timeA = a.created_at?.toDate?.()?.getTime?.() || 0;
    const timeB = b.created_at?.toDate?.()?.getTime?.() || 0;
    return timeB - timeA;
  });
}

export async function getClaimDetail(claimId: string) {
  const snap = await getDoc(doc(db, 'claims', claimId));
  if (!snap.exists()) throw new Error('Claim not found');
  return { id: snap.id, ...snap.data() };
}

// ============ ACTIVITY LOGGING ============

export async function logActivity(entry: {
  actor_id: string;
  actor_role: string;
  action: string;
  target?: any;
}) {
  const logsRef = collection(db, 'activity_logs');
  await addDoc(logsRef, {
    ...entry,
    created_at: serverTimestamp(),
  });
}

export default {
  canSellerPerform,
  fetchSellerOrders,
  getOrderDetail,
  searchSellerOrders,
  updateOrderItemStatus,
  getOrderHistory,
  sendOrderMessage,
  fetchOrderMessages,
  sendSellerMessage,
  fetchSellerMessages,
  submitClaim,
  fetchUserClaims,
  getClaimDetail,
  getSellerProducts,
  getSellerSoldAndRevenue,
  getSellerInCartCount,
  getSellerStatsWithCache,
  addSellerProduct,
  updateSellerProduct,
  decreaseProductStock,
  logActivity,
};
