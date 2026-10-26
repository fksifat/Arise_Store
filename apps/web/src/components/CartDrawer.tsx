'use client';

import React from 'react';
import { ProductImage } from './ProductImage';
import { Modal } from './Modal';
import { cartLimit } from '@/lib/cart-items';
import { useCart } from '@/lib/cart';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';

export function CartDrawer({ onCheckout }: { onCheckout: () => void }) {
  const { 
    items,
    shopSlug,
    isCartOpen, 
    setIsCartOpen, 
    updateQuantity, 
    removeItem, 
    subtotalMinor, 
    deliveryFeeMinor, 
    discountMinor,
    totalMinor,
    shippingCity,
    setShippingCity 
  } = useCart();

  if (!isCartOpen) return null;

  let hasPendingCheckout = false;
  try { const saved = JSON.parse(localStorage.getItem(`arise_checkout_${shopSlug}`) || 'null'); hasPendingCheckout = typeof saved?.key === 'string' && typeof saved?.body === 'string'; } catch {}
  return (
    <Modal titleId="cart-title" onClose={() => setIsCartOpen(false)} className="m-0 ml-auto h-dvh max-h-none w-[min(28rem,calc(100vw-1rem))] max-w-none overflow-hidden border-0 bg-white p-0 shadow-2xl backdrop:bg-black/50">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between bg-slate-50">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-slate-800" />
              <h2 id="cart-title" className="text-lg font-semibold text-slate-900">Your Shopping Bag</h2>
              <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full font-medium">
                {items.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            </div>
            <button 
              aria-label="Close cart"
              onClick={() => setIsCartOpen(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Items List */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">Your cart is empty</p>
                <p className="text-sm text-slate-400 mt-1">Add items to get started with Cash on Delivery</p>
              </div>
            ) : (
              items.map((item) => (
                <div 
                  key={`${item.productId}-${item.variantId || 'base'}`}
                  className="flex space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <ProductImage src={item.imageUrl} alt={item.name} className="w-16 h-16 object-cover rounded-md flex-shrink-0 [&>span]:hidden" />

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-slate-900 truncate">{item.name}</h4>
                    <p className="text-xs font-semibold text-rose-600 mt-0.5">
                      ৳{(item.priceMinor / 100).toLocaleString('en-BD')}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-slate-300 rounded bg-white">
                        <button
                          aria-label={`Decrease quantity of ${item.name}`}
                          onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)}
                          className="p-2 text-slate-500 hover:text-slate-800 disabled:opacity-30"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 text-xs font-medium text-slate-800">{item.quantity}</span>
                        <button
                          aria-label={`Increase quantity of ${item.name}`} disabled={item.quantity >= cartLimit(item)}
                          onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)}
                          className="p-2 text-slate-500 hover:text-slate-800 disabled:opacity-30"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        aria-label={`Remove ${item.name}`}
                        onClick={() => removeItem(item.productId, item.variantId)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {hasPendingCheckout && <div role="status" className="border-t bg-amber-50 p-4 text-xs text-amber-900"><p>A previous checkout is awaiting confirmation.</p><button onClick={() => { setIsCartOpen(false); onCheckout(); }} className="mt-2 font-semibold underline">Recover saved checkout</button></div>}
          {/* Footer & Checkout Area */}
          {items.length > 0 && (
            <div className="p-4 border-t bg-slate-50 space-y-3">
              {/* Delivery Zone selection */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Delivery Destination
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={shippingCity.toLowerCase() === 'dhaka'}
                    onClick={() => setShippingCity('Dhaka')}
                    className={`py-1.5 px-3 text-xs rounded-md border font-medium text-center transition ${
                      shippingCity.toLowerCase() === 'dhaka'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Inside Dhaka
                  </button>
                  <button
                    type="button"
                    aria-pressed={shippingCity.toLowerCase() !== 'dhaka'}
                    onClick={() => setShippingCity('Outside Dhaka')}
                    className={`py-1.5 px-3 text-xs rounded-md border font-medium text-center transition ${
                      shippingCity.toLowerCase() !== 'dhaka'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Outside Dhaka
                  </button>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-1 text-sm pt-2 border-t border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>৳{(subtotalMinor / 100).toLocaleString('en-BD')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Charge</span>
                  <span>৳{(deliveryFeeMinor / 100).toLocaleString('en-BD')}</span>
                </div>
                {discountMinor > 0 && <div className="flex justify-between text-emerald-700"><span>Store discount</span><span>−৳{(discountMinor / 100).toLocaleString('en-BD')}</span></div>}
                <div className="flex justify-between text-base font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total Amount</span>
                  <span>৳{(totalMinor / 100).toLocaleString('en-BD')}</span>
                </div>
              </div>

              {/* Checkout Action */}
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  onCheckout();
                }}
                className="w-full py-3 bg-rose-600 text-white rounded-lg font-semibold flex items-center justify-center space-x-2 hover:bg-rose-700 transition shadow-md"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-[11px] text-center text-slate-500">
                Final prices checked at checkout · Pay on delivery
              </p>
            </div>
          )}
        </div>
    </Modal>
  );
}

