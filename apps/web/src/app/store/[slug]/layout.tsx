'use client';

import React, { useState, useEffect, use } from 'react';
import { CartProvider } from '@/lib/cart';
import { CartDrawer } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';
import { fetchApi } from '@/lib/api';

export default function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [store, setStore] = useState<any | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    async function loadStore() {
      try {
        const data = await fetchApi<any>('/public/store', {
          headers: { 'X-Shop-Slug': slug },
        });
        setStore(data);
      } catch (e) {
        console.error('Failed to load store metadata', e);
      }
    }
    loadStore();
  }, [slug]);

  const insideFee = store?.inside_dhaka_delivery_fee_minor 
    ? parseInt(store.inside_dhaka_delivery_fee_minor) 
    : 6000;
  const outsideFee = store?.outside_dhaka_delivery_fee_minor 
    ? parseInt(store.outside_dhaka_delivery_fee_minor) 
    : 12000;

  return (
    <CartProvider key={slug}
      shopSlug={slug}
      insideDhakaFee={insideFee}
      outsideDhakaFee={outsideFee}
      discountPercent={store?.discount_percent || 0}
    >
      {children}
      <CartDrawer onCheckout={() => setIsCheckoutOpen(true)} />
      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        shopSlug={slug} 
      />
    </CartProvider>
  );
}

