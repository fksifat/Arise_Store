'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { Search, Package, Clock, CheckCircle, AlertCircle, Phone } from 'lucide-react';

export default function TrackOrderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setOrderNumber(new URLSearchParams(window.location.search).get('order') || ''); }, [slug]);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const data = await fetchApi<any>(
        '/public/orders/track',
        {
          method: 'POST',
          body: JSON.stringify({ order_number: orderNumber.trim(), phone: phone.trim() }),
          headers: { 'X-Shop-Slug': slug },
        }
      );
      setOrder(data);
    } catch (err: any) {
      setError(err.message || 'Order not found. Please check your order number and phone number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        <Link href={`/store/${slug}`} className="text-sm text-slate-600 underline">Back to store</Link>
        <div className="text-center space-y-2">
          <Package className="w-10 h-10 text-slate-800 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-900">Track Your Order</h1>
          <p className="text-sm text-slate-600">Enter your order ID and the phone number used at checkout</p>
        </div>

        <form onSubmit={handleTrack} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="tracking-order" className="block text-xs font-semibold text-slate-700 mb-1">
              Order Number
            </label>
            <input
              type="text"
              required
              placeholder="e.g. ORD-261024-10042"
              id="tracking-order" value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none font-mono"
            />
          </div>

          <div>
            <label htmlFor="tracking-phone" className="block text-xs font-semibold text-slate-700 mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. 01712345678"
              id="tracking-phone" value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Tracking...</span>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Track Status</span>
              </>
            )}
          </button>
        </form>

        {order && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-xs text-slate-500 font-mono">ORDER NUMBER</span>
                <p className="text-base font-bold font-mono text-slate-900">{order.order_number}</p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider">
                {order.status.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Recipient:</span>
                <span className="font-medium text-slate-900">{order.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery Address:</span>
                <span className="font-medium text-slate-900 text-right max-w-xs">{order.shipping_address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment:</span>
                <span className="font-medium text-slate-900 uppercase">
                  {order.payment_method} ({order.payment_status})
                </span>
              </div>
              <div className="flex justify-between"><span className="text-slate-500">Delivery charge:</span><span>৳{(order.delivery_fee_minor / 100).toLocaleString('en-BD')}</span></div>
              {order.discount_minor > 0 && <div className="flex justify-between text-emerald-700"><span>Store discount:</span><span>−৳{(order.discount_minor / 100).toLocaleString('en-BD')}</span></div>}
              <div className="flex justify-between border-t pt-2 font-bold text-slate-900">
                <span>Total Amount:</span>
                <span className="text-rose-600">৳{(order.total_minor / 100).toLocaleString('en-BD')}</span>
              </div>
            </div>

            <div className="border-t pt-3 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Items Ordered</h4>
              {order.items.map((item: any) => (
                <div key={item.id} className="flex justify-between text-xs text-slate-700">
                  <span>{item.quantity}x {item.product_name_snapshot}{item.variant_title_snapshot && <small className="mt-1 block text-slate-500">{item.variant_title_snapshot}</small>}</span>
                  <span className="font-medium">৳{(item.line_total_minor / 100).toLocaleString('en-BD')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

