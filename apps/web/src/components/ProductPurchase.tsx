'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { defaultVariant } from '@/lib/pricing';

export function ProductPurchase({ product, imageUrl, className, label, onAdded }: { product: any; imageUrl?: string; className: string; label: string; onAdded?: () => void }) {
  const { addItem } = useCart();
  const variants = (product.variants || []).filter((variant: any) => variant.is_active);
  const [variantId, setVariantId] = useState(defaultVariant(product)?.id || '');
  const variant = variants.find((item: any) => item.id === variantId) || defaultVariant(product);
  const stock = variant ? variant.stock_quantity : product.stock_quantity;
  const price = variant?.price_minor ?? product.price_minor;
  const unavailable = product.track_inventory && stock <= 0;
  return <div className="sf-purchase">
    <div className="sf-price"><strong>৳{(price / 100).toLocaleString('en-BD')}</strong>{product.compare_at_price_minor > price && <del>৳{(product.compare_at_price_minor / 100).toLocaleString('en-BD')}</del>}<span className={unavailable ? 'sf-stock sf-stock-out' : 'sf-stock'}>{unavailable ? 'Out of stock' : 'Available'}</span></div>
    {variants.length > 0 && <select aria-label={`Option for ${product.name}`} className="sf-variant-select" value={variant?.id || ''} onChange={event => setVariantId(event.target.value)}>{variants.map((item: any) => <option key={item.id} value={item.id}>{item.title} · ৳{((item.price_minor ?? product.price_minor) / 100).toLocaleString('en-BD')}</option>)}</select>}
    <button disabled={unavailable} className={className} onClick={() => {
      addItem({ productId: product.id, variantId: variant?.id, name: product.name + (variant ? ` (${variant.title})` : ''), imageUrl, priceMinor: price, quantity: 1, stockAvailable: product.track_inventory ? stock : 100 });
      onAdded?.();
    }}><span>{unavailable ? 'Out of stock' : label}</span>{!unavailable && <Plus size={16} aria-hidden="true" />}</button>
  </div>;
}
