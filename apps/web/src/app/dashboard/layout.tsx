'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { fetchApi } from '@/lib/api';
import { isOnlineStore, publicSitePath } from '@/lib/sites';
import { MerchantContext } from '@/lib/merchant';
import { PageState } from './_components/PageState';
import { Store, ShoppingBag, Package, FolderTree, Palette, Globe, CreditCard, Settings, ExternalLink, LogOut, Menu, X, Users, BarChart3, FileText, PenLine } from 'lucide-react';

const navItems = [
  { name: 'Overview', href: '/dashboard', icon: Store },
  { name: 'Pages', href: '/dashboard/pages', icon: FileText },
  { name: 'Blog', href: '/dashboard/blog', icon: PenLine },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingBag },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Products', href: '/dashboard/products', icon: Package },
  { name: 'Categories', href: '/dashboard/categories', icon: FolderTree },
  { name: 'Themes', href: '/dashboard/themes', icon: Palette },
  { name: 'Custom Domains', href: '/dashboard/domains', icon: Globe },
  { name: 'Subscription', href: '/dashboard/subscription', icon: CreditCard },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const userId = user?.id;
  const userRole = user?.role;
  const [shops, setShops] = useState<any[]>([]);
  const [shop, setShop] = useState<any | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useRef<HTMLDialogElement>(null);
  const [hasSetup, setHasSetup] = useState(false);

  const loadShops = useCallback(async () => {
    if (!userId) return;
    setFetching(true); setError('');
    try {
      const [data, draft] = await Promise.all([fetchApi<any[]>('/shops'), userRole === 'merchant' ? fetchApi('/setup') : Promise.resolve(null)]);
      setHasSetup(!!draft);
      const active = data.find(store => store.slug === localStorage.getItem('arise_active_shop')) || data[0] || null;
      setShops(data); setShop(active);
      if (active) localStorage.setItem('arise_active_shop', active.slug);
    } catch (error: any) { setError(error.message || 'Your stores could not be loaded.'); }
    finally { setFetching(false); }
  }, [userId, userRole]);

  useEffect(() => { if (!loading && !user) router.replace('/login'); }, [user, loading, router]);
  useEffect(() => { loadShops(); }, [loadShops]);
  useEffect(() => { if (userRole === 'merchant' && !fetching && !error && !shops.length) router.replace('/setup'); }, [userRole, fetching, error, shops.length, router]);
  useEffect(() => { menu.current?.close(); setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [menuOpen]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeMobileMenu = () => { if (desktop.matches) { menu.current?.close(); setMenuOpen(false); } };
    desktop.addEventListener('change', closeMobileMenu);
    return () => desktop.removeEventListener('change', closeMobileMenu);
  }, []);

  const updateShop = (updated: any) => { setShop(updated); setShops(current => current.map(store => store.id === updated.id ? updated : store)); };
  const selectShop = (id: string) => {
    const selected = shops.find(store => store.id === id);
    if (!selected || selected.id === shop?.id) return;
    if (document.querySelector('#merchant-content [data-unsaved="true"]') && !window.confirm('Discard unsaved changes and switch websites?')) return;
    localStorage.setItem('arise_active_shop', selected.slug);
    if(pathname.startsWith('/dashboard/pages/')) { setShop(selected); router.push('/dashboard/pages'); }
    else window.location.reload();
  };
  const signOut = async () => {
    if(document.querySelector('#merchant-content [data-unsaved="true"]')&&!window.confirm('Discard unsaved changes and sign out?'))return;
    setLoggingOut(true); setLogoutError('');
    try { await logout(); }
    catch { setLogoutError('Sign out failed. Please try again.'); setLoggingOut(false); }
  };


  if (loading || !user) return <PageState loading onRetry={loadShops} />;
  const visibleNav=navItems.filter(item=>isOnlineStore(shop||{})||!['Orders','Customers','Reports','Products','Categories'].includes(item.name));
  const NavLink=pathname.startsWith('/dashboard/pages/')?'a':Link;
  const sidebar = <>
    <div className="border-b border-slate-800 p-5">
      <NavLink href="/dashboard" className="flex items-center gap-2 pr-7 text-base font-semibold"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 font-bold">A</span>Arise</NavLink>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Your workspace</p>
      {shops.length > 1 ? <select aria-label="Active website" value={shop?.id || ''} onChange={event => selectShop(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs">{shops.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}</select> : <p className="mt-2 truncate text-sm font-medium">{shop?.name || 'Your new website'}</p>}
      {user.role === 'merchant' && <NavLink href={hasSetup ? "/setup" : "/setup?new=1"} className="mt-3 inline-block text-xs text-slate-400 hover:text-white">{hasSetup ? "Resume website setup" : "+ Create another website"}</NavLink>}
      {shop && <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px]"><span className={`rounded-full px-2 py-1 font-semibold capitalize ${shop.status === 'published' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>{shop.status}</span><span className="break-all text-slate-400">{publicSitePath(shop)}</span></div>}
    </div>
    <nav aria-label="Merchant navigation" className="flex-1 space-y-1 p-3">{visibleNav.map(({ name, href, icon: Icon }) => <NavLink key={href} href={href} aria-current={(pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))) ? 'page' : undefined} onClick={() => { menu.current?.close(); setMenuOpen(false); }} className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${(pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))) ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}><Icon size={17} /><span>{name}</span>{(pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))) && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />}</NavLink>)}</nav>
    <div className="space-y-3 border-t border-slate-800 p-4">
      {shop?.status === 'published' && <Link href={publicSitePath(shop)} target="_blank" className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2.5 text-xs font-medium text-slate-200">View {isOnlineStore(shop)?'live store':'website'} <ExternalLink size={14} /></Link>}
      {logoutError && <p role="alert" className="text-xs text-rose-300">{logoutError}</p>}
      <div className="flex items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-medium text-slate-200">{user.name}</p><p className="mt-1 truncate text-[10px] text-slate-500">Website owner</p></div><button type="button" aria-label="Sign out" disabled={loggingOut} onClick={signOut} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50"><LogOut size={17} /></button></div>
    </div>
  </>;

  return <div className="platform-ui merchant-dashboard min-h-screen bg-[#f6f7f9] md:flex">
    <a href="#merchant-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded focus:bg-white focus:p-3">Skip to dashboard content</a>
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 md:hidden"><button type="button" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => { menu.current?.showModal(); setMenuOpen(true); }} className="rounded-lg border border-slate-200 p-2"><Menu size={20} /></button><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{shop?.name || 'Arise'}</p><p className="text-[10px] text-slate-500">{navItems.find(item => item.href === pathname || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/')))?.name}</p></div></header>
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto bg-slate-900 text-white md:flex">{sidebar}</aside>
    <dialog ref={menu} aria-label="Dashboard navigation" onClose={() => setMenuOpen(false)} className="m-0 h-dvh max-h-none w-72 max-w-[calc(100vw-2rem)] border-0 bg-slate-900 p-0 text-white backdrop:bg-slate-950/60 md:hidden"><button type="button" aria-label="Close navigation" onClick={() => menu.current?.close()} className="absolute right-3 top-5 rounded p-1 text-slate-300"><X size={20} /></button><div className="flex min-h-full flex-col">{sidebar}</div></dialog>
    <main id="merchant-content" className="min-w-0 flex-1">
      {fetching || (error && !shop) ? <PageState loading={fetching} error={error} onRetry={loadShops} /> : !shop ? <PageState loading onRetry={loadShops} /> : <MerchantContext.Provider value={{ shop, updateShop }}>{children}</MerchantContext.Provider>}
    </main>
  </div>;
}
