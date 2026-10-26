'use client';

import React, { useState, useEffect, use } from 'react';
import { fetchApi } from '@/lib/api';
import { Storefront } from '@/components/themes/Storefront';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [store, setStore] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [loadVersion, setLoadVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [storeData, productsData] = await Promise.all([
          fetchApi<any>('/public/store', {
            headers: { 'X-Shop-Slug': slug }, signal: controller.signal,
          }),
          fetchApi<any[]>('/public/products', {
            headers: { 'X-Shop-Slug': slug }, signal: controller.signal,
          }),
        ]);
        setStore(storeData);
        setProducts(productsData);
      } catch (err: any) {
        if (!controller.signal.aborted) setError(err.message || 'Store could not be loaded');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadData();
    return () => controller.abort();
  }, [slug, loadVersion]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-slate-600 mx-auto" />
          <p className="text-sm font-medium text-slate-600">Loading storefront...</p>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-lg border border-slate-200 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Store Unavailable</h2>
          <p className="text-sm text-slate-600">{error || 'This store does not exist or is not published yet.'}</p>
          <button className="rounded bg-slate-900 px-4 py-2 text-white" onClick={() => setLoadVersion(v => v + 1)}>Try again</button>
        </div>
      </div>
    );
  }

  return <Storefront key={slug} store={store} products={products} />;
}
