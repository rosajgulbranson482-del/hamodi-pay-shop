import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  stockCount?: number | null;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: { id: string; name: string; price: number; image: string }) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(false);
  const [hasSyncedFromDb, setHasSyncedFromDb] = useState(false);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  // Load cart from database when user logs in
  useEffect(() => {
    if (isAuthenticated && user && !hasSyncedFromDb) {
      loadCartFromDatabase();
    }
  }, [isAuthenticated, user, hasSyncedFromDb]);

  // Reset sync flag when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setHasSyncedFromDb(false);
    }
  }, [isAuthenticated]);

  const loadCartFromDatabase = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get cart items from database with product details
      const { data: cartItems, error } = await supabase
        .from('cart_items')
        .select(`
          product_id,
          quantity,
          products (
            id,
            name,
            price,
            image,
            stock_count
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      if (cartItems && cartItems.length > 0) {
        // Merge database cart with local cart
        const dbItems: CartItem[] = cartItems
          .filter(item => item.products)
          .map(item => ({
            id: item.products.id,
            name: item.products.name,
            price: item.products.price,
            image: item.products.image || '',
            quantity: item.quantity,
            stockCount: item.products.stock_count,
          }));

        // Get current local items
        const localItems = items;
        
        // Merge: prioritize local items (newer), add db items if not in local
        const mergedItems = [...localItems];
        
        for (const dbItem of dbItems) {
          const existsInLocal = localItems.find(l => l.id === dbItem.id);
          if (!existsInLocal) {
            mergedItems.push(dbItem);
          }
        }

        setItems(mergedItems);
        
        // Sync merged cart back to database
        await syncCartToDatabase(mergedItems);
      } else if (items.length > 0) {
        // No items in DB, but has local items - sync local to DB
        await syncCartToDatabase(items);
      }
      
      setHasSyncedFromDb(true);
    } catch (error) {
      console.error('Error loading cart from database:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncCartToDatabase = async (cartItems: CartItem[]) => {
    if (!user) return;

    try {
      // Clear existing cart items for user
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      // Insert new cart items
      if (cartItems.length > 0) {
        const itemsToInsert = cartItems.map(item => ({
          user_id: user.id,
          product_id: item.id,
          quantity: item.quantity,
        }));

        await supabase
          .from('cart_items')
          .insert(itemsToInsert);
      }
    } catch (error) {
      console.error('Error syncing cart to database:', error);
    }
  };

  const saveItemToDatabase = async (productId: string, quantity: number) => {
    if (!user) return;

    try {
      await supabase
        .from('cart_items')
        .upsert({
          user_id: user.id,
          product_id: productId,
          quantity: quantity,
        }, {
          onConflict: 'user_id,product_id',
        });
    } catch (error) {
      console.error('Error saving cart item:', error);
    }
  };

  const removeItemFromDatabase = async (productId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);
    } catch (error) {
      console.error('Error removing cart item:', error);
    }
  };

  const clearCartFromDatabase = async () => {
    if (!user) return;

    try {
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const addToCart = useCallback((product: { id: string; name: string; price: number; image: string; stockCount?: number | null }) => {
    setItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      let newItems: CartItem[];
      
      if (existing) {
        // Check stock before increasing quantity
        const newQuantity = existing.quantity + 1;
        if (product.stockCount !== null && product.stockCount !== undefined && newQuantity > product.stockCount) {
          return prev; // Don't exceed stock
        }
        
        newItems = prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: newQuantity, stockCount: product.stockCount }
            : item
        );
        // Save to database
        if (user) {
          saveItemToDatabase(product.id, newQuantity);
        }
      } else {
        newItems = [...prev, { ...product, quantity: 1, stockCount: product.stockCount }];
        // Save to database
        if (user) {
          saveItemToDatabase(product.id, 1);
        }
      }
      
      return newItems;
    });
  }, [user]);

  const removeFromCart = useCallback((productId: string) => {
    setItems(prev => prev.filter(item => item.id !== productId));
    if (user) {
      removeItemFromDatabase(productId);
    }
  }, [user]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }
    
    setItems(prev => {
      const item = prev.find(i => i.id === productId);
      // Check stock before increasing quantity
      if (item && item.stockCount !== null && item.stockCount !== undefined && quantity > item.stockCount) {
        return prev; // Don't exceed stock
      }
      
      return prev.map(i =>
        i.id === productId ? { ...i, quantity } : i
      );
    });
    
    // Only save if within stock limits
    setItems(prev => {
      const item = prev.find(i => i.id === productId);
      if (item && user) {
        saveItemToDatabase(productId, item.quantity);
      }
      return prev;
    });
  }, [user, removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
    if (user) {
      clearCartFromDatabase();
    }
  }, [user]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        loading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
