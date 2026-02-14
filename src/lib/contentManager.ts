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
  deleteDoc,
  serverTimestamp,
  writeBatch,
  getDoc,
  Timestamp,
  arrayUnion,
  limit,
} from 'firebase/firestore';

// Access control helper
export function canContentManagerPerform(role: string) {
  return role === 'content_manager' || role === 'admin';
}

// ============ 1. PRODUCT MANAGEMENT ============

export async function fetchProducts(pageSize = 50) {
  const q = query(
    collection(db, 'products'),
    orderBy('created_at', 'desc'),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateProductDetails(
  productId: string,
  updates: any,
  actorId: string
) {
  const productRef = doc(db, 'products', productId);
  const batch = writeBatch(db);

  // Update product doc
  batch.update(productRef, {
    ...updates,
    updated_at: serverTimestamp(),
  });

  // Add to history subcollection
  const historyRef = collection(productRef, 'edit_history');
  batch.set(doc(historyRef), {
    previous_values: updates, // ideally fetch old values first
    new_values: updates,
    edited_by: actorId,
    edited_at: serverTimestamp(),
  });

  await batch.commit();
  await logActivity({
    actor_id: actorId,
    actor_role: 'content_manager',
    action: 'product_update',
    target: { type: 'product', id: productId },
  });
}

export async function addProductInternalNote(
  productId: string,
  authorId: string,
  note: string
) {
  const productRef = doc(db, 'products', productId);
  const notesRef = collection(productRef, 'internal_notes');
  await addDoc(notesRef, {
    author_id: authorId,
    role: 'content_manager',
    body: note,
    created_at: serverTimestamp(),
  });

  await logActivity({
    actor_id: authorId,
    actor_role: 'content_manager',
    action: 'product_note',
    target: { type: 'product', id: productId },
  });
}

export async function fetchProductHistory(productId: string) {
  const productRef = doc(db, 'products', productId);
  const historyRef = collection(productRef, 'edit_history');
  const snap = await getDocs(query(historyRef, orderBy('edited_at', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchProductNotes(productId: string) {
  const productRef = doc(db, 'products', productId);
  const notesRef = collection(productRef, 'internal_notes');
  const snap = await getDocs(query(notesRef, orderBy('created_at', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ============ 2. CLAIMS MANAGEMENT ============

export async function fetchClaimsForContentManager() {
  const q = query(
    collection(db, 'claims'),
    where('department', '==', 'Content Manager Department'),
    orderBy('created_at', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getClaimDetail(claimId: string) {
  const snap = await getDoc(doc(db, 'claims', claimId));
  if (!snap.exists()) throw new Error('Claim not found');
  return { id: snap.id, ...snap.data() };
}

export async function updateClaimStatus(
  claimId: string,
  newStatus: 'sent' | 'under_review' | 'resolved' | 'closed',
  actorId: string,
  note?: string
) {
  const claimRef = doc(db, 'claims', claimId);
  const claimSnap = await getDoc(claimRef);
  if (!claimSnap.exists()) throw new Error('Claim not found');

  await updateDoc(claimRef, {
    status: newStatus,
    updated_at: serverTimestamp(),
  });

  const historyRef = collection(claimRef, 'history');
  await addDoc(historyRef, {
    status: newStatus,
    note: note || null,
    changed_by: actorId,
    changed_by_role: 'content_manager',
    created_at: serverTimestamp(),
  });

  await logActivity({
    actor_id: actorId,
    actor_role: 'content_manager',
    action: `claim_status_${newStatus}`,
    target: { type: 'claim', id: claimId },
  });
}

// ============ 3. COMMUNICATION SYSTEM ============

export async function sendMessage(
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
    sender_role: 'content_manager',
    recipients,
    created_at: serverTimestamp(),
  });

  await logActivity({
    actor_id: senderId,
    actor_role: 'content_manager',
    action: 'send_message',
    target: { type: 'message', id: res.id },
  });

  return res.id;
}

export async function fetchMessagesForUser(userId: string) {
  const q = query(
    collection(db, 'messages'),
    where('recipients', 'array-contains', { uid: userId }),
    orderBy('created_at', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ============ 4. WEBSITE ANNOUNCEMENTS ============

export async function createAnnouncement(
  title: string,
  content: string,
  targetAudience: string,
  publishDate?: Date,
  expirationDate?: Date,
  actorId?: string
) {
  const announcementsRef = collection(db, 'announcements');
  const res = await addDoc(announcementsRef, {
    title,
    content,
    target_audience: targetAudience,
    publish_date: publishDate ? Timestamp.fromDate(publishDate) : serverTimestamp(),
    expiration_date: expirationDate ? Timestamp.fromDate(expirationDate) : null,
    status: 'draft',
    created_by: actorId,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  await logActivity({
    actor_id: actorId || 'system',
    actor_role: 'content_manager',
    action: 'announcement_create',
    target: { type: 'announcement', id: res.id },
  });

  return res.id;
}

export async function updateAnnouncement(
  announcementId: string,
  updates: any,
  actorId: string
) {
  const announcementRef = doc(db, 'announcements', announcementId);
  await updateDoc(announcementRef, {
    ...updates,
    updated_at: serverTimestamp(),
  });

  await logActivity({
    actor_id: actorId,
    actor_role: 'content_manager',
    action: 'announcement_update',
    target: { type: 'announcement', id: announcementId },
  });
}

export async function publishAnnouncement(announcementId: string, actorId: string) {
  const announcementRef = doc(db, 'announcements', announcementId);
  await updateDoc(announcementRef, {
    status: 'published',
    published_at: serverTimestamp(),
  });

  await logActivity({
    actor_id: actorId,
    actor_role: 'content_manager',
    action: 'announcement_publish',
    target: { type: 'announcement', id: announcementId },
  });
}

export async function deleteAnnouncement(announcementId: string, actorId: string) {
  const announcementRef = doc(db, 'announcements', announcementId);
  await deleteDoc(announcementRef);

  await logActivity({
    actor_id: actorId,
    actor_role: 'content_manager',
    action: 'announcement_delete',
    target: { type: 'announcement', id: announcementId },
  });
}

export async function fetchAnnouncements(
  status?: 'draft' | 'published' | 'archived'
) {
  let q: any;
  if (status) {
    q = query(
      collection(db, 'announcements'),
      where('status', '==', status),
      orderBy('created_at', 'desc')
    );
  } else {
    q = query(
      collection(db, 'announcements'),
      orderBy('created_at', 'desc')
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ============ 5. ORDER TRACKING & MANAGEMENT ============

export async function fetchOrders(pageSize = 50) {
  const q = query(
    collection(db, 'orders'),
    orderBy('created_at', 'desc'),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function searchOrders(
  searchTerm: string,
  searchBy: 'order_id' | 'buyer_name' | 'seller_name' = 'order_id'
) {
  if (searchBy === 'order_id') {
    const snap = await getDoc(doc(db, 'orders', searchTerm));
    if (!snap.exists()) return [];
    return [{ id: snap.id, ...snap.data() }];
  } else if (searchBy === 'buyer_name') {
    const q = query(
      collection(db, 'orders'),
      where('buyer_name', '==', searchTerm)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } else if (searchBy === 'seller_name') {
    const q = query(
      collection(db, 'orders'),
      where('seller_name', '==', searchTerm)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  return [];
}

export async function getOrderDetail(orderId: string) {
  const snap = await getDoc(doc(db, 'orders', orderId));
  if (!snap.exists()) throw new Error('Order not found');
  return { id: snap.id, ...snap.data() };
}

export async function sendOrderMessage(
  orderId: string,
  recipientRole: 'buyer' | 'seller',
  subject: string,
  body: string,
  actorId: string
) {
  const orderRef = doc(db, 'orders', orderId);
  const messagesRef = collection(orderRef, 'messages');
  await addDoc(messagesRef, {
    recipient_role: recipientRole,
    subject,
    body,
    sender_id: actorId,
    sender_role: 'content_manager',
    created_at: serverTimestamp(),
  });

  await logActivity({
    actor_id: actorId,
    actor_role: 'content_manager',
    action: 'order_message_send',
    target: { type: 'order', id: orderId },
  });
}

export async function fetchOrderMessages(orderId: string) {
  const orderRef = doc(db, 'orders', orderId);
  const messagesRef = collection(orderRef, 'messages');
  const snap = await getDocs(query(messagesRef, orderBy('created_at', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ============ 6. ACTIVITY LOGGING ============

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

// ============ USER MANAGEMENT ============

export async function getAllUsers() {
  try {
    const q = query(collection(db, 'profiles'), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
}

export async function getAllAuthUserStatuses() {
  try {
    const q = query(collection(db, 'authentication/users'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching auth statuses:', error);
    return [];
  }
}

export default {
  canContentManagerPerform,
  fetchProducts,
  updateProductDetails,
  addProductInternalNote,
  fetchProductHistory,
  fetchProductNotes,
  fetchClaimsForContentManager,
  getClaimDetail,
  updateClaimStatus,
  sendMessage,
  fetchMessagesForUser,
  createAnnouncement,
  updateAnnouncement,
  publishAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  fetchOrders,
  searchOrders,
  getOrderDetail,
  sendOrderMessage,
  fetchOrderMessages,
  logActivity,
  getAllUsers,
  getAllAuthUserStatuses,
};
