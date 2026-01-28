// @ts-nocheck
import React, { createContext, useContext, useState, useCallback } from 'react';
import { apiClient } from '../services/apiClient';

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  category: string;
  quantity?: number;
}

interface CartItem extends Product {
  quantity: number;
}

interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: string;
  createdAt: string;
  deliveryAddress: string;
}

interface StoreContextType {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: (page?: number, category?: string) => Promise<void>;
  searchProducts: (query: string) => Promise<void>;
  addToCart: (product: Product, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
  createOrder: (deliveryAddress: string, paymentMethod: string) => Promise<void>;
  fetchOrders: () => Promise<void>;
  cancelOrder: (orderId: string, reason: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (page = 1, category?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.getProducts(page, 20, category);
      setProducts(data.products || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchProducts = useCallback(async (query: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.searchProducts(query);
      setProducts(data || []);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addToCart = useCallback(async (product: Product, quantity: number) => {
    try {
      const existing = cart.find((item) => item.id === product.id);
      if (existing) {
        updateCartQuantity(product.id, existing.quantity + quantity);
      } else {
        setCart((prev) => [...prev, { ...product, quantity }]);
      }
      // Also add to server-side cart
      await apiClient.addToCart(product.id, quantity);
    } catch (err: any) {
      setError(err.message || 'Failed to add to cart');
    }
  }, [cart]);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
    apiClient.removeFromCart(productId).catch((err) => {
      setError(err.message || 'Failed to remove from cart');
    });
  }, []);

  const updateCartQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart((prev) =>
        prev.map((item) => (item.id === productId ? { ...item, quantity } : item))
      );
      apiClient.updateCart(productId, quantity).catch((err) => {
        setError(err.message || 'Failed to update cart');
      });
    }
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCart([]);
    apiClient.clearCart().catch((err) => {
      setError(err.message || 'Failed to clear cart');
    });
  }, []);

  const getCartTotal = useCallback(() => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cart]);

  const getCartCount = useCallback(() => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  }, [cart]);

  const createOrder = useCallback(async (deliveryAddress: string, paymentMethod: string) => {
    try {
      setIsLoading(true);
      const orderData = {
        items: cart,
        deliveryAddress,
        paymentMethod,
      };
      await apiClient.createOrder(orderData.items, deliveryAddress, paymentMethod);
      clearCart();
      await fetchOrders();
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [cart, clearCart]);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.getOrders();
      setOrders(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelOrder = useCallback(async (orderId: string, reason: string) => {
    try {
      setIsLoading(true);
      await apiClient.cancelOrder(orderId, reason);
      await fetchOrders();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel order');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <StoreContext.Provider
      value={{
        products,
        cart,
        orders,
        isLoading,
        error,
        fetchProducts,
        searchProducts,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
        createOrder,
        fetchOrders,
        cancelOrder,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
