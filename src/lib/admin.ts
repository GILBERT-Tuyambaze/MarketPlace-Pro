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
  writeBatch,
  getDoc,
  serverTimestamp,
  limit,
  arrayRemove,
} from 'firebase/firestore';

// Access control
export function canAdminPerform(role: string) {
  return role === 'admin';
}

// ============ 1. COMMUNICATION SYSTEM ============

export async function sendAdminMessage(
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
    sender_role: 'admin',
    recipients,
    created_at: serverTimestamp(),
  });

  await logActivity({
    actor_id: senderId,
    actor_role: 'admin',
    action: 'send_admin_message',
    target: { type: 'message', id: res.id },
  });

  return res.id;
}

export async function broadcastAnnouncement(
  senderId: string,
  title: string,
  content: string,
  targetRoles: string[]
) {
  const announcementsRef = collection(db, 'announcements');
  const res = await addDoc(announcementsRef, {
    title,
    content,
    target_audience: targetRoles.join(', '),
    status: 'published',
    created_by: senderId,
    created_at: serverTimestamp(),
    published_at: serverTimestamp(),
  });

  await logActivity({
    actor_id: senderId,
    actor_role: 'admin',
    action: 'broadcast_announcement',
    target: { type: 'announcement', id: res.id },
  });

  return res.id;
}

export async function fetchAllMessages() {
  const q = query(collection(db, 'messages'), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchMessageHistory(limit_count = 100) {
  const q = query(
    collection(db, 'messages'),
    orderBy('created_at', 'desc'),
    limit(limit_count)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ============ 2. CLAIMS MANAGEMENT ============

export async function fetchAllClaims() {
  const q = query(collection(db, 'claims'), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getClaimDetail(claimId: string) {
  const snap = await getDoc(doc(db, 'claims', claimId));
  if (!snap.exists()) throw new Error('Claim not found');
  return { id: snap.id, ...snap.data() };
}

export async function updateClaimStatusAsAdmin(
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
    resolved_by_admin: actorId,
    resolved_at: newStatus === 'resolved' ? serverTimestamp() : null,
  });

  const historyRef = collection(claimRef, 'history');
  await addDoc(historyRef, {
    status: newStatus,
    note: note || null,
    changed_by: actorId,
    changed_by_role: 'admin',
    created_at: serverTimestamp(),
  });

  await logActivity({
    actor_id: actorId,
    actor_role: 'admin',
    action: `claim_admin_status_${newStatus}`,
    target: { type: 'claim', id: claimId },
  });
}

export async function deleteClaimAsAdmin(claimId: string, actorId: string) {
  const claimRef = doc(db, 'claims', claimId);
  await deleteDoc(claimRef);

  await logActivity({
    actor_id: actorId,
    actor_role: 'admin',
    action: 'claim_deleted_by_admin',
    target: { type: 'claim', id: claimId },
  });
}

export async function deleteMultipleClaims(claimIds: string[], actorId: string) {
  const batch = writeBatch(db);
  for (const claimId of claimIds) {
    const claimRef = doc(db, 'claims', claimId);
    batch.delete(claimRef);
  }
  await batch.commit();

  await logActivity({
    actor_id: actorId,
    actor_role: 'admin',
    action: 'bulk_claims_deleted',
    target: { type: 'claims', count: claimIds.length },
  });
}

// ============ 3. USER MANAGEMENT ============

export async function fetchUsersByRole(role: string) {
  const q = query(
    collection(db, 'profiles'),
    where('role', '==', role),
    orderBy('created_at', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAllUsers() {
  const q = query(collection(db, 'profiles'), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getUserDetail(userId: string) {
  const snap = await getDoc(doc(db, 'profiles', userId));
  if (!snap.exists()) throw new Error('User not found');
  return { id: snap.id, ...snap.data() };
}

export async function updateUserStatus(
  userId: string,
  newStatus: 'active' | 'suspended' | 'banned' | 'pending',
  actorId: string,
  reason?: string
) {
  const userRef = doc(db, 'profiles', userId);
  await updateDoc(userRef, {
    account_status: newStatus,
    status_updated_at: serverTimestamp(),
    status_updated_by: actorId,
    status_reason: reason || null,
  });

  await logActivity({
    actor_id: actorId,
    actor_role: 'admin',
    action: `user_status_${newStatus}`,
    target: { type: 'user', id: userId },
  });
}

export async function fetchUserActivityLogs(userId: string) {
  // Avoid composite index by removing server-side orderBy; sort client-side instead
  const q = query(
    collection(db, 'activity_logs'),
    where('actor_id', '==', userId),
    limit(50)
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return docs.sort((a: any, b: any) => {
    const ta = a.created_at?.toDate?.()?.getTime?.() || 0;
    const tb = b.created_at?.toDate?.()?.getTime?.() || 0;
    return tb - ta;
  });
}

export async function fetchUserLoginHistory(userId: string) {
  // Avoid composite index requirement by removing server-side orderBy
  const q = query(
    collection(db, 'login_history'),
    where('user_id', '==', userId),
    limit(20)
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return docs.sort((a: any, b: any) => {
    const ta = a.login_at?.toDate?.()?.getTime?.() || 0;
    const tb = b.login_at?.toDate?.()?.getTime?.() || 0;
    return tb - ta;
  });
}

export async function logLoginAttempt(userId: string, ipAddress?: string) {
  const logRef = collection(db, 'login_history');
  await addDoc(logRef, {
    user_id: userId,
    login_at: serverTimestamp(),
    ip_address: ipAddress || null,
  });
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
  canAdminPerform,
  sendAdminMessage,
  broadcastAnnouncement,
  fetchAllMessages,
  fetchMessageHistory,
  fetchAllClaims,
  getClaimDetail,
  updateClaimStatusAsAdmin,
  deleteClaimAsAdmin,
  deleteMultipleClaims,
  fetchUsersByRole,
  getAllUsers,
  getUserDetail,
  updateUserStatus,
  fetchUserActivityLogs,
  fetchUserLoginHistory,
  logLoginAttempt,
  logActivity,
};
