'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, CheckCircle2, ExternalLink, Loader2, Palette } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useMerchant } from '@/lib/merchant';
import { getStorefrontTheme, themeCategories } from '@/lib/storefront-themes';
import { isOnlineStore } from '@/lib/sites';
import { WebsiteThemes } from '../_components/WebsiteThemes';
import { ProductImage } from '@/components/ProductImage';

function StoreThemesPage() {
  const { shop } = useMerchant();
  const [themes, setThemes] = useState<any[]>([]);
  const [currentSetting, setCurrentSetting] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [category, setCategory] = useState('All themes');

  const loadData = async () => {
    setLoading(true); setError('');
    try {
      const [library, setting] = await Promise.all([fetchApi<any[]>('/themes'), fetchApi(`/shops/${shop.id}/theme-settings`)]);
      setThemes(library); setCurrentSetting(setting);
    } catch (error: any) { setError(error.message || 'Themes could not be loaded.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadData(); }, [shop.id]);

  const applyTheme = async (theme: any) => {
    if (!shop || saving) return;
    setSaving(theme.theme_key); setError(''); setNotice('');
    try {
      const defaults = JSON.parse(theme.configuration_schema);
      const previousDefaults = getStorefrontTheme(currentSetting?.theme_key);
      const current = currentSetting?.settings || {};
      const legacyColors: Record<string, string> = { 'fashion-modern': '#18181b', 'general-store': '#047857', 'tech-cosmetics': '#0f172a' };
      const defaultColors = [previousDefaults.accent, legacyColors[currentSetting?.theme_key]];
      const customBrand = { ...(current.brand || {}) };
      if (defaultColors.includes(customBrand.primary_color)) delete customBrand.primary_color;
      const settings = { ...defaults, ...(current.promotion ? { promotion: current.promotion } : {}), brand: { ...defaults.brand, ...customBrand } };
      // Carry only merchant-authored fields, not the previous theme's default imagery/copy.
      const previousHero: Record<string, string> = { eyebrow: previousDefaults.eyebrow, title: previousDefaults.title, subtitle: previousDefaults.subtitle, image_url: previousDefaults.image };
      const customHero = Object.fromEntries(Object.entries(current.hero || {}).filter(([field, value]) => value !== previousHero[field]));
      settings.hero = { ...defaults.hero, ...customHero };
      const updated = await fetchApi(`/shops/${shop.id}/theme-settings`, { method: 'PUT', body: JSON.stringify({ theme_key: theme.theme_key, settings_json: settings }) });
      setCurrentSetting(updated); setNotice(`${theme.name} is now applied to ${shop.name}.`);
    } catch (error: any) { setError(error.message || 'The theme could not be applied.'); }
    finally { setSaving(null); }
  };

  const groups = ['All themes', ...themeCategories.filter(group => themes.some(theme => getStorefrontTheme(theme.theme_key).category === group))];
  const filtered = themes.filter(theme => category === 'All themes' || getStorefrontTheme(theme.theme_key).category === category);
  return <div className="mx-auto max-w-7xl space-y-7 p-5 sm:p-8">
    <div className="rounded-2xl border border-stone-200 bg-[#f6f3ed] p-6 sm:p-9">
      <div className="mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500"><Palette size={15} /> Made for your kind of store</div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><h1 className="text-3xl font-semibold tracking-tight text-slate-900">A new look.<br />The same business.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">Find the storefront that feels like your brand. Preview every detail, then make it yours. Your products, stock, and orders stay right where they are.</p></div>{shop?.status === 'published' && <Link href={`/store/${shop.slug}`} target="_blank" className="inline-flex shrink-0 items-center gap-3 self-start rounded-lg bg-slate-900 px-4 py-3 text-xs text-white sm:self-auto">Visit your store <ExternalLink size={14} /></Link>}</div>
    </div>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}<button onClick={loadData} className="ml-3 underline">Try again</button></div>}
    {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={17} />{notice}</div>}
    {!loading && !shop && !error && <p className="rounded-xl border p-4 text-sm">Create a store before applying a theme. <Link href="/register" className="underline">Create a store</Link></p>}
    <div id="theme-library" className="flex scroll-mt-24 flex-wrap items-center gap-2" role="group" aria-label="Theme categories">{groups.map(group => <button key={group} onClick={() => setCategory(group)} aria-label={group} aria-pressed={category === group} className={`rounded-full border px-4 py-2 text-xs ${category === group ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{group}<span aria-hidden="true" className="ml-2 opacity-60">{group === 'All themes' ? themes.length : themes.filter(theme => getStorefrontTheme(theme.theme_key).category === group).length}</span></button>)}<span className="ml-auto text-xs text-slate-400">{filtered.length} designs{category !== 'All themes' ? ` in ${category}` : ` across ${groups.length - 1} categories`}</span></div>
    {loading ? <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" />Loading your theme library…</div>  : <div className="space-y-10">{groups.filter(group => group !== 'All themes' && (category === 'All themes' || category === group)).map(group => <section key={group} aria-label={`${group} theme designs`} className="space-y-5"><header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Made for {group.toLowerCase()}</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{group} themes</h2><p className="mt-2 text-xs text-slate-500">{themes.filter(theme => getStorefrontTheme(theme.theme_key).category === group).length} distinct designs. Preview a layout, then make it yours.</p></div>{category === 'All themes' && <button type="button" aria-label={`Browse ${group} themes`} onClick={() => { setCategory(group); document.getElementById('theme-library')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600">Explore category <ArrowRight size={13}/></button>}</header><div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">{filtered.filter(theme => getStorefrontTheme(theme.theme_key).category === group).map(theme => {
      const preset = getStorefrontTheme(theme.theme_key);
      const active = currentSetting?.theme_key === theme.theme_key;
      return <article key={theme.id} data-theme-key={theme.theme_key} className={`overflow-hidden rounded-xl border bg-white ${active ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'}`}>
        <Link href={`/themes/${theme.theme_key}`} target="_blank" className="group relative block aspect-[16/11] overflow-hidden border-b bg-stone-100" aria-label={`Preview ${theme.name}`}><ProductImage src={theme.preview_image_url} alt={`${theme.name} storefront preview`} className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.025]" /><span className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[10px] text-slate-900 shadow-sm">Explore demo <ArrowUpRight size={12} /></span>{active && <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-[10px] text-white"><Check size={11} />Your current theme</span>}</Link>
        <div className="space-y-4 p-5"><div><span className="text-[9px] font-medium uppercase tracking-[0.15em] text-slate-400">{preset.category}</span><h3 className="mt-1.5 text-lg font-semibold text-slate-900">{theme.name}</h3><p className="mt-2 min-h-12 text-xs leading-6 text-slate-500">{theme.description}</p></div><div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border border-black/10" style={{ background: preset.accent }} /><span className="h-3 w-3 rounded-full border border-black/10 bg-[#f5f2ec]" /><span className="h-3 w-3 rounded-full border border-black/10 bg-white" /><span className="ml-2 text-[10px] text-slate-400">Responsive · COD ready · Product quick view</span></div><div className="flex gap-2 border-t border-slate-100 pt-4"><Link href={`/themes/${theme.theme_key}`} target="_blank" className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs text-slate-600">Preview <ArrowUpRight size={13} /></Link><button onClick={() => applyTheme(theme)} disabled={active || !shop || !!saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5 text-xs text-white disabled:bg-slate-100 disabled:text-slate-400">{saving === theme.theme_key ? <Loader2 size={13} className="animate-spin" /> : active ? <Check size={13} /> : <ArrowRight size={13} />}{active ? 'Currently active' : saving === theme.theme_key ? 'Applying…' : 'Apply theme'}</button></div></div>
      </article>;
    })}</div></section>)}</div>}
  </div>;
}

export default function ThemesPage(){const {shop}=useMerchant();return isOnlineStore(shop)?<StoreThemesPage/>:<WebsiteThemes/>;}
