'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { useMerchant } from '@/lib/merchant';
import { storefrontThemes } from '@/lib/storefront-themes';
import { isOnlineStore } from '@/lib/sites';
import { WebsiteOverview } from './_components/WebsiteOverview';
import { PageState } from './_components/PageState';
import { ShoppingBag, Package, ArrowRight, CheckCircle2, Circle, ExternalLink, Store, Palette, Truck, RefreshCw } from 'lucide-react';

const money = (minor: number) => `৳${(minor / 100).toLocaleString('en-BD')}`;

function StoreOverviewPage() {
  const { shop, updateShop } = useMerchant();
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [publishing, setPublishing] = useState(false);

  const loadData = async () => {
    setLoading(true); setError('');
    try {
      const [catalog, orderList] = await Promise.all([
        fetchApi<any[]>(`/shops/${shop.id}/products`), fetchApi<any[]>(`/shops/${shop.id}/orders`),
      ]);
      setProducts(catalog); setOrders(orderList);
    } catch (error: any) { setError(error.message || 'Your overview could not be loaded.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadData(); }, [shop.id]);

  const togglePublish = async () => {
    if (publishing) return;
    setPublishing(true); setActionError('');
    try { updateShop(await fetchApi(`/shops/${shop.id}/${shop.status === 'published' ? 'unpublish' : 'publish'}`, { method: 'POST' })); }
    catch (error: any) { setActionError(error.message || 'Store status could not be updated.'); }
    finally { setPublishing(false); }
  };

  const activeProducts = products.filter(product => product.status === 'active');
  const toFulfill = orders.filter(order => ['pending', 'confirmed', 'processing', 'ready_to_ship'].includes(order.status));
  const delivered = orders.filter(order => order.status === 'delivered');
  const deliveredValue = delivered.reduce((sum, order) => sum + order.total_minor, 0);
  const lowStock = activeProducts.filter(product => product.track_inventory && (product.variants?.some((variant: any) => variant.is_active)
    ? product.variants.some((variant: any) => variant.is_active && variant.stock_quantity <= 5)
    : product.stock_quantity <= 5));
  const published = shop.status === 'published';
  const canPublish = ['draft', 'published'].includes(shop.status);
  const checklist = [
    { label: 'Add an active product', detail: `${activeProducts.length} active · ${products.length} in your catalog`, done: activeProducts.length > 0, href: '/dashboard/products' },
    { label: 'Add customer contact details', detail: shop.contact_phone || shop.contact_email || 'Help shoppers reach your store', done: !!(shop.contact_phone || shop.contact_email), href: '/dashboard/settings' },
    { label: 'Publish your store', detail: published ? 'Your storefront is open to customers' : 'Open your store when you are ready', done: published, href: '#store-status' },
  ];

  if (loading || error) return <PageState loading={loading} error={error} onRetry={loadData} />;
  return <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Your business at a glance</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Store overview</h1><p className="mt-2 text-sm text-slate-500">{shop.name} · All-time activity</p></div><div className="flex flex-wrap gap-2"><Link href="/dashboard/reports" className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700">Reports</Link><button type="button" onClick={loadData} aria-label="Refresh overview" className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600"><RefreshCw size={17} /></button><Link href="/dashboard/products" className="rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white">Manage products</Link></div></header>
    {actionError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{actionError}</p>}
    <section id="store-status" aria-label="Store status" className="flex scroll-mt-20 flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5"><div className="min-w-0"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Store size={17} />{shop.name}<span className={`rounded-full px-2 py-1 text-[10px] font-medium capitalize ${published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{shop.status}</span></div><p className="mt-2 break-all text-xs text-slate-500">{published ? 'Your store is available at ' : 'Your store will be available at '}/store/{shop.slug}</p></div><div className="flex flex-wrap gap-2">{published && <Link href={`/store/${shop.slug}`} target="_blank" className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-medium">View storefront <ExternalLink size={14} /></Link>}{canPublish ? <button disabled={publishing} onClick={togglePublish} className={`rounded-lg px-3 py-2.5 text-xs font-semibold disabled:opacity-50 ${published ? 'border border-slate-200 text-slate-600' : 'bg-emerald-700 text-white'}`}>{publishing ? 'Updating…' : published ? 'Unpublish store' : 'Publish store'}</button> : <Link href="/dashboard/subscription" className="text-xs font-medium text-amber-800 underline">Review store access</Link>}</div></section>
    <section aria-label="Store metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[
      { label: 'Orders to fulfill', value: toFulfill.length, detail: 'Pending through ready to ship', href: '/dashboard/orders?status=unfulfilled', icon: ShoppingBag },
      { label: 'Delivered order value', value: money(deliveredValue), detail: `${delivered.length} delivered orders · includes delivery`, href: '/dashboard/orders?status=delivered', icon: Truck },
      { label: 'Active products', value: activeProducts.length, detail: `${products.length} products in your catalog`, href: '/dashboard/products', icon: Package },
      { label: 'Total orders', value: orders.length, detail: 'All order statuses', href: '/dashboard/orders', icon: ShoppingBag },
    ].map(({ label, value, detail, href, icon: Icon }) => <Link key={label} href={href} aria-label={`${label}: ${value}`} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-400 sm:p-5"><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-slate-500">{label}</span><Icon size={17} className="shrink-0 text-slate-400" /></div><p className="mt-4 break-words text-2xl font-semibold tracking-tight text-slate-900">{value}</p><p className="mt-2 text-[11px] leading-5 text-slate-400">{detail}</p></Link>)}</section>
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-900">Recent orders</h2><Link href="/dashboard/orders" className="shrink-0 text-xs font-semibold text-rose-600">View all <span aria-hidden="true">→</span></Link></div>{orders.length === 0 ? <div className="py-12 text-center"><ShoppingBag size={28} className="mx-auto text-slate-300" /><p className="mt-3 text-sm text-slate-600">Your first order starts here.</p><p className="mt-2 text-xs text-slate-400">Publish and share your storefront to start receiving orders.</p></div> : <div className="mt-4 divide-y divide-slate-100">{orders.slice(0, 5).map(order => <Link key={order.id} href={`/dashboard/orders?search=${encodeURIComponent(order.order_number)}`} className="flex items-start justify-between gap-3 py-4"><div className="min-w-0"><p className="break-all font-mono text-[11px] font-semibold text-slate-800">{order.order_number}</p><p className="mt-1 truncate text-xs text-slate-500">{order.customer_name} · {new Date(order.created_at).toLocaleDateString('en-GB')}</p></div><div className="shrink-0 text-right"><p className="text-sm font-semibold text-slate-900">{money(order.total_minor)}</p><p className="mt-1 text-[10px] capitalize text-slate-500">{order.status.replaceAll('_', ' ')}</p></div></Link>)}</div>}</section>
      <div className="space-y-5"><section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Needs attention</h2><div className="mt-4 space-y-3"><Link href="/dashboard/orders?status=unfulfilled" className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-xs"><span>{toFulfill.length} orders awaiting fulfillment</span><ArrowRight size={15} /></Link><Link href="/dashboard/products?stock=low" className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900"><span>{lowStock.length} products with low-stock options</span><ArrowRight size={15} /></Link></div><p className="mt-3 text-[10px] leading-5 text-slate-400">Low stock means 5 or fewer units in a tracked, active product or option.</p></section><section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><Palette size={17} className="text-slate-500" /><h2 className="font-semibold text-slate-900">Make it your store</h2></div><p className="mt-3 text-xs leading-6 text-slate-500">Explore {storefrontThemes.length} themes, organize your collections, and refine your customer experience.</p><Link href="/dashboard/themes" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-rose-600">Explore themes <ArrowRight size={14} /></Link></section></div>
    </div>
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-slate-900">Your store setup</h2><span className="text-xs text-slate-400">{checklist.filter(step => step.done).length} of {checklist.length} complete</span></div><div className="mt-4 grid gap-3 lg:grid-cols-3">{checklist.map(step => <Link key={step.label} href={step.href} className="flex items-start gap-3 rounded-lg border border-slate-100 p-4">{step.done ? <CheckCircle2 size={18} className="shrink-0 text-emerald-600" /> : <Circle size={18} className="shrink-0 text-slate-300" />}<div className="min-w-0"><p className="text-xs font-semibold text-slate-800">{step.label}</p><p className="mt-1 break-words text-[11px] leading-5 text-slate-500">{step.detail}</p></div></Link>)}</div><Link href="/dashboard/settings" className="mt-4 inline-flex items-center gap-2 text-xs text-slate-500">Delivery fees: Dhaka {money(Number(shop.inside_dhaka_delivery_fee_minor))} · Outside {money(Number(shop.outside_dhaka_delivery_fee_minor))} <ArrowRight size={13} /></Link></section>
  </div>;
}

export default function DashboardOverviewPage(){const {shop}=useMerchant();return isOnlineStore(shop)?<StoreOverviewPage/>:<WebsiteOverview/>;}
