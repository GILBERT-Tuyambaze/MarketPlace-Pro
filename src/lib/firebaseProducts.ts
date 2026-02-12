import { db } from './firebaseClient';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  limit,
  startAfter,
  QueryConstraint,
  Timestamp,
} from 'firebase/firestore';

export interface FirebaseProduct {
  id: string;
  name: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image: string;
  images?: string[];
  seller_id: string;
  seller_name: string;
  rating: number;
  reviews_count: number;
  status?: string;
  created_at?: Timestamp;
}

// Fetch all products with optional filters
export const fetchProducts = async (
  searchQuery?: string,
  category?: string,
  sortBy: string = 'created_at',
  limitCount: number = 100
): Promise<FirebaseProduct[]> => {
  try {
    // Start with approved products only (no composite index needed)
    const constraints: QueryConstraint[] = [
      where('status', '==', 'approved'),
      limit(limitCount),
    ];

    const q = query(collection(db, 'products'), ...constraints);
    const snapshot = await getDocs(q);
    
    const products: FirebaseProduct[] = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Apply search filter if provided
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const nameMatches = (data.name || data.title || '').toLowerCase().includes(searchLower);
        const descMatches = (data.description || '').toLowerCase().includes(searchLower);
        if (!nameMatches && !descMatches) continue;
      }

      // Apply category filter if provided
      if (category && data.category !== category) {
        continue;
      }

      products.push({
        id: doc.id,
        name: data.name || data.title || '',
        title: data.title || data.name || '',
        description: data.description || '',
        price: data.price || 0,
        stock: data.stock || 0,
        category: data.category || '',
        image: data.image || data.images?.[0] || '',
        images: data.images || [data.image] || [],
        seller_id: data.seller_id || '',
        seller_name: data.seller_name || 'Unknown Seller',
        rating: data.rating || 0,
        reviews_count: data.reviews_count || 0,
        status: data.status || 'approved',
        created_at: data.created_at,
      });
    }

    // Sort client-side to avoid composite index requirement
    if (sortBy === 'price_asc') {
      products.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      products.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'created_at') {
      products.sort((a, b) => {
        const aTime = a.created_at?.toMillis() || 0;
        const bTime = b.created_at?.toMillis() || 0;
        return bTime - aTime; // newest first
      });
    }

    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

// Fetch product by ID
export const fetchProductById = async (productId: string): Promise<FirebaseProduct | null> => {
  try {
    const docRef = doc(db, 'products', productId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    return {
      id: snapshot.id,
      name: data.name || data.title || '',
      title: data.title || data.name || '',
      description: data.description || '',
      price: data.price || 0,
      stock: data.stock || 0,
      category: data.category || '',
      image: data.image || data.images?.[0] || '',
      images: data.images || [data.image] || [],
      seller_id: data.seller_id || '',
      seller_name: data.seller_name || 'Unknown Seller',
      rating: data.rating || 0,
      reviews_count: data.reviews_count || 0,
      status: data.status || 'approved',
      created_at: data.created_at,
    };
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    return null;
  }
};

// Get available categories
export const getProductCategories = async (): Promise<string[]> => {
  try {
    const q = query(collection(db, 'products'), where('status', '==', 'approved'));
    const snapshot = await getDocs(q);
    
    const categories = new Set<string>();
    snapshot.docs.forEach(doc => {
      const category = doc.data().category;
      if (category) categories.add(category);
    });

    return Array.from(categories).sort();
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

// Search products
export const searchProducts = async (
  searchQuery?: string,
  category?: string
): Promise<FirebaseProduct[]> => {
  return fetchProducts(searchQuery, category);
};
