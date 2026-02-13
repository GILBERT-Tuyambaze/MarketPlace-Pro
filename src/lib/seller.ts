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
  getDoc,
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
  addSellerProduct,
  updateSellerProduct,
  decreaseProductStock,
  logActivity,
};
