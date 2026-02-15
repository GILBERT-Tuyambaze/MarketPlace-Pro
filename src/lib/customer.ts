import { db } from './firebaseClient';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
  deleteDoc,
  Timestamp,
  writeBatch,
  QueryConstraint,
  arrayUnion,
  arrayRemove,
  getDoc,
} from 'firebase/firestore';

export interface ProductComment {
  id: string;
  product_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  comment: string;
  rating: number; // 1-5
  created_at: Timestamp;
  updated_at: Timestamp;
  helpful_count: number;
  replies?: ProductReply[];
}

export interface ProductReply {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  reply: string;
  created_at: Timestamp;
}

export interface SavedProduct {
  id: string;
  product_id: string;
  user_id: string;
  created_at: Timestamp;
}

export interface LovedProduct {
  id: string;
  product_id: string;
  user_id: string;
  created_at: Timestamp;
}

export interface SellerInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  seller_status: string;
  average_rating: number;
  total_reviews: number;
  joined_date: Timestamp;
  location?: string;
  response_time?: string;
}

// ============ PRODUCT COMMENTS & RATINGS ============

export async function submitProductReview(
  productId: string,
  userId: string,
  userName: string,
  comment: string,
  rating: number,
  userAvatar?: string
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'product_comments'), {
      product_id: productId,
      user_id: userId,
      user_name: userName,
      user_avatar: userAvatar || null,
      comment,
      rating: Math.min(5, Math.max(1, rating)), // Ensure 1-5
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      helpful_count: 0,
      replies: [],
    });
    return docRef.id;
  } catch (error) {
    console.error('Error submitting review:', error);
    throw error;
  }
}

export async function fetchProductComments(
  productId: string
): Promise<ProductComment[]> {
  try {
    const commentsQuery = query(
      collection(db, 'product_comments'),
      where('product_id', '==', productId)
    );

    const snapshot = await getDocs(commentsQuery);
    const comments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ProductComment[];

    // Sort by creation date (newest first) client-side
    comments.sort((a, b) => {
      const aTime = a.created_at?.toMillis?.() || 0;
      const bTime = b.created_at?.toMillis?.() || 0;
      return bTime - aTime;
    });

    return comments;
  } catch (error) {
    console.error('Error fetching product comments:', error);
    throw error;
  }
}

export async function replyToComment(
  commentId: string,
  userId: string,
  userName: string,
  reply: string,
  userAvatar?: string
): Promise<void> {
  try {
    const commentRef = doc(db, 'product_comments', commentId);
    await updateDoc(commentRef, {
      replies: arrayUnion({
        id: `reply_${Date.now()}`,
        user_id: userId,
        user_name: userName,
        user_avatar: userAvatar || null,
        reply,
        created_at: Timestamp.now(),
      }),
    });
  } catch (error) {
    console.error('Error replying to comment:', error);
    throw error;
  }
}

export async function markCommentHelpful(commentId: string): Promise<void> {
  try {
    const commentRef = doc(db, 'product_comments', commentId);
    await updateDoc(commentRef, {
      helpful_count: arrayUnion(1), // Simplified - normally would track unique users
    });
  } catch (error) {
    console.error('Error marking comment helpful:', error);
    throw error;
  }
}

// ============ SAVED PRODUCTS ============

export async function saveProduct(
  productId: string,
  userId: string
): Promise<void> {
  try {
    // Check if already saved
    const existingQuery = query(
      collection(db, 'saved_products'),
      where('product_id', '==', productId),
      where('user_id', '==', userId)
    );

    const existing = await getDocs(existingQuery);
    if (!existing.empty) {
      return; // Already saved
    }

    await addDoc(collection(db, 'saved_products'), {
      product_id: productId,
      user_id: userId,
      created_at: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error saving product:', error);
    throw error;
  }
}

export async function unsaveProduct(
  productId: string,
  userId: string
): Promise<void> {
  try {
    const savedQuery = query(
      collection(db, 'saved_products'),
      where('product_id', '==', productId),
      where('user_id', '==', userId)
    );

    const snapshot = await getDocs(savedQuery);
    const batch = writeBatch(db);

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  } catch (error) {
    console.error('Error unsaving product:', error);
    throw error;
  }
}

export async function isProductSaved(
  productId: string,
  userId: string
): Promise<boolean> {
  try {
    const savedQuery = query(
      collection(db, 'saved_products'),
      where('product_id', '==', productId),
      where('user_id', '==', userId)
    );

    const snapshot = await getDocs(savedQuery);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking if product saved:', error);
    return false;
  }
}

export async function fetchSavedProducts(userId: string): Promise<string[]> {
  try {
    const savedQuery = query(
      collection(db, 'saved_products'),
      where('user_id', '==', userId),
      orderBy('created_at', 'desc')
    );

    const snapshot = await getDocs(savedQuery);
    return snapshot.docs.map((doc) => doc.data().product_id);
  } catch (error) {
    console.error('Error fetching saved products:', error);
    return [];
  }
}

// ============ LOVED/FAVORITE PRODUCTS ============

export async function loveProduct(
  productId: string,
  userId: string
): Promise<void> {
  try {
    // Check if already loved
    const existingQuery = query(
      collection(db, 'loved_products'),
      where('product_id', '==', productId),
      where('user_id', '==', userId)
    );

    const existing = await getDocs(existingQuery);
    if (!existing.empty) {
      return; // Already loved
    }

    await addDoc(collection(db, 'loved_products'), {
      product_id: productId,
      user_id: userId,
      created_at: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error loving product:', error);
    throw error;
  }
}

export async function unloveProduct(
  productId: string,
  userId: string
): Promise<void> {
  try {
    const lovedQuery = query(
      collection(db, 'loved_products'),
      where('product_id', '==', productId),
      where('user_id', '==', userId)
    );

    const snapshot = await getDocs(lovedQuery);
    const batch = writeBatch(db);

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  } catch (error) {
    console.error('Error unloving product:', error);
    throw error;
  }
}

export async function isProductLoved(
  productId: string,
  userId: string
): Promise<boolean> {
  try {
    const lovedQuery = query(
      collection(db, 'loved_products'),
      where('product_id', '==', productId),
      where('user_id', '==', userId)
    );

    const snapshot = await getDocs(lovedQuery);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking if product loved:', error);
    return false;
  }
}

export async function fetchLovedProducts(userId: string): Promise<string[]> {
  try {
    const lovedQuery = query(
      collection(db, 'loved_products'),
      where('user_id', '==', userId),
      orderBy('created_at', 'desc')
    );

    const snapshot = await getDocs(lovedQuery);
    return snapshot.docs.map((doc) => doc.data().product_id);
  } catch (error) {
    console.error('Error fetching loved products:', error);
    return [];
  }
}

// ============ SELLER INFO & FEEDBACK ============

export async function fetchSellerInfo(sellerId: string): Promise<SellerInfo | null> {
  try {
    const profileRef = doc(db, 'profiles', sellerId);
    const snapshot = await getDoc(profileRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    return {
      id: sellerId,
      name: data.display_name || data.email?.split('@')[0] || 'Unknown',
      email: data.email || '',
      avatar: data.avatar_url || undefined,
      bio: data.bio || undefined,
      seller_status: data.seller_status || 'pending',
      average_rating: data.average_rating || 0,
      total_reviews: data.total_reviews || 0,
      joined_date: data.created_at || Timestamp.now(),
      location: data.location || undefined,
      response_time: data.response_time || undefined,
    };
  } catch (error) {
    console.error('Error fetching seller info:', error);
    return null;
  }
}

export async function fetchSellerReviews(sellerId: string): Promise<ProductComment[]> {
  try {
    const reviewsQuery = query(
      collection(db, 'product_comments'),
      where('seller_id', '==', sellerId),
      orderBy('created_at', 'desc')
    );

    const snapshot = await getDocs(reviewsQuery);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ProductComment[];
  } catch (error) {
    console.error('Error fetching seller reviews:', error);
    return [];
  }
}

// ============ SIMILAR PRODUCTS ============

export interface ProductSummary {
  id: string;
  name: string;
  price: number;
  image: string;
  rating?: number;
  seller_name?: string;
}

export async function getSimilarProducts(
  productId: string,
  category: string,
  limit: number = 6
): Promise<ProductSummary[]> {
  try {
    // Fetch products from same category (no complex filter ordering)
    const similarQuery = query(
      collection(db, 'products'),
      where('category', '==', category)
    );

    const snapshot = await getDocs(similarQuery);
    const products = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Product',
          price: data.price || 0,
          image: data.image || '',
          rating: data.rating || 0,
          seller_name: data.seller_name || 'Seller',
        } as ProductSummary;
      })
      .filter((p) => p.id !== productId) // Exclude current product
      .sort((a, b) => (b.rating || 0) - (a.rating || 0)) // Sort by rating client-side
      .slice(0, limit);

    return products;
  } catch (error) {
    console.error('Error fetching similar products:', error);
    return [];
  }
}

// ============ GLOBAL CHAT ============

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  recipient_id: string;
  recipient_name: string;
  message: string;
  created_at: Timestamp;
  read: boolean;
}

export interface ChatConversation {
  id: string;
  participant_ids: string[];
  last_message: string;
  last_message_at: Timestamp;
  unread_count: number;
}

export async function sendChatMessage(
  senderId: string,
  senderName: string,
  recipientId: string,
  recipientName: string,
  message: string,
  senderAvatar?: string
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'chat_messages'), {
      sender_id: senderId,
      sender_name: senderName,
      sender_avatar: senderAvatar || null,
      recipient_id: recipientId,
      recipient_name: recipientName,
      message,
      created_at: Timestamp.now(),
      read: false,
    });

    return docRef.id;
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
}

export async function fetchChatMessages(
  userId: string,
  otherUserId: string,
  userRole?: string
): Promise<ChatMessage[]> {
  try {
    // For admins viewing conversations they're not involved in (otherUserId contains |)
    // Parse the user IDs if admin is viewing a third-party conversation
    let user1: string, user2: string;

    if (otherUserId.includes('|')) {
      // Admin viewing conversation between two other users
      [user1, user2] = otherUserId.split('|');
    } else {
      // Regular user or admin viewing conversation involving themselves
      user1 = userId;
      user2 = otherUserId;
    }

    // Fetch all messages and filter for the conversation
    const messagesQuery = query(
      collection(db, 'chat_messages')
    );

    const snapshot = await getDocs(messagesQuery);
    const messages = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as ChatMessage))
      .filter((msg) => {
        const isBetweenUsers =
          (msg.sender_id === user1 && msg.recipient_id === user2) ||
          (msg.sender_id === user2 && msg.recipient_id === user1);
        return isBetweenUsers;
      })
      .sort((a, b) => (a.created_at as Timestamp).toMillis() - (b.created_at as Timestamp).toMillis());

    return messages;
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return [];
  }
}

export interface ChatListItem {
  user_id: string;
  user_name: string;
  user_email?: string;
  user_role?: string;
  last_message: string;
  last_message_time: Timestamp;
  unread: boolean;
  avatar?: string;
}

export async function fetchUserChatList(userId: string, userRole?: string): Promise<ChatListItem[]> {
  try {
    // Fetch all conversations
    // Admins can see ALL conversations, non-admins see only received messages
    const messagesQuery = query(collection(db, 'chat_messages'));
    const snapshot = await getDocs(messagesQuery);

    const conversations: { [key: string]: ChatListItem } = {};
    const isAdmin = userRole === 'admin';

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as ChatMessage;
      
      // Determine if this conversation should be visible
      const isForThisUser = data.recipient_id === userId;
      const shouldShow = isAdmin || isForThisUser;
      
      if (shouldShow) {
        // For non-admins: determine other user from sender/recipient
        // For admins: can see conversations between any users, show both participants
        let conversationKey: string;
        let otherUserId: string;
        let otherUserName: string;

        if (isAdmin) {
          // Admin can see this conversation - show it based on all participants
          // Use sender-recipient pair as key to keep them unified
          const key1 = `${data.sender_id}_${data.recipient_id}`;
          const key2 = `${data.recipient_id}_${data.sender_id}`;
          conversationKey = key1 < key2 ? key1 : key2;
          
          // Display the other participant(s) - for simplicity, alternate display
          if (data.sender_id === userId || data.recipient_id === userId) {
            // Admin is involved in this message
            otherUserId = data.sender_id === userId ? data.recipient_id : data.sender_id;
            otherUserName = data.sender_id === userId ? data.recipient_name : data.sender_name;
          } else {
            // Admin is viewing a conversation they're not involved in
            // Show it as a conversation between sender and recipient
            conversationKey = `${data.sender_id}_${data.recipient_id}`;
            otherUserId = `${data.sender_id}|${data.recipient_id}`;
            otherUserName = `${data.sender_name} ↔ ${data.recipient_name}`;
          }
        } else {
          // Regular user: only show as conversation with the sender
          otherUserId = data.sender_id;
          otherUserName = data.sender_name;
          conversationKey = `${data.sender_id}`;
        }

        if (!conversations[conversationKey]) {
          conversations[conversationKey] = {
            user_id: otherUserId,
            user_name: otherUserName,
            last_message: data.message,
            last_message_time: data.created_at,
            unread: !data.read && data.recipient_id === userId,
          };
        } else {
          // Update if this message is newer
          const currentLastTime = conversations[conversationKey].last_message_time;
          if (data.created_at.toMillis() > currentLastTime.toMillis()) {
            conversations[conversationKey].last_message = data.message;
            conversations[conversationKey].last_message_time = data.created_at;
            conversations[conversationKey].unread = !data.read && data.recipient_id === userId;
          }
        }
      }
    });

    return Object.values(conversations)
      .sort((a, b) => b.last_message_time.toMillis() - a.last_message_time.toMillis());
  } catch (error) {
    console.error('Error fetching chat list:', error);
    return [];
  }
}

export async function markChatMessagesAsRead(
  senderId: string,
  recipientId: string,
  currentUserId?: string,
  userRole?: string
): Promise<void> {
  try {
    // Only mark messages as read if the current user is the intended recipient
    // Admins viewing conversations not meant for them won't mark as read
    const isRecipient = currentUserId === recipientId;
    if (!isRecipient) {
      // Admin or other user viewing a conversation not for them - don't mark as read
      return;
    }

    const messagesQuery = query(
      collection(db, 'chat_messages'),
      where('sender_id', '==', senderId),
      where('recipient_id', '==', recipientId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(messagesQuery);
    const batch = writeBatch(db);

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
}

// ============ CLAIMS MESSAGING SYSTEM (Real-time like messenger) ============

export interface ClaimMessage {
  id: string;
  claim_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  created_at: Timestamp;
  read: boolean;
  deleted?: boolean;
  edited?: boolean;
  edited_at?: Timestamp;
  deleted_at?: Timestamp;
  forwarded_from?: string;
}

export interface ClaimThread {
  id: string;
  title: string;
  description: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  claim_id?: string;
  department: string;
  claim_type: string;
  status: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  last_message?: string;
  last_message_at?: Timestamp;
  unread_count?: number;
}

// Send initial claim
export async function submitClaimWithMessage(
  userId: string,
  userName: string,
  title: string,
  description: string,
  claimType: string,
  directedTo: string, // 'editor' | 'content_manager' | 'admin', etc. - NOT configurable for customers
  senderRole: string = 'customer'
): Promise<string> {
  try {
    // ACCESS CONTROL: Enforce who can direct claims to whom
    if (senderRole === 'customer' || senderRole === 'seller') {
      // Customers/sellers can only direct to editors or content managers
      if (!['editor', 'content_manager'].includes(directedTo)) {
        throw new Error('Your role can only create claims directed to editors or content managers');
      }
    }
    // Editors and content managers can direct to any role (except they can't direct to themselves meaningfully)
    // Admins can create claims for any purpose (internal use)

    const claimsRef = collection(db, 'claims');
    const claimDocRef = await addDoc(claimsRef, {
      title,
      description,
      claim_type: claimType,
      department: directedTo, // Renamed from 'department' to be clearer - this is who it's directed to
      directed_to: directedTo, // Explicit field for clarity
      sender_id: userId,
      sender_name: userName,
      sender_role: senderRole,
      status: 'open',
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      last_message: description,
      last_message_at: Timestamp.now(),
      claim_id: '', // Will be updated after doc is created
    });

    // Set the claim_id to a human-readable format: CLAIM-{first-6-chars-of-docid}
    const readableClaimId = `CLAIM-${claimDocRef.id.substring(0, 6).toUpperCase()}`;
    await updateDoc(claimDocRef, {
      claim_id: readableClaimId,
    });

    // Create initial message in subcollection
    const messagesRef = collection(claimDocRef, 'messages');
    await addDoc(messagesRef, {
      sender_id: userId,
      sender_name: userName,
      sender_role: senderRole,
      message: description,
      created_at: Timestamp.now(),
      read: false,
      edited: false,
      forwarded_from: null,
    });

    return claimDocRef.id;
  } catch (error) {
    console.error('Error submitting claim:', error);
    throw error;
  }
}

// Add reply to claim (for customers)
export async function addClaimReply(
  claimId: string,
  userId: string,
  userName: string,
  userRole: string,
  message: string
): Promise<string> {
  try {
    const claimRef = doc(db, 'claims', claimId);
    const messagesRef = collection(claimRef, 'messages');

    const messageDocRef = await addDoc(messagesRef, {
      sender_id: userId,
      sender_name: userName,
      sender_role: userRole,
      message,
      created_at: Timestamp.now(),
      read: false,
    });

    // Update claim's last message info
    await updateDoc(claimRef, {
      last_message: message,
      last_message_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    });

    return messageDocRef.id;
  } catch (error) {
    console.error('Error adding claim reply:', error);
    throw error;
  }
}

// Fetch all claim threads for customer (both sent by user and assigned to user's department/role)
export async function fetchCustomerClaims(userId: string, userRole?: string, userDepartment?: string): Promise<ClaimThread[]> {
  try {
    // Get all claims (we'll filter client-side for better flexibility)
    const claimsSnapshot = await getDocs(collection(db, 'claims'));
    
    const userClaims = claimsSnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((claim: ClaimThread & { department?: string }) => {
        // Admins can see all claims
        if (userRole === 'admin') {
          return true;
        }

        // Always show claims created by this user
        if (claim.sender_id === userId) {
          return true;
        }

        // Show claims meant for this user's role/department
        // Claims can be addressed to: 'admin', 'seller', 'editor', 'content_manager', 'general', etc.
        if (userRole) {
          // Show if department matches user's role
          if (claim.department === userRole) {
            return true;
          }
          // Show if department is 'general' or 'admin' (meant for all)
          if (claim.department === 'general' || claim.department === 'admin') {
            return true;
          }
        }

        return false;
      })
      .sort((a: ClaimThread & { department?: string }, b: ClaimThread & { department?: string }) => {
        const timeA = a.updated_at?.toMillis?.() || 0;
        const timeB = b.updated_at?.toMillis?.() || 0;
        return timeB - timeA;
      }) as ClaimThread[];

    return userClaims;
  } catch (error) {
    console.error('Error fetching customer claims:', error);
    return [];
  }
}

// Fetch messages for a specific claim
export async function fetchClaimMessages(claimId: string): Promise<ClaimMessage[]> {
  try {
    const claimRef = doc(db, 'claims', claimId);
    const messagesRef = collection(claimRef, 'messages');
    const q = query(messagesRef, orderBy('created_at', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      claim_id: claimId,
      ...doc.data(),
    })) as ClaimMessage[];
  } catch (error) {
    console.error('Error fetching claim messages:', error);
    return [];
  }
}

// Mark claim messages as read
export async function markClaimMessagesAsRead(claimId: string): Promise<void> {
  try {
    const claimRef = doc(db, 'claims', claimId);
    const messagesRef = collection(claimRef, 'messages');
    const q = query(messagesRef, where('read', '==', false));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error marking claim messages as read:', error);
    throw error;
  }
}

// Edit a claim message
export async function editClaimMessage(
  claimId: string,
  messageId: string,
  newMessage: string
): Promise<void> {
  try {
    const claimRef = doc(db, 'claims', claimId);
    const messageRef = doc(collection(claimRef, 'messages'), messageId);
    await updateDoc(messageRef, {
      message: newMessage,
      edited: true,
      edited_at: Timestamp.now(),
    });

    // Update claim's updated_at timestamp
    await updateDoc(claimRef, {
      updated_at: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error editing claim message:', error);
    throw error;
  }
}

// Delete a single claim message (soft delete - move to trash)
export async function deleteClaimMessage(
  claimId: string,
  messageId: string,
  userId: string,
  userRole: string
): Promise<void> {
  try {
    const claimRef = doc(db, 'claims', claimId);
    const messageRef = doc(collection(claimRef, 'messages'), messageId);
    
    // Get the message to check ownership
    const messageDoc = await getDoc(messageRef);
    const messageData = messageDoc.data();

    // Only message sender or admins can delete
    if (messageData?.sender_id !== userId && userRole !== 'admin') {
      throw new Error('You can only delete your own messages');
    }

    // For non-admins: just mark as deleted
    // For admins: move to trash instead
    if (userRole === 'admin') {
      // Move to trash
      const trashRef = collection(db, 'trash_bin');
      await addDoc(trashRef, {
        type: 'claim_message',
        claim_id: claimId,
        message_id: messageId,
        original_data: messageData,
        deleted_by: userId,
        deleted_at: Timestamp.now(),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      });
    }

    // Mark as deleted
    await updateDoc(messageRef, {
      deleted: true,
      deleted_at: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error deleting claim message:', error);
    throw error;
  }
}

// Forward a claim message to another role/user
export async function forwardClaimMessage(
  claimId: string,
  originalClaim: Record<string, unknown> & ClaimThread,
  userId: string,
  userName: string,
  userRole: string,
  forwardToRole: string // 'editor' | 'content_manager' | 'admin', etc.
): Promise<string> {
  try {
    // Create a new claim that references the original
    const claimsRef = collection(db, 'claims');
    const forwardedClaimRef = await addDoc(claimsRef, {
      title: `[FORWARDED] ${originalClaim.title}`,
      description: `Forwarded from: ${originalClaim.sender_name} (${originalClaim.sender_role})\n\nOriginal claim: ${originalClaim.claim_id}\n\n${originalClaim.description}`,
      claim_type: originalClaim.claim_type,
      directed_to: forwardToRole,
      department: forwardToRole,
      forwarded_from_claim_id: claimId,
      forwarded_by_id: userId,
      forwarded_by_name: userName,
      forwarded_by_role: userRole,
      sender_id: userId,
      sender_name: userName,
      sender_role: userRole,
      status: 'open',
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      last_message: `Forwarded by ${userName}`,
      last_message_at: Timestamp.now(),
      claim_id: '',
    });

    // Set readable claim ID
    const readableClaimId = `CLAIM-${forwardedClaimRef.id.substring(0, 6).toUpperCase()}`;
    await updateDoc(forwardedClaimRef, {
      claim_id: readableClaimId,
    });

    // Create initial forwarding message
    const messagesRef = collection(forwardedClaimRef, 'messages');
    await addDoc(messagesRef, {
      sender_id: userId,
      sender_name: userName,
      sender_role: userRole,
      message: `This claim has been forwarded from ${originalClaim.sender_name} (${originalClaim.sender_role}).\n\nOriginal claim ID: ${originalClaim.claim_id}`,
      created_at: Timestamp.now(),
      read: false,
      forwarded_from: claimId,
    });

    return forwardedClaimRef.id;
  } catch (error) {
    console.error('Error forwarding claim message:', error);
    throw error;
  }
}
// Search claims by ID
export async function searchClaimById(claimId: string, userRole?: string, userId?: string): Promise<(Record<string, unknown> & Partial<ClaimThread>) | null> {
  try {
    const claimsRef = collection(db, 'claims');
    // Search by both readable claim_id and document ID
    const q = query(claimsRef);
    const snapshot = await getDocs(q);
    
    const results = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((claim: Record<string, unknown>) => {
        // Match readable claim ID or document ID
        const matches = claim.claim_id === claimId || claim.id === claimId;
        if (!matches) return false;

        // Apply visibility rules
        if (userRole === 'admin') return true;
        if (claim.sender_id === userId) return true;
        if (claim.directed_to === userRole) return true;
        
        return false;
      });

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Error searching claim by ID:', error);
    return null;
  }
}

export async function deleteChatsWithUser(
  userId: string,
  otherUserId: string
): Promise<void> {
  try {
    const messagesQuery = query(collection(db, 'chat_messages'));
    const snapshot = await getDocs(messagesQuery);
    const batch = writeBatch(db);

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const isBetweenUsers =
        (data.sender_id === userId && data.recipient_id === otherUserId) ||
        (data.sender_id === otherUserId && data.recipient_id === userId);

      if (isBetweenUsers) {
        batch.delete(doc.ref);
      }
    });

    await batch.commit();
  } catch (error) {
    console.error('Error deleting chat conversation:', error);
    throw error;
  }
}
// Search users for chat (non-admin users can't see admins)
export async function searchUsers(
  searchQuery: string,
  isAdmin: boolean = false
): Promise<Array<{ id: string; name: string; email: string; role: string; avatar?: string }>> {
  try {
    const profilesRef = collection(db, 'profiles');
    const snapshot = await getDocs(profilesRef);
    
    const results = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        name: doc.data().full_name || 'Unknown',
        email: doc.data().email || '',
        role: doc.data().role || 'customer',
        avatar: doc.data().avatar_url,
      }))
      .filter((user) => {
        // Don't show self
        // Filter by search query (name or email)
        const matchesQuery =
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesQuery) return false;

        // Non-admin users can't see admins
        if (!isAdmin && user.role === 'admin') {
          return false;
        }

        return true;
      });

    return results;
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
}

// ============ NOTIFICATIONS SYSTEM (Content Manager) ============

export interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'notification' | 'announcement'; // notification or announcement
  created_by: string;
  creator_name: string;
  creator_role: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  is_published: boolean;
  read_by?: string[]; // Array of user IDs who have read this
}

export async function createNotification(
  title: string,
  content: string,
  type: 'notification' | 'announcement',
  createdBy: string,
  creatorName: string,
  creatorRole: string,
  isPublished: boolean = false
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'notifications'), {
      title,
      content,
      type,
      created_by: createdBy,
      creator_name: creatorName,
      creator_role: creatorRole,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      is_published: isPublished,
      read_by: [], // Start with empty read list
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

export async function fetchNotifications(userRole?: string, typeFilter?: 'notification' | 'announcement'): Promise<Notification[]> {
  try {
    const q = query(collection(db, 'notifications'), orderBy('updated_at', 'desc'));
    const snapshot = await getDocs(q);
    let results = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Notification[];

    // Filter by type if specified
    if (typeFilter) {
      results = results.filter((n) => n.type === typeFilter);
    }

    return results;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const q = query(collection(db, 'notifications'), where('is_published', '==', true));
    const snapshot = await getDocs(q);
    
    // Count notifications not in read_by array
    const unreadCount = snapshot.docs.filter((doc) => {
      const readBy = doc.data().read_by || [];
      return !readBy.includes(userId);
    }).length;
    
    return unreadCount;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
}

export async function markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    const notifDoc = await getDoc(notifRef);
    
    if (notifDoc.exists()) {
      const readBy = notifDoc.data().read_by || [];
      if (!readBy.includes(userId)) {
        readBy.push(userId);
        await updateDoc(notifRef, { read_by: readBy });
      }
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

export async function updateNotification(
  notificationId: string,
  updates: { title?: string; content?: string; is_published?: boolean }
): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      ...updates,
      updated_at: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    throw error;
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

// Get full user profile by user ID
export async function getUserProfileFull(userId: string): Promise<any> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return null;
    }
    return {
      id: userId,
      ...userDoc.data(),
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

// Forward a chat message to another user
export async function forwardChatMessage(
  originalMessageId: string,
  senderId: string,
  senderName: string,
  recipientId: string,
  recipientName: string,
  message: string
): Promise<string> {
  try {
    // Create a forwarded message
    const docRef = await addDoc(collection(db, 'chat_messages'), {
      sender_id: senderId,
      sender_name: senderName,
      recipient_id: recipientId,
      recipient_name: recipientName,
      message: `[FORWARDED]\n${message}`,
      created_at: Timestamp.now(),
      read: false,
      forwarded_from_message_id: originalMessageId,
    });

    return docRef.id;
  } catch (error) {
    console.error('Error forwarding chat message:', error);
    throw error;
  }
}