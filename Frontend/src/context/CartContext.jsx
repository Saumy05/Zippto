import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { cartService } from '../services/cartService';

/**
 * Cart Context
 * Provides global cart state management with guest cart persistence and event-driven updates.
 * - Guests can freely browse and add items to cart (stored in localStorage)
 * - Upon user login, pending guest items are automatically merged into backend cart
 */

const GUEST_CART_KEY = 'zippto_guest_cart';

const getGuestCart = () => {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveGuestCart = (items) => {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save guest cart:', e);
  }
};

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch cart (Handles both Guest Cart from localStorage and User Cart from API + Auto-Merge)
  const fetchCart = useCallback(async () => {
    try {
      // Prevention: Do not fetch user cart if we are in vendor or admin apps
      const path = window.location.pathname;
      if (path.startsWith('/vendor') || path.startsWith('/admin')) {
        return;
      }

      const token = localStorage.getItem('accessToken');

      // 1. Guest Mode: Load cart from localStorage
      if (!token) {
        const guestItems = getGuestCart();
        setCartItems(guestItems);
        setCartCount(guestItems.length);
        setIsInitialized(true);
        return;
      }

      // 2. Authenticated Mode: Auto-merge pending guest items if any, then fetch from API
      setIsLoading(true);

      const guestItems = getGuestCart();
      if (guestItems && guestItems.length > 0) {
        try {
          for (const item of guestItems) {
            await cartService.addToCart({
              serviceId: item.serviceId && item.serviceId.length === 24 ? item.serviceId : null,
              title: item.title,
              category: item.category || 'Home Services',
              price: item.price,
              unitPrice: item.unitPrice || item.price,
              serviceCount: item.serviceCount || 1,
              icon: item.icon || item.image || '',
              description: item.description || ''
            });
          }
          localStorage.removeItem(GUEST_CART_KEY);
        } catch (mergeErr) {
          console.warn('Guest cart merge note:', mergeErr);
        }
      }

      const response = await cartService.getCart();
      if (response.success) {
        const items = response.data || [];
        setCartItems(items);
        setCartCount(items.length);
      }
    } catch (error) {
      // Silently handle auth errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        const guestItems = getGuestCart();
        setCartItems(guestItems);
        setCartCount(guestItems.length);
      }
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, []);

  // Initialize cart on mount and listen for login/sync events
  useEffect(() => {
    fetchCart();

    const handleUserLoggedIn = () => {
      fetchCart();
    };

    window.addEventListener('userLoggedIn', handleUserLoggedIn);
    window.addEventListener('storage', handleUserLoggedIn);

    return () => {
      window.removeEventListener('userLoggedIn', handleUserLoggedIn);
      window.removeEventListener('storage', handleUserLoggedIn);
    };
  }, [fetchCart]);

  // Add item to cart - handles both guest mode & authenticated mode
  const addToCart = useCallback(async (itemData) => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      // Guest Mode
      const currentGuestItems = getGuestCart();
      const existingIndex = currentGuestItems.findIndex(
        ci => (ci.serviceId && ci.serviceId === itemData.serviceId) || ci.title === itemData.title
      );

      let updatedGuestItems;
      const unitPrice = parseFloat(itemData.unitPrice || itemData.price) || 99;

      if (existingIndex > -1) {
        const existing = currentGuestItems[existingIndex];
        const newCount = (existing.serviceCount || 1) + (itemData.serviceCount || 1);
        updatedGuestItems = [...currentGuestItems];
        updatedGuestItems[existingIndex] = {
          ...existing,
          serviceCount: newCount,
          price: unitPrice * newCount
        };
      } else {
        const guestId = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newItem = {
          ...itemData,
          _id: guestId,
          id: guestId,
          serviceCount: itemData.serviceCount || 1,
          unitPrice: unitPrice,
          price: unitPrice * (itemData.serviceCount || 1)
        };
        updatedGuestItems = [...currentGuestItems, newItem];
      }

      saveGuestCart(updatedGuestItems);
      setCartItems(updatedGuestItems);
      setCartCount(updatedGuestItems.length);
      return { success: true, data: updatedGuestItems };
    }

    // Authenticated Mode (Optimistic update + API)
    const tempId = `temp-${Date.now()}`;
    const tempItem = { ...itemData, _id: tempId, id: tempId };

    setCartItems(prev => [...prev, tempItem]);
    setCartCount(prev => prev + 1);

    try {
      const response = await cartService.addToCart(itemData);

      if (response.success && response.data) {
        setCartItems(prev => prev.map(item =>
          item._id === tempId ? { ...item, ...response.data } : item
        ));
      } else {
        setCartItems(prev => prev.filter(item => item._id !== tempId));
        setCartCount(prev => Math.max(0, prev - 1));
      }
      return response;
    } catch (error) {
      setCartItems(prev => prev.filter(item => item._id !== tempId));
      setCartCount(prev => Math.max(0, prev - 1));
      throw error;
    }
  }, []);

  // Update item quantity
  const updateItem = useCallback(async (itemId, serviceCount) => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      // Guest Mode
      const currentGuestItems = getGuestCart();
      const updatedGuestItems = currentGuestItems.map(item => {
        if (item._id === itemId || item.id === itemId) {
          const unitPrice = item.unitPrice || (item.serviceCount ? item.price / item.serviceCount : item.price);
          return {
            ...item,
            serviceCount,
            price: unitPrice * serviceCount
          };
        }
        return item;
      });

      saveGuestCart(updatedGuestItems);
      setCartItems(updatedGuestItems);
      return { success: true };
    }

    // Authenticated Mode
    setCartItems(prev =>
      prev.map(item => {
        if (item._id === itemId || item.id === itemId) {
          const unitPrice = item.unitPrice || (item.serviceCount ? item.price / item.serviceCount : item.price);
          return {
            ...item,
            serviceCount,
            price: unitPrice * serviceCount
          };
        }
        return item;
      })
    );

    try {
      const response = await cartService.updateItem(itemId, serviceCount);
      if (response.success && response.data) {
        setCartItems(prev =>
          prev.map(item => item._id === itemId ? response.data : item)
        );
      } else {
        fetchCart();
      }
      return response;
    } catch (error) {
      fetchCart();
      throw error;
    }
  }, [fetchCart]);

  // Remove item from cart
  const removeItem = useCallback(async (itemId) => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      // Guest Mode
      const currentGuestItems = getGuestCart();
      const updatedGuestItems = currentGuestItems.filter(item => item._id !== itemId && item.id !== itemId);
      saveGuestCart(updatedGuestItems);
      setCartItems(updatedGuestItems);
      setCartCount(updatedGuestItems.length);
      return { success: true };
    }

    // Authenticated Mode
    setCartItems(prev => prev.filter(item => item._id !== itemId && item.id !== itemId));
    setCartCount(prev => Math.max(0, prev - 1));

    try {
      const response = await cartService.removeItem(itemId);
      if (!response.success) {
        fetchCart();
      }
      return response;
    } catch (error) {
      fetchCart();
      throw error;
    }
  }, [fetchCart]);

  // Remove all items from a category
  const removeCategoryItems = useCallback(async (category) => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      // Guest Mode
      const currentGuestItems = getGuestCart();
      const updatedGuestItems = currentGuestItems.filter(item => item.category !== category);
      saveGuestCart(updatedGuestItems);
      setCartItems(updatedGuestItems);
      setCartCount(updatedGuestItems.length);
      return { success: true };
    }

    // Authenticated Mode
    setCartItems(prev => {
      const filtered = prev.filter(item => item.category !== category);
      setCartCount(filtered.length);
      return filtered;
    });

    try {
      const response = await cartService.removeCategoryItems(category);
      if (!response.success) {
        fetchCart();
      }
      return response;
    } catch (error) {
      fetchCart();
      throw error;
    }
  }, [fetchCart]);

  // Clear entire cart
  const clearCart = useCallback(async () => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      // Guest Mode
      localStorage.removeItem(GUEST_CART_KEY);
      setCartItems([]);
      setCartCount(0);
      return { success: true };
    }

    // Authenticated Mode
    try {
      const response = await cartService.clearCart();
      if (response.success) {
        setCartItems([]);
        setCartCount(0);
      }
      return response;
    } catch (error) {
      throw error;
    }
  }, []);

  // Reset cart (for logout)
  const resetCart = useCallback(() => {
    setCartItems([]);
    setCartCount(0);
    setIsInitialized(false);
  }, []);

  const value = {
    cartItems,
    cartCount,
    isLoading,
    isInitialized,
    fetchCart,
    addToCart,
    updateItem,
    removeItem,
    removeCategoryItems,
    clearCart,
    resetCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;

