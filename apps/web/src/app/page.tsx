'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStorefrontTheme, storefrontThemes, themeCategories } from '@/lib/storefront-themes';
import { fetchApi } from '@/lib/api';
import { ProductImage } from '@/components/ProductImage';
import { 
  ShoppingBag, 
  ArrowRight, 
  Check, 
  Zap, 
  ShieldCheck, 
  Globe, 
  Store, 
  Sparkles,
  Smartphone,
  Truck,
  TrendingUp,
  Layers, Menu, X
} from 'lucide-react';

type DemoStore = { name: string; slug: string; description: string; banner_url?: string | null; theme?: { theme_key: string } };

export default function MarketingHomePage() {
  const [annualBilling, setAnnualBilling] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [themeCategory, setThemeCategory] = useState(themeCategories[0]);
  const [demoStores, setDemoStores] = useState<DemoStore[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all(['fashion-house', 'gadget-zone'].map(async slug => {
      try {
        return await fetchApi<DemoStore>('/public/store', { headers: { 'X-Shop-Slug': slug }, signal: controller.signal });
      } catch {
        return null;
      }
    })).then(stores => {
      if (!controller.signal.aborted) setDemoStores(stores.filter((store): store is DemoStore => store !== null));
    });
    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" aria-label="Arise Store home" className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-md">
              A
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">Arise Store</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition">Features</a>
            <a href="#themes" className="hover:text-slate-900 transition">Themes</a>
            <a href="#pricing" className="hover:text-slate-900 transition">Pricing</a>
            <a href="#demo" className="hover:text-slate-900 transition">Live Demos</a>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="hidden px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow-sm transition sm:block"
            >
              Start Free Trial
            </Link>
            <button type="button" aria-label={menuOpen ? 'Close website menu' : 'Open website menu'} aria-expanded={menuOpen} aria-controls="website-menu" onClick={() => setMenuOpen(!menuOpen)} onKeyDown={event => { if (event.key === 'Escape') setMenuOpen(false); }} className="rounded-lg border border-slate-200 p-2 text-slate-600 md:hidden">{menuOpen ? <X size={20}/> : <Menu size={20}/>}</button>
          </div>
        </div>
        {menuOpen && <div id="website-menu" className="grid grid-cols-2 gap-2 border-t bg-white p-4 md:hidden">{[['Features','#features'],['Themes','#themes'],['Pricing','#pricing'],['Live Demos','#demo']].map(([label,href])=><a key={href} href={href} onClick={()=>setMenuOpen(false)} className="rounded-lg p-3 text-sm text-slate-600 hover:bg-slate-50">{label}</a>)}<Link href="/register" className="col-span-2 rounded-lg bg-slate-900 p-3 text-center text-sm font-semibold text-white">Start free trial</Link></div>}
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 bg-gradient-to-b from-slate-50 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-rose-600" />
            <span>Built Specifically for Online Sellers in Bangladesh</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-950 max-w-4xl mx-auto leading-[1.1]">
            Turn Your Social Media Followers Into a <span className="bg-gradient-to-r from-rose-600 to-indigo-600 bg-clip-text text-transparent">Real Online Brand</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Launch your own dedicated e-commerce shop in 60 seconds without writing a single line of code. Complete with built-in Cash on Delivery, instant order tracking, and mobile-first storefront themes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-base shadow-lg shadow-rose-600/20 flex items-center justify-center space-x-2 transition"
            >
              <span>Create Your Store Free</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#demo"
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold rounded-xl text-base shadow-sm transition"
            >
              Explore Live Demos
            </a>
          </div>

          {/* Trust Badges */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-slate-500">
            <div className="flex items-center space-x-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Cash on Delivery ready</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Custom-domain ownership verification</span>
            </div>
          </div>
        </div>
      </section>

      <section id="themes" aria-labelledby="themes-heading" className="scroll-mt-16 border-y border-stone-200 bg-[#f7f5f0] py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto mb-12 max-w-2xl text-center"><span className="text-[10px] font-semibold uppercase tracking-[.2em] text-stone-500">The theme collection</span><h2 id="themes-heading" className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Find your store’s look.</h2><p className="mt-4 text-sm leading-6 text-slate-500">Explore {storefrontThemes.length} designs across {themeCategories.length} store categories. Pick your category, compare its layouts, and find a look for your brand.</p></div>
          <div role="group" aria-label="Browse themes by category" className="mb-7 flex flex-wrap justify-center gap-2">{themeCategories.map(category => <button key={category} type="button" aria-label={category} aria-pressed={themeCategory === category} onClick={() => setThemeCategory(category)} className={`rounded-full border px-4 py-2.5 text-xs ${themeCategory === category ? 'border-slate-900 bg-slate-900 text-white' : 'border-stone-300 bg-white text-slate-600'}`}>{category}<span aria-hidden="true" className="ml-2 opacity-60">{storefrontThemes.filter(theme => theme.category === category).length}</span></button>)}</div>
          <p className="mb-5 text-center text-xs text-stone-500">{storefrontThemes.filter(theme => theme.category === themeCategory).length} designs for {themeCategory.toLowerCase()}</p>
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">{storefrontThemes.filter(theme => theme.category === themeCategory).map(theme => <Link key={theme.key} href={`/themes/${theme.key}`} className="group overflow-hidden rounded-xl border border-stone-200 bg-white">
            <div className="aspect-[16/11] overflow-hidden border-b border-stone-100 bg-stone-100"><img src={theme.preview_image_url} alt={`${theme.name} storefront preview`} loading="lazy" className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.02]" /></div>
            <div className="p-5"><span className="text-[9px] uppercase tracking-[.15em] text-stone-400">{theme.category}</span><div className="mt-2 flex items-center justify-between"><h3 className="text-lg font-semibold text-slate-900">{theme.name}</h3><ArrowRight size={17} className="text-stone-400" /></div><p className="mt-2 text-xs leading-6 text-slate-500">{theme.description}</p></div>
          </Link>)}</div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="scroll-mt-16 py-24 max-w-7xl mx-auto px-4">
        <div className="text-center max-w-xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Engineered for Merchants</span>
          <h2 className="text-3xl font-extrabold text-slate-900">Everything You Need to Scale Orders</h2>
          <p className="text-slate-600 text-sm">
            We eliminated the developer setup fees and server maintenance nightmares.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900">Cash on Delivery Engine</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Standardized delivery fee zones for Inside Dhaka (৳60) and Outside Dhaka (৳120) with automated phone validation.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900">Custom Domain Connection</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Verify ownership of your registered domain name before arranging HTTPS and routing with the administrator. Local stores use a dedicated storefront URL.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900">Immutable Order History</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Product prices and titles are snapshot securely at purchase time. Changing your catalog prices never corrupts accounting.
            </p>
          </div>
        </div>
      </section>

      <section id="demo" aria-labelledby="demo-heading" className="scroll-mt-16 border-t border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <span className="text-[10px] font-semibold uppercase tracking-[.2em] text-indigo-600">Live sample stores</span>
            <h2 id="demo-heading" className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Take a store for a test drive.</h2>
            <p className="mt-4 text-sm leading-6 text-slate-500">Browse a stocked sample shop, add products to your bag, try Cash on Delivery checkout, and track an order. Use sample details; demo orders are for testing.</p>
          </div>
          {demoStores === null ? <p role="status" className="text-center text-sm text-slate-500">Checking available demo stores…</p> : demoStores.length === 0 ? <div role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-center"><p className="text-sm text-slate-600">Live demo stores are currently unavailable.</p><a href="#themes" className="mt-3 inline-block text-sm font-semibold text-indigo-600 underline">Explore the theme previews</a></div> : <div className="mx-auto grid max-w-5xl gap-7 md:grid-cols-2">{demoStores.map(store => <Link key={store.slug} href={`/store/${store.slug}`} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="aspect-[16/8] overflow-hidden bg-stone-100"><ProductImage src={store.banner_url || getStorefrontTheme(store.theme?.theme_key).image} alt={`${store.name} collection`} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" /></div>
            <div className="p-6"><span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">Sample shop · {getStorefrontTheme(store.theme?.theme_key).category}</span><h3 className="mt-2 text-xl font-semibold text-slate-900">{store.name}</h3><p className="mt-3 text-sm leading-6 text-slate-500">{store.description}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">Open sample store <ArrowRight size={17} /></span></div>
          </Link>)}</div>}
        </div>
      </section>

      {/* Pricing Table */}
      <section id="pricing" className="scroll-mt-16 py-24 bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Honest & Transparent</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold">Simple Monthly & Annual Plans</h2>
            <p className="text-slate-400 text-sm">
              No hidden fees, no percentage cuts from your hard-earned sales.
            </p>

            {/* Toggle */}
            <div className="flex items-center justify-center space-x-3 pt-2">
              <span className={`text-xs ${!annualBilling ? 'text-white font-bold' : 'text-slate-400'}`}>Monthly</span>
              <button
                type="button" role="switch" aria-label="Annual billing" aria-checked={annualBilling}
                onClick={() => setAnnualBilling(!annualBilling)}
                className="w-12 h-6 bg-slate-800 rounded-full p-1 transition-colors relative"
              >
                <div className={`w-4 h-4 bg-rose-500 rounded-full transition-transform ${annualBilling ? 'translate-x-6' : ''}`} />
              </button>
              <span className={`text-xs ${annualBilling ? 'text-white font-bold' : 'text-slate-400'}`}>
                Annual <span className="text-rose-400 font-bold">(Save 2 Months)</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Starter</h3>
                <p className="text-xs text-slate-400 mb-6">Ideal for social sellers taking their first leap online.</p>
                <div className="text-3xl font-black mb-6">
                  ৳{annualBilling ? '4,990' : '499'}
                  <span className="text-xs text-slate-500 font-normal">/{annualBilling ? 'year' : 'month'}</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Up to 100 products</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Dedicated storefront URL</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>All {storefrontThemes.length} storefront themes</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Cash on Delivery checkout</span>
                  </li>
                </ul>
              </div>
              <div className="pt-8">
                <Link
                  href="/register"
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase rounded-lg text-center block transition"
                >
                  Start 14-Day Trial
                </Link>
              </div>
            </div>

            {/* Growth (Featured) */}
            <div className="bg-slate-900 border-2 border-rose-500 rounded-2xl p-8 flex flex-col justify-between relative shadow-2xl">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full">
                Most Popular
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Growth</h3>
                <p className="text-xs text-slate-400 mb-6">For growing retailers scaling their brand & catalog.</p>
                <div className="text-3xl font-black mb-6 text-rose-400">
                  ৳{annualBilling ? '9,990' : '999'}
                  <span className="text-xs text-slate-500 font-normal">/{annualBilling ? 'year' : 'month'}</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>Up to 1,000 products</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span className="font-semibold text-white">Custom domain ownership verification</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>Product variants (Sizes, Colors, Attributes)</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>Configurable delivery fees</span>
                  </li>
                </ul>
              </div>
              <div className="pt-8">
                <Link
                  href="/register"
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase rounded-lg text-center block transition shadow-lg shadow-rose-600/30"
                >
                  Start 14-Day Trial
                </Link>
              </div>
            </div>

            {/* Premium */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Premium</h3>
                <p className="text-xs text-slate-400 mb-6">High-volume brands and multi-staff operations.</p>
                <div className="text-3xl font-black mb-6">
                  ৳{annualBilling ? '19,990' : '1,999'}
                  <span className="text-xs text-slate-500 font-normal">/{annualBilling ? 'year' : 'month'}</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Up to 10,000 products</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>DNS ownership verification</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Multi-staff roles and permission control</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Manual subscription billing</span>
                  </li>
                </ul>
              </div>
              <div className="pt-8">
                <Link
                  href="/register"
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase rounded-lg text-center block transition"
                >
                  Start 14-Day Trial
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white py-12 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
              A
            </div>
            <span className="font-bold text-slate-900">Arise Store Platform</span>
          </div>
          <p>© 2026 Arise Store. Built with FastAPI and Next.js for high-speed commerce in Bangladesh.</p>
          <div className="flex space-x-4">
            <Link href="/login" className="hover:text-slate-900">Merchant Login</Link>
            <Link href="/admin" className="hover:text-slate-900">Platform Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

