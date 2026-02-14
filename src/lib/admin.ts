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
  
  // Extract UIDs and roles for easier querying
  const recipientUids = recipients.filter(r => r.uid).map(r => r.uid);
  const recipientRoles = recipients.filter(r => r.role).map(r => (r.role || '').toLowerCase());
  
  const res = await addDoc(mRef, {
    subject,
    body,
    sender_id: senderId,
    sender_role: 'admin',
    recipients,
    recipient_uids: recipientUids,
    recipient_roles: recipientRoles,
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

export async function changeUserRole(
  userId: string,
  newRole: string,
  actorId: string,
  reason?: string
) {
  const userRef = doc(db, 'profiles', userId);
  await updateDoc(userRef, {
    role: newRole,
    role_updated_at: serverTimestamp(),
    role_updated_by: actorId,
    role_change_reason: reason || null,
  });

  await logActivity({
    actor_id: actorId,
    actor_role: 'admin',
    action: 'user_role_changed',
    target: { type: 'user', id: userId, new_role: newRole },
  });
}

export async function approveSeller(
  userId: string,
  actorId: string
) {
  const userRef = doc(db, 'profiles', userId);
  await updateDoc(userRef, {
    role: 'seller',
    seller_status: 'approved',
    seller_approved_at: serverTimestamp(),
    seller_approved_by: actorId,
  });

  await logActivity({
    actor_id: actorId,
    actor_role: 'admin',
    action: 'seller_approved',
    target: { type: 'user', id: userId },
  });
}

export async function rejectSeller(
  userId: string,
  actorId: string,
  reason?: string
) {
  const userRef = doc(db, 'profiles', userId);
  await updateDoc(userRef, {
    seller_status: 'rejected',
    seller_rejected_at: serverTimestamp(),
    seller_rejected_by: actorId,
    seller_rejection_reason: reason || null,
  });

  await logActivity({
    actor_id: actorId,
    actor_role: 'admin',
    action: 'seller_rejected',
    target: { type: 'user', id: userId },
  });
}

export async function updateUserProfile(
  userId: string,
  profileData: Record<string, unknown>,
  actorId: string
) {
  const userRef = doc(db, 'profiles', userId);
  const updateData: Record<string, unknown> = { ...profileData };
  delete updateData.id; // Remove id to prevent conflicts
  
  await updateDoc(userRef, {
    ...updateData,
    profile_updated_at: serverTimestamp(),
    profile_updated_by: actorId,
  });

  await logActivity({
    actor_id: actorId,
    actor_role: 'admin',
    action: 'user_profile_updated',
    target: { type: 'user', id: userId },
  });
}

export async function deleteUserAsAdmin(
  userId: string,
  actorId: string
) {
  // Delete user profile
  const userRef = doc(db, 'profiles', userId);
  await deleteDoc(userRef);

  // Delete user's products
  const productsQ = query(collection(db, 'products'), where('seller_id', '==', userId));
  const productsDocs = await getDocs(productsQ);
  
  for (const productDoc of productsDocs.docs) {
    await deleteDoc(doc(db, 'products', productDoc.id));
  }

  // Delete user's orders
  const ordersQ = query(collection(db, 'orders'), where('buyer_id', '==', userId));
  const ordersDocs = await getDocs(ordersQ);
  
  for (const orderDoc of ordersDocs.docs) {
    await deleteDoc(doc(db, 'orders', orderDoc.id));
  }

  // Delete user's messages
  const messagesQ = query(collection(db, 'messages'), where('sender_id', '==', userId));
  const messageDocs = await getDocs(messagesQ);
  
  for (const messageDoc of messageDocs.docs) {
    await deleteDoc(doc(db, 'messages', messageDoc.id));
  }

  await logActivity({
    actor_id: actorId,
    actor_role: 'admin',
    action: 'user_deleted',
    target: { type: 'user', id: userId },
  });
}

export async function getPendingSellerRequests() {
  // Fetch users with role=seller and seller_status=pending or null
  const q = query(
    collection(db, 'profiles'),
    where('role', '==', 'seller')
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // Filter those with pending or no status
  return docs.filter((u: any) => !u.seller_status || u.seller_status === 'pending');
}

// ============ 6. SITE SETTINGS & MAINTENANCE ============

export async function getSiteSettings() {
  const snap = await getDoc(doc(db, 'settings', 'platform'));
  if (!snap.exists()) {
    return {
      maintenance_mode: false,
      maintenance_message: 'The website is currently under maintenance. Please check back soon.',
      marketplace_locked: false,
      updated_at: null,
    };
  }
  return snap.data();
}

export async function updateSiteSettings(
  settings: {
    maintenance_mode?: boolean;
    maintenance_message?: string;
    marketplace_locked?: boolean;
  },
  actorId?: string
) {
  const settingsRef = doc(db, 'settings', 'platform');
  const updates: any = {
    ...settings,
    updated_at: serverTimestamp(),
  };

  await updateDoc(settingsRef, updates);

  if (actorId) {
    await logActivity({
      actor_id: actorId,
      actor_role: 'admin',
      action: 'site_settings_updated',
      target: { type: 'site_settings', changes: settings },
    });
  }
}

// ============ 7. USER ONLINE STATUS ============

export async function recordUserActivity(userId: string) {
  const userRef = doc(db, 'profiles', userId);
  await updateDoc(userRef, {
    last_online_at: serverTimestamp(),
  });
}

export async function getUserLastOnline(userId: string) {
  const snap = await getDoc(doc(db, 'profiles', userId));
  if (!snap.exists()) return null;
  return snap.data()?.last_online_at;
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

// ============ AUTHENTICATION/USERS DATA ============

export async function getAuthUserStatus(userId: string) {
  try {
    // Try authentication/users collection first
    const q = query(
      collection(db, 'authentication/users'),
      where('uid', '==', userId),
      limit(1)
    );
    const snapResult = await getDocs(q);
    
    // If not found, try 'users' collection as fallback
    if (snapResult.empty) {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          is_online: data.is_online || false,
          last_active: data.last_active || null,
          session_id: data.session_id || null,
          device_info: data.device_info || null,
          email: data.email || null,
          uid: userId,
        };
      }
      return {
        is_online: false,
        last_active: null,
        session_id: null,
        device_info: null,
        uid: userId,
      };
    }
    
    const data = snapResult.docs[0].data();
    return {
      is_online: data.is_online || false,
      last_active: data.last_active || null,
      session_id: data.session_id || null,
      device_info: data.device_info || null,
      email: data.email || null,
      uid: userId,
    };
  } catch (error) {
    console.warn('Error fetching auth user status:', error);
    return {
      is_online: false,
      last_active: null,
      session_id: null,
      device_info: null,
      uid: userId,
    };
  }
}

export async function getAllAuthUserStatuses() {
  try {
    // Try to fetch from authentication/users collection
    const q = query(collection(db, 'authentication/users'));
    let snap = await getDocs(q);
    
    // If empty, try 'users' collection
    if (snap.empty) {
      const q2 = query(collection(db, 'users'));
      snap = await getDocs(q2);
    }

    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        uid: data.uid || doc.id,
        is_online: data.is_online || false,
        last_active: data.last_active || null,
        session_id: data.session_id || null,
        device_info: data.device_info || null,
        email: data.email || null,
      };
    });
  } catch (error) {
    console.warn('Error fetching all auth user statuses:', error);
    return [];
  }
}

export default {
  canAdminPerform,
  sendAdminMessage,
  broadcastAnnouncement,
  fetchAllMessages,
  fetchMessageHistory,
  submitClaim,
  fetchAllClaims,
  getClaimDetail,
  updateClaimStatusAsAdmin,
  deleteClaimAsAdmin,
  deleteMultipleClaims,
  fetchUsersByRole,
  getAllUsers,
  getUserDetail,
  updateUserStatus,
  changeUserRole,
  approveSeller,
  rejectSeller,
  updateUserProfile,
  deleteUserAsAdmin,
  getPendingSellerRequests,
  getSiteSettings,
  updateSiteSettings,
  recordUserActivity,
  getUserLastOnline,
  fetchUserActivityLogs,
  fetchUserLoginHistory,
  logLoginAttempt,
  logActivity,
  getAuthUserStatus,
  getAllAuthUserStatuses,
};
