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
  const q = query(
    collection(db, 'orders'),
    where('sellers', 'array-contains', sellerId),
    orderBy('created_at', 'desc'),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
  if (searchBy === 'buyer_name') {
    return orders.filter((o) =>
      (o as any)?.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  } else if (searchBy === 'product_name') {
    return orders.filter((o) =>
      (o as any)?.items?.some((item: any) =>
        item?.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
  const res = await addDoc(mRef, {
    subject,
    body,
    sender_id: senderId,
    sender_role: 'seller',
    recipients,
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
  const q = query(
    collection(db, 'messages'),
    where('recipients', 'array-contains', { uid: userId }),
    orderBy('created_at', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
  logActivity,
};
