'use client';

import {useEffect,useState,type FormEvent} from 'react';
import {fetchApi} from '@/lib/api';
import {useMerchant} from '@/lib/merchant';
import {anyTheme} from '@/lib/sites';

export function BrandControls({setting,onSaved}:{setting:any;onSaved:(updated:any)=>void}){
 const {shop}=useMerchant();
 const [color,setColor]=useState('#2358a8');const [font,setFont]=useState('theme');
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
 useEffect(()=>{setColor(setting.settings.brand?.primary_color||anyTheme(setting.theme_key)?.accent||'#2358a8');setFont(setting.settings.brand?.font_family||'theme');},[setting]);
 const save=async(event:FormEvent)=>{event.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');try{const updated=await fetchApi(`/shops/${shop.id}/theme-settings`,{method:'PUT',body:JSON.stringify({theme_key:setting.theme_key,settings_json:{...setting.settings,brand:{...setting.settings.brand,primary_color:color,font_family:font}}})});onSaved(updated);setNotice('Brand style saved.');}catch(error:any){setError(error.message);}finally{setBusy(false);}};
 return <section aria-labelledby="brand-style-heading" className="rounded-xl border bg-white p-5"><h2 id="brand-style-heading" className="text-sm font-semibold">Brand style</h2><p className="mt-2 text-xs leading-5 text-slate-500">Make the design your own. These settings update published pages immediately.</p>{notice&&<p role="status" className="mt-3 text-sm text-emerald-800">{notice}</p>}{error&&<p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}<form onSubmit={save} onChange={()=>setNotice('')} className="mt-4 flex flex-wrap items-end gap-4"><div><label htmlFor="brand-hex" className="block text-xs font-semibold text-slate-600">Brand color hex</label><div className="mt-2 flex gap-2"><input type="color" aria-label="Brand color" value={/^#[0-9a-f]{6}$/i.test(color)?color:'#2358a8'} onChange={event=>setColor(event.target.value)} className="h-11 w-12 rounded border bg-white p-1"/><input id="brand-hex" required pattern="#[0-9a-fA-F]{6}" maxLength={7} value={color} onChange={event=>setColor(event.target.value)} className="w-28 rounded-lg border px-3 py-3 font-mono text-xs"/></div></div><label className="block text-xs font-semibold text-slate-600">Heading typography<select aria-label="Heading typography" value={font} onChange={event=>setFont(event.target.value)} className="mt-2 block rounded-lg border bg-white px-3 py-3 text-xs"><option value="theme">Theme default</option><option value="sans">Modern sans serif</option><option value="serif">Editorial serif</option></select></label><button disabled={busy} className="rounded-lg bg-slate-900 px-4 py-3 text-xs font-semibold text-white disabled:opacity-40">{busy?'Saving…':'Save brand style'}</button></form></section>;
}
