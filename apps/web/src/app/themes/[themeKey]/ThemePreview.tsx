'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { CartProvider } from '@/lib/cart';
import { Storefront } from '@/components/themes/Storefront';
import { CartDrawer } from '@/components/CartDrawer';
import { storefrontThemes, type StorefrontThemePreset } from '@/lib/storefront-themes';

export function ThemePreview({ preset, demo }: { preset: StorefrontThemePreset; demo: { store: any; products: any[] } }) {
  const [notice, setNotice] = useState(false);
  return <CartProvider key={preset.key} shopSlug={`theme-demo-${preset.key}`}>
    <div className="sf-preview-toolbar"><span><strong>{preset.name}</strong> · Theme preview with sample products</span><Link href={`/register?theme=${preset.key}`}>Use this theme →</Link><Link href="/dashboard/themes">Theme gallery</Link></div>
    <nav className="sf-preview-variants" aria-label={`${preset.category} themes`}><span>{preset.category}</span>{storefrontThemes.filter(theme => theme.category === preset.category).map(theme => <Link key={theme.key} href={`/themes/${theme.key}`} aria-current={theme.key === preset.key ? 'page' : undefined}>{theme.name}</Link>)}</nav>
    <Storefront store={demo.store} products={demo.products} preview />
    <CartDrawer onCheckout={() => setNotice(true)} />
    {notice && <div role="status" className="sf-preview-notice"><span>This is a theme preview. Apply it to your store to accept real orders.</span><button type="button" onClick={() => setNotice(false)} aria-label="Dismiss preview notice"><X size={18} /></button></div>}
  </CartProvider>;
}
