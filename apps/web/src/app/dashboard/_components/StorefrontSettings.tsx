'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { useMerchant } from '@/lib/merchant';
import { getStorefrontTheme } from '@/lib/storefront-themes';
import { ProductImage } from '@/components/ProductImage';
import { PageState } from './PageState';

export function StorefrontSettings() {
  const { shop, updateShop } = useMerchant();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [content, setContent] = useState({ banner_url:'', eyebrow:'', title:'', subtitle:'', button_text:'', image_alt:'', enabled:false, message:'', discount_percent:'0' });

  const load = async () => {
    setLoading(true); setLoadError('');
    try {
      const setting = await fetchApi<any>(`/shops/${shop.id}/theme-settings`);
      const preset = getStorefrontTheme(setting.theme_key);
      const hero = setting.settings?.hero || {};
      const legacyHero = setting.settings?.homepage_sections?.find((section: any) => section.type === 'hero' && section.enabled !== false);
      const promotion = setting.settings?.promotion || {};
      setPreviewImage(hero.image_url || preset.image);
      setContent({ banner_url:shop.banner_url || '', eyebrow:hero.eyebrow || preset.eyebrow, title:hero.title || legacyHero?.title || preset.title, subtitle:hero.subtitle || legacyHero?.subtitle || preset.subtitle, button_text:hero.button_text || 'Shop the collection', image_alt:hero.image_alt || '', enabled:promotion.enabled === true, message:promotion.message || '', discount_percent:String(promotion.discount_percent || 0) });
    } catch (error: any) { setLoadError(error.message || 'Banner settings could not be loaded.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [shop.id]);

  const save = async (event: FormEvent) => {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      if (content.enabled && (!/^\d{1,3}$/.test(content.discount_percent) || Number(content.discount_percent) > 100)) throw new Error('Enter a whole discount percentage from 0 to 100.');
      const response = await fetchApi<any>(`/shops/${shop.id}/storefront-content`, {
        method:'PUT', body:JSON.stringify({ banner_url:content.banner_url.trim() || null,
          hero:{eyebrow:content.eyebrow.trim(),title:content.title.trim(),subtitle:content.subtitle.trim(),button_text:content.button_text.trim(),image_alt:content.image_alt.trim()},
          promotion:{enabled:content.enabled,message:content.message.trim(),discount_percent:content.enabled ? Number(content.discount_percent) : 0},
        }),
      });
      updateShop({...shop,banner_url:response.banner_url}); setSaved(true);
    } catch (error: any) { setError(error.message || 'Banner and offers could not be saved.'); }
    finally { setSaving(false); }
  };

  return <section aria-labelledby="storefront-settings-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="storefront-settings-heading" className="text-lg font-semibold text-slate-900">Storefront banner & offers</h2>{shop.status === 'published' && <Link href={`/store/${shop.slug}`} target="_blank" className="text-xs font-semibold text-rose-600">View storefront ↗</Link>}</div>
    <p className="mt-2 text-xs leading-6 text-slate-500">Make the main banner your own, share an offer, and choose a discount for your store.</p>
    {loading || loadError ? <PageState loading={loading} error={loadError} onRetry={load} /> : <form onSubmit={save} onChange={() => setSaved(false)} className="mt-5 space-y-5">
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {saved && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Banner and offers saved.</p>}
      <label className="block text-xs font-semibold text-slate-700">Banner image URL<input type="url" maxLength={2048} placeholder="https://…" value={content.banner_url} onChange={event => setContent(current=>({...current,banner_url:event.target.value}))} className="mt-2 w-full rounded-lg border p-3 text-sm font-normal" /></label>
      <p className="text-[11px] text-slate-500">Use a hosted image, ideally 1600 × 900 pixels. Leave blank to use the theme image.</p>
      <ProductImage src={content.banner_url || previewImage} alt={content.image_alt || 'Storefront banner preview'} className="aspect-[16/7] w-full rounded-xl bg-stone-100 object-cover" />
      <div className="grid gap-4 sm:grid-cols-2">{[
        {key:'eyebrow',label:'Banner small heading',max:80}, {key:'title',label:'Banner headline',max:160},
        {key:'button_text',label:'Banner button text',max:60}, {key:'image_alt',label:'Banner image description',max:160},
      ].map(({key,label,max})=><label key={key} className="block text-xs font-semibold text-slate-700">{label}<input maxLength={max} value={content[key]} onChange={event=>setContent(current=>({...current,[key]:event.target.value}))} className="mt-2 w-full rounded-lg border p-3 text-sm font-normal" /></label>)}</div>
      <div><label htmlFor="banner-description" className="block text-xs font-semibold text-slate-700">Banner description</label><textarea id="banner-description" rows={3} maxLength={500} value={content.subtitle} onChange={event=>setContent(current=>({...current,subtitle:event.target.value}))} className="mt-2 w-full rounded-lg border p-3 text-sm font-normal" /></div>
      <fieldset className="space-y-4 rounded-xl border border-slate-200 p-4"><legend className="px-1 text-sm font-semibold text-slate-800">Offer & discount</legend>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={content.enabled} onChange={event=>setContent(current=>({...current,enabled:event.target.checked}))} />Enable offer</label>
        <label className="block text-xs font-semibold text-slate-700">Offer message<input maxLength={160} disabled={!content.enabled} placeholder="Discover our latest special prices" value={content.message} onChange={event=>setContent(current=>({...current,message:event.target.value}))} className="mt-2 w-full rounded-lg border p-3 text-sm font-normal disabled:bg-slate-50" /></label>
        <label className="block text-xs font-semibold text-slate-700">Store-wide discount (%)<input type="number" required min={0} max={100} step={1} disabled={!content.enabled} value={content.discount_percent} onChange={event=>setContent(current=>({...current,discount_percent:event.target.value}))} className="mt-2 w-full rounded-lg border p-3 text-sm font-normal disabled:bg-slate-50" /></label>
        <p className="text-[11px] leading-5 text-slate-500">Use 0% for an announcement only. Discounts apply automatically at checkout to current product and option prices, including existing sale prices. Delivery fees are excluded. Disable the offer to stop the discount.</p>
      </fieldset>
      <button disabled={saving} className="rounded-lg bg-slate-900 px-5 py-3 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'Saving banner & offers…' : 'Save banner & offers'}</button>
    </form>}
  </section>;
}
