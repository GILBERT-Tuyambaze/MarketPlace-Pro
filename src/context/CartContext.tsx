import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { db as firebaseDb } from '@/lib/firebaseClient';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    title: string;
    price: number;
      images?: string[];
      seller_id?: string;
    stock: number;
  };
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  isInCart: (productId: string) => boolean;
  getCartItemQuantity: (productId: string) => number;
  getTotalPrice: () => number;
  getTotalItems: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    let unsubscribe: (() => void) | undefined;

    if (user) {
      const setupListener = async () => {
        try {
          unsubscribe = await fetchCartItems();
        } catch (error) {
          console.error('Error setting up cart listener:', error);
        } finally {
          setLoading(false);
        }
      };
      setupListener();
    } else {
      setItems([]);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const fetchCartItems = async () => {
    if (!user) return;

    try {
      // Set up real-time listener for cart items
      const cartQuery = query(
        collection(firebaseDb, 'users', user.uid, 'cart')
      );

      const unsubscribe = onSnapshot(cartQuery, async (snapshot) => {
        const items: CartItem[] = [];
        
        for (const cartDoc of snapshot.docs) {
          const cartItemData = cartDoc.data();
          
          // Fetch product data from Firebase instead of mock
          try {
            const productRef = doc(firebaseDb, 'products', cartItemData.product_id);
            const productSnap = await getDoc(productRef);
            
            if (productSnap.exists()) {
              const firebaseProduct = productSnap.data();
              items.push({
                id: cartDoc.id,
                product_id: cartItemData.product_id,
                quantity: cartItemData.quantity,
                product: {
                  id: productSnap.id,
                  title: firebaseProduct.title || firebaseProduct.name || 'Untitled',
                  price: firebaseProduct.price || 0,
                  images: firebaseProduct.images || [firebaseProduct.image] || [],
                  seller_id: firebaseProduct.seller_id || firebaseProduct.sellerId || '',
                  stock: firebaseProduct.stock || 0,
                },
              });
            }
          } catch (error) {
            console.error(`Error fetching product ${cartItemData.product_id}:`, error);
          }
        }
        
        setItems(items);
      }, (error) => {
        console.error('Error fetching cart items:', error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up cart listener:', error);
    }
  };

  const addToCart = async (productId: string, quantity = 1) => {
    if (!user) throw new Error('Must be logged in to add to cart');

    try {
      // Check if item already exists in cart
      const existingItem = items.find(item => item.product_id === productId);

      if (existingItem) {
        await updateQuantity(productId, existingItem.quantity + quantity);
      } else {
        // Add new item to cart collection
        await addDoc(collection(firebaseDb, 'users', user.uid, 'cart'), {
          product_id: productId,
          quantity,
          status: 'active',
          created_at: Timestamp.now(),
          updated_at: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (!user) throw new Error('Must be logged in to update cart');

    try {
      if (quantity <= 0) {
        await removeFromCart(productId);
        return;
      }

      const cartItem = items.find(item => item.product_id === productId);
      if (cartItem) {
        const cartItemRef = doc(firebaseDb, 'users', user.uid, 'cart', cartItem.id);
        await updateDoc(cartItemRef, {
          quantity,
          updated_at: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error('Error updating cart quantity:', error);
      throw error;
    }
  };

  const removeFromCart = async (productId: string) => {
    if (!user) throw new Error('Must be logged in to remove from cart');

    try {
      const cartItem = items.find(item => item.product_id === productId);
      if (cartItem) {
        const cartItemRef = doc(firebaseDb, 'users', user.uid, 'cart', cartItem.id);
        await deleteDoc(cartItemRef);
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  };

  const clearCart = async () => {
    if (!user) throw new Error('Must be logged in to clear cart');

    try {
      for (const item of items) {
        const cartItemRef = doc(firebaseDb, 'users', user.uid, 'cart', item.id);
        await deleteDoc(cartItemRef);
      }
      setItems([]);
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const isInCart = (productId: string): boolean => {
    return items.some(item => item.product_id === productId);
  };

  const getCartItemQuantity = (productId: string): number => {
    const item = items.find(cartItem => cartItem.product_id === productId);
    return item ? item.quantity : 0;
  };

  const value = {
    items,
    loading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    isInCart,
    getCartItemQuantity,
    getTotalPrice,
    getTotalItems,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};