import { db } from './firebaseClient';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  getDoc,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';

// Helper utilities for Editor actions: approvals, comments, messages, claims, activity logs

export async function fetchPendingProducts(limit = 50) {
  const q = query(
    collection(db, 'products'),
    where('request_status', '==', 'pending'),
    orderBy('created_at', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchPendingSellers(limit = 50) {
  const q = query(
    collection(db, 'sellers'),
    where('seller_status', '==', 'pending'),
    orderBy('created_at', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function setProductRequestStatus(productId: string, status: 'approved' | 'rejected' | 'needs_revision', editorId: string, comment?: string) {
  const productRef = doc(db, 'products', productId);
  const batch = writeBatch(db);
  batch.update(productRef, {
    request_status: status,
    request_decision_by: editorId,
    request_decision_at: serverTimestamp(),
  });

  // add a comment to subcollection for seller visibility
  if (comment) {
    const commentsRef = collection(productRef, 'comments');
    batch.set(doc(commentsRef), {
      author_id: editorId,
      role: 'editor',
      body: comment,
      internal: false,
      created_at: serverTimestamp(),
    });
  }

  await batch.commit();
  await logActivity({
    actor_id: editorId,
    actor_role: 'editor',
    action: `product_request_${status}`,
    target: { type: 'product', id: productId },
  });
}

export async function setSellerRequestStatus(sellerId: string, status: 'approved' | 'rejected', editorId: string, comment?: string) {
  const sellerRef = doc(db, 'sellers', sellerId);
  await updateDoc(sellerRef, {
    seller_status: status,
    decision_by: editorId,
    decision_at: serverTimestamp(),
  });

  if (comment) {
    const commentsRef = collection(sellerRef, 'comments');
    await addDoc(commentsRef, {
      author_id: editorId,
      role: 'editor',
      body: comment,
      created_at: serverTimestamp(),
    });
  }

  await logActivity({
    actor_id: editorId,
    actor_role: 'editor',
    action: `seller_request_${status}`,
    target: { type: 'seller', id: sellerId },
  });
}

export async function addProductComment(productId: string, authorId: string, body: string, internal = false) {
  const productRef = doc(db, 'products', productId);
  const commentsRef = collection(productRef, 'comments');
  const docRef = await addDoc(commentsRef, {
    author_id: authorId,
    role: 'editor',
    body,
    internal,
    created_at: serverTimestamp(),
  });

  await logActivity({
    actor_id: authorId,
    actor_role: 'editor',
    action: 'product_comment',
    target: { type: 'product', id: productId },
  });

  return docRef.id;
}

export async function sendMessage(senderId: string, senderRole: string, recipients: { role?: string; uid?: string }[], subject: string, body: string) {
  // recipients: either role-based (role) or individual (uid)
  const mRef = collection(db, 'messages');
  const payload = {
    subject,
    body,
    sender_id: senderId,
    sender_role: senderRole,
    recipients,
    created_at: serverTimestamp(),
  } as any;
  const res = await addDoc(mRef, payload);
  await logActivity({
    actor_id: senderId,
    actor_role: senderRole,
    action: 'send_message',
    target: { type: 'messages', id: res.id },
  });
  return res.id;
}

export async function submitClaim(senderId: string, senderRole: string, department: string, title: string, description: string) {
  if (!title || !description) throw new Error('Title and description required');
  const cRef = collection(db, 'claims');
  const res = await addDoc(cRef, {
    title,
    description,
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
    action: 'submit_claim',
    target: { type: 'claim', id: res.id },
  });
  return res.id;
}

export async function updateClaimStatus(claimId: string, newStatus: 'sent' | 'under_review' | 'resolved' | 'closed', actorId: string, actorRole: string, note?: string) {
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
    changed_by_role: actorRole,
    created_at: serverTimestamp(),
  });

  await logActivity({
    actor_id: actorId,
    actor_role: actorRole,
    action: `claim_status_${newStatus}`,
    target: { type: 'claim', id: claimId },
  });
}

export async function fetchClaimsForDepartment(department: string) {
  const q = query(collection(db, 'claims'), where('department', '==', department), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchUserClaims(userId: string) {
  const q = query(collection(db, 'claims'), where('sender_id', '==', userId), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function logActivity(entry: { actor_id: string; actor_role: string; action: string; target?: any }) {
  const logsRef = collection(db, 'activity_logs');
  await addDoc(logsRef, {
    ...entry,
    created_at: serverTimestamp(),
  });
}

// Access control helper (client-side enforcement): returns true if role is allowed
export function canEditorPerform(role: string) {
  return role === 'editor' || role === 'admin';
}

export default {
  fetchPendingProducts,
  fetchPendingSellers,
  setProductRequestStatus,
  setSellerRequestStatus,
  addProductComment,
  sendMessage,
  submitClaim,
  updateClaimStatus,
  fetchClaimsForDepartment,
  fetchUserClaims,
  logActivity,
  canEditorPerform,
};
