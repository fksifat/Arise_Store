'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { percentageDiscount } from './pricing';

import { CartItem, cartLimit, restoreCart } from './cart-items';
export type { CartItem } from './cart-items';

interface CartContextType {
  items: CartItem[];
  shopSlug: string;
  shippingCity: string;
  setShippingCity: (city: string) => void;
  addItem: (item: CartItem) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  removeItem: (productId: string, variantId?: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  subtotalMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  totalMinor: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ 
  children, 
  shopSlug, 
  insideDhakaFee = 6000, 
  outsideDhakaFee = 12000,
  discountPercent = 0,
}: { 
  children: React.ReactNode; 
  shopSlug: string;
  insideDhakaFee?: number;
  outsideDhakaFee?: number;
  discountPercent?: number;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [shippingCity, setShippingCity] = useState<string>('Dhaka');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const storageKey = `arise_cart_${shopSlug}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setItems(restoreCart(JSON.parse(stored)));
      }
    } catch (e) {
      console.error('Failed to load cart', e);
    }
    setIsLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(items));
      } catch (e) {
        console.error('Failed to save cart', e);
      }
    }
  }, [items, isLoaded, storageKey]);

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (i) => i.productId === item.productId && i.variantId === item.variantId
      );
      const limit = cartLimit(item);
      if (limit < 1) return prev;
      if (existingIndex > -1) return prev.map((current, index) => index === existingIndex ? {...item,quantity:Math.min(limit,current.quantity+item.quantity)} : current);
      if (prev.length >= 100) return prev;
      return [...prev, {...item,quantity:Math.min(limit,item.quantity)}];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, quantity: number, variantId?: string) => {
    if (!Number.isInteger(quantity)) return;
    if (quantity <= 0) {
      removeItem(productId, variantId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId === productId && i.variantId === variantId) {
          return { ...i, quantity: Math.min(quantity, Math.max(1, cartLimit(i))) };
        }
        return i;
      })
    );
  };

  const removeItem = (productId: string, variantId?: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.productId === productId && i.variantId === variantId))
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const subtotalMinor = items.reduce((acc, i) => acc + i.priceMinor * i.quantity, 0);
  const deliveryFeeMinor = items.length === 0 ? 0 : (shippingCity.toLowerCase() === 'dhaka' ? insideDhakaFee : outsideDhakaFee);
  const discountMinor = percentageDiscount(subtotalMinor, discountPercent);
  const totalMinor = subtotalMinor - discountMinor + deliveryFeeMinor;

  return (
    <CartContext.Provider
      value={{
        items,
        shopSlug,
        shippingCity,
        setShippingCity,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        subtotalMinor,
        deliveryFeeMinor,
        discountMinor,
        totalMinor,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

