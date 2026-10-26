'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Modal } from './Modal';
import { useCart } from '@/lib/cart';
import { fetchApi, ApiError } from '@/lib/api';
import { X, CheckCircle, AlertCircle, ShoppingBag, Truck } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopSlug: string;
}

export function CheckoutModal({ isOpen, onClose, shopSlug }: CheckoutModalProps) {
  const { items, shippingCity, setShippingCity, subtotalMinor, deliveryFeeMinor, totalMinor, clearCart, setIsCartOpen } = useCart();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const paymentMethod = 'cod';
  const [quote, setQuote] = useState<any | null>(null);
  const [quoting, setQuoting] = useState(false);
  const cartSignature = JSON.stringify(items.map(i => ({ product_id: i.productId, variant_id: i.variantId || undefined, quantity: i.quantity })));
  const [retryPayload, setRetryPayload] = useState<string | null>(null);
  const [quoteVersion, setQuoteVersion] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCompletedOrder(null); setError(null);
      try { setRetryPayload(JSON.parse(localStorage.getItem(`arise_checkout_${shopSlug}`) || 'null')?.body || null); } catch {}
    }
  }, [isOpen, shopSlug]);
  useEffect(() => {
    if (!isOpen || completedOrder || items.length === 0) return;
    let cancelled = false;
    setQuoting(true); setQuote(null);
    fetchApi<any>('/public/cart/validate', { method: 'POST', headers: { 'X-Shop-Slug': shopSlug }, body: JSON.stringify({ items: JSON.parse(cartSignature), shipping_city: shippingCity }) })
      .then(data => { if (!cancelled) { setQuote(data); setError(data.all_in_stock ? null : 'Some items are out of stock. Update your cart.'); } })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setQuoting(false); });
    return () => { cancelled = true; };
  }, [isOpen, completedOrder, cartSignature, shippingCity, shopSlug, quoteVersion]);
  if (!isOpen) return null;

  const sendSavedCheckout = async (saved: { key: string; body: string }) => {
    setLoading(true); setError(null);
    const storageKey = `arise_checkout_${shopSlug}`;
    try {
      const result = await fetchApi<any>('/public/orders', { method: 'POST', body: saved.body, headers: { 'X-Shop-Slug': shopSlug, 'Idempotency-Key': saved.key } });
      localStorage.removeItem(storageKey); setRetryPayload(null); setCompletedOrder(result); clearCart();
    } catch (err: any) {
      if (err instanceof ApiError && ([400, 422].includes(err.status) || ['price_changed', 'out_of_stock'].includes(err.code || ''))) {
        localStorage.removeItem(storageKey); setRetryPayload(null); setQuoteVersion(v => v + 1);
      }
      setError(err.message || 'Confirmation was interrupted. Recover the saved checkout before placing another order.');
    } finally { setLoading(false); }
  };

  const recoverCheckout = async () => {
    try {
      const saved = JSON.parse(localStorage.getItem(`arise_checkout_${shopSlug}`) || 'null');
      if (saved?.key && saved?.body) await sendSavedCheckout(saved);
    } catch { setError('Saved checkout could not be read. Please contact the store before placing another order.'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote?.all_in_stock || quoting || retryPayload) return;
    setError(null);
    setLoading(true);

    try {
      const payload = {
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_email: email.trim() || undefined,
        shipping_city: shippingCity,
        shipping_address: address.trim(),
        customer_note: note.trim() || undefined,
        payment_method: paymentMethod,
        expected_total_minor: quote.total_minor,
        items: items.map((i) => ({
          product_id: i.productId,
          variant_id: i.variantId || undefined,
          quantity: i.quantity,
        })),
      };

      const storageKey = `arise_checkout_${shopSlug}`;
      const body = JSON.stringify(payload);
      let saved;
      try { saved = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch {}
      if (saved) {
        setRetryPayload(saved.body);
        setLoading(false);
        return;
      } else {
        saved = { key: crypto.randomUUID(), body };
        localStorage.setItem(storageKey, JSON.stringify(saved));
      }
      setRetryPayload(body);
      await sendSavedCheckout(saved);
    } catch (err: any) {
      setError(err.message || 'Failed to place order. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal label="Checkout" onClose={onClose} preventClose={loading}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <Truck className="w-5 h-5 text-slate-800" />
            <h3 className="font-semibold text-slate-900">
              {completedOrder ? 'Order Confirmed!' : 'Cash on Delivery Checkout'}
            </h3>
          </div>
          <button
            aria-label="Close checkout" disabled={loading} onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {completedOrder ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-slate-900">Thank you for your order!</h4>
              <p className="text-sm text-slate-600">
                Your order has been placed successfully and will be delivered via Cash on Delivery.
              </p>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-left space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Order Number:</span>
                  <span className="font-mono font-bold text-slate-900">{completedOrder.order_number}</span>
                </div>
                {completedOrder.discount_minor > 0 && <div className="flex justify-between text-emerald-700"><span>Store discount:</span><span>−৳{(completedOrder.discount_minor / 100).toLocaleString('en-BD')}</span></div>}
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Payable:</span>
                  <span className="font-bold text-rose-600">৳{(completedOrder.total_minor / 100).toLocaleString('en-BD')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Deliver to:</span>
                  <span className="text-slate-800 font-medium text-right truncate max-w-[200px]">
                    {completedOrder.customer_name} ({completedOrder.customer_phone})
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <Link href={`/store/${shopSlug}/track?order=${encodeURIComponent(completedOrder.order_number)}`} onClick={onClose} className="mb-3 block rounded-lg border border-slate-300 p-2.5 text-sm font-medium text-slate-900">Track this order</Link>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button type="button" disabled={loading} onClick={() => { onClose(); setIsCartOpen(true); }} className="text-xs font-semibold text-slate-600 underline">Edit shopping bag</button>
              {retryPayload && <div role="status" className="text-xs text-amber-700 space-y-2"><p>A checkout is awaiting confirmation. Recover it before placing another order.</p><button type="button" disabled={loading} onClick={recoverCheckout} className="p-3 rounded bg-amber-100 font-semibold">Recover saved checkout</button></div>}
              {quote && <p className="text-xs text-slate-600">Delivery: ৳{(quote.delivery_fee_minor / 100).toLocaleString('en-BD')} · Prices checked with the store</p>}
              {quote?.discount_minor > 0 && <p className="text-xs font-semibold text-emerald-700">Store discount: −৳{(quote.discount_minor / 100).toLocaleString('en-BD')}</p>}
              {/* Order Summary Pill */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  {items.length} item(s) • Total Amount:
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  ৳{((quote?.total_minor ?? totalMinor) / 100).toLocaleString('en-BD')}
                </span>
              </div>

              <div>
                <label htmlFor="checkout-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input id="checkout-name" autoComplete="name" minLength={2} maxLength={100}
                  type="text"
                  required
                  placeholder="e.g. Tanvir Ahmed"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>

              <div>
                <label htmlFor="checkout-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number (Bangladesh) <span className="text-rose-500">*</span>
                </label>
                <input id="checkout-phone" autoComplete="tel" inputMode="tel" maxLength={20}
                  type="tel"
                  required
                  placeholder="e.g. 01712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">Use a number where the store can reach you about your order.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="checkout-area" className="block text-xs font-semibold text-slate-700 mb-1">
                    Delivery Area
                  </label>
                  <select id="checkout-area"
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                  >
                    <option value="Dhaka">Inside Dhaka</option>
                    <option value="Outside Dhaka">Outside Dhaka</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="checkout-email" className="block text-xs font-semibold text-slate-700 mb-1">
                    Email (Optional)
                  </label>
                  <input id="checkout-email" autoComplete="email" maxLength={254}
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="checkout-address" className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Delivery Address <span className="text-rose-500">*</span>
                </label>
                <textarea id="checkout-address" autoComplete="street-address" minLength={5} maxLength={500}
                  required
                  rows={2}
                  placeholder="House number, Road, Area, Thana, District"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none resize-none"
                />
              </div>

              <div>
                <label htmlFor="checkout-notes" className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery Notes (Optional)
                </label>
                <input id="checkout-notes" maxLength={1000}
                  type="text"
                  placeholder="e.g. Deliver after 5 PM / Leave with building guard"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Option
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center space-x-2 p-2.5 rounded-lg border cursor-pointer text-xs font-medium ${
                    paymentMethod === 'cod' ? 'border-slate-900 bg-slate-50 text-slate-900' : 'border-slate-200 text-slate-600'
                  }`}>
                    <input
                      type="radio"
                      name="payment"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      readOnly
                      className="text-slate-900"
                    />
                    <span>Cash on Delivery</span>
                  </label>

                </div>
              </div>

              <button
                type="submit"
                disabled={loading || quoting || !quote?.all_in_stock || !!retryPayload}
                className="w-full py-3 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Placing Order...</span>
                ) : (
                  <span>{quoting ? 'Checking prices…' : 'Confirm Order'} (৳{((quote?.total_minor ?? totalMinor) / 100).toLocaleString('en-BD')})</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
}

