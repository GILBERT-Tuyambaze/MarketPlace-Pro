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
  otherUserId: string
): Promise<ChatMessage[]> {
  try {
    // Fetch messages where user is sender or recipient
    const constraints: QueryConstraint[] = [
      orderBy('created_at', 'asc'),
    ];

    // Build a query that gets messages between two users
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
          (msg.sender_id === userId && msg.recipient_id === otherUserId) ||
          (msg.sender_id === otherUserId && msg.recipient_id === userId);
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
  last_message: string;
  last_message_at: Timestamp;
  unread: boolean;
}

export async function fetchUserChatList(userId: string): Promise<ChatListItem[]> {
  try {
    // Fetch all conversations for user
    const messagesQuery = query(collection(db, 'chat_messages'));
    const snapshot = await getDocs(messagesQuery);

    const conversations: { [key: string]: ChatListItem } = {};

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as ChatMessage;
      const otherUserId =
        data.sender_id === userId ? data.recipient_id : data.sender_id;
      const otherUserName =
        data.sender_id === userId ? data.recipient_name : data.sender_name;

      if (!conversations[otherUserId]) {
        conversations[otherUserId] = {
          user_id: otherUserId,
          user_name: otherUserName,
          last_message: data.message,
          last_message_at: data.created_at,
          unread: !data.read && data.recipient_id === userId,
        };
      } else {
        // Update if this message is newer
        const currentLastTime = conversations[otherUserId].last_message_at;
        if (data.created_at.toMillis() > currentLastTime.toMillis()) {
          conversations[otherUserId].last_message = data.message;
          conversations[otherUserId].last_message_at = data.created_at;
        }
      }
    });

    return Object.values(conversations)
      .sort((a, b) => b.last_message_at.toMillis() - a.last_message_at.toMillis());
  } catch (error) {
    console.error('Error fetching chat list:', error);
    return [];
  }
}

export async function markChatMessagesAsRead(
  senderId: string,
  recipientId: string
): Promise<void> {
  try {
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
}

export interface ClaimThread {
  id: string;
  title: string;
  description: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
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
  department: string
): Promise<string> {
  try {
    const claimsRef = collection(db, 'claims');
    const claimDocRef = await addDoc(claimsRef, {
      title,
      description,
      claim_type: claimType,
      department,
      sender_id: userId,
      sender_name: userName,
      sender_role: 'customer',
      status: 'open',
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
      last_message: description,
      last_message_at: Timestamp.now(),
    });

    // Create initial message in subcollection
    const messagesRef = collection(claimDocRef, 'messages');
    await addDoc(messagesRef, {
      sender_id: userId,
      sender_name: userName,
      sender_role: 'customer',
      message: description,
      created_at: Timestamp.now(),
      read: false,
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

// Fetch all claim threads for customer
export async function fetchCustomerClaims(userId: string): Promise<ClaimThread[]> {
  try {
    const q = query(
      collection(db, 'claims'),
      where('sender_id', '==', userId),
      orderBy('updated_at', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ClaimThread[];
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