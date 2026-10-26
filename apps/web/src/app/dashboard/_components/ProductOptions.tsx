'use client';

import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { fetchApi } from '@/lib/api';
import { useMerchant } from '@/lib/merchant';
import { parsePrice } from '@/lib/pricing';
import { money } from '@/lib/business';

export function ProductOptions({product,onClose,onUpdated}:{product:any;onClose:()=>void;onUpdated:(product:any)=>void}){
  const {shop}=useMerchant();
  const [editing,setEditing]=useState<any|null>(null);
  const [title,setTitle]=useState('');
  const [sku,setSku]=useState('');
  const [price,setPrice]=useState('');
  const [stock,setStock]=useState('0');
  const [active,setActive]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const choose=(variant:any|null)=>{setEditing(variant);setTitle(variant?.title || '');setSku(variant?.sku || '');setPrice(variant?.price_minor != null ? (variant.price_minor/100).toFixed(2) : '');setStock(String(variant?.stock_quantity || 0));setActive(variant?.is_active ?? true);setError('');setNotice('');};
  const reload=async()=>{
    try {const current=await fetchApi<any>(`/shops/${shop.id}/products/${product.id}`);onUpdated(current);choose(current.variants.find(variant=>variant.id===editing?.id) || null);setNotice('Options refreshed. Review the stock before saving.');}
    catch(error:any){setError(error.message || 'Options could not be loaded.');}
  };
  const save=async(event:FormEvent)=>{
    event.preventDefault();if(saving)return;setSaving(true);setError('');setNotice('');
    try{
      const quantity=Number(stock);
      if(!Number.isInteger(quantity)||quantity<0||quantity>1000000000)throw new Error('Enter a valid whole stock quantity.');
      const data={title:title.trim(),sku:sku.trim() || null,price_minor:price.trim() ? parsePrice(price) : null,is_active:active,
        ...(!editing || quantity!==editing.stock_quantity ? {stock_quantity:quantity,...(editing?{expected_stock_quantity:editing.stock_quantity}:{})} : {}),
      };
      const saved=await fetchApi<any>(`/shops/${shop.id}/products/${product.id}/variants${editing?'/'+editing.id:''}`,{method:editing?'PATCH':'POST',body:JSON.stringify(data)});
      onUpdated({...product,variants:editing?product.variants.map(variant=>variant.id===saved.id?saved:variant):[...product.variants,saved]});
      choose(null);setNotice('Product option saved.');
    }catch(error:any){setError(error.message || 'Option could not be saved.');}
    finally{setSaving(false);}
  };
  return <Modal titleId="options-title" onClose={onClose} preventClose={saving}>
    <header className="flex items-start justify-between gap-3 border-b p-5"><div className="min-w-0"><h2 id="options-title" className="font-semibold">Product options</h2><p className="mt-1 break-words text-xs text-slate-500">{product.name}</p></div><button type="button" aria-label="Close product options" disabled={saving} onClick={onClose} className="p-2"><X size={20}/></button></header>
    <div className="space-y-5 p-5">
      <p className="rounded-lg bg-slate-50 p-3 text-[11px] leading-5 text-slate-500">Use an option for each size, color or edition. Active options use their own stock; base stock ({product.stock_quantity}) is used again if all options are turned off. Up to 100 options per product.</p>
      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}<button type="button" onClick={reload} className="mt-2 block font-semibold underline">Reload options</button></div>}
      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</p>}
      <div className="max-h-52 space-y-2 overflow-auto">{product.variants.map(variant=><button key={variant.id} type="button" disabled={saving} aria-label={`Edit option ${variant.title}`} onClick={()=>choose(variant)} className={`flex w-full items-start justify-between gap-3 rounded-lg border p-3 text-left text-xs ${editing?.id===variant.id?'border-slate-800':'border-slate-200'}`}><div className="min-w-0"><p className="break-words font-semibold">{variant.title}</p><p className="mt-1 text-slate-500">{variant.is_active?'Active':'Hidden'} · {variant.stock_quantity} in stock</p></div><span className="shrink-0">{money(variant.price_minor ?? product.price_minor)}</span></button>)}</div>
      <form onSubmit={save} className="space-y-4 border-t pt-5"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">{editing?'Edit option':'Add an option'}</h3>{editing && <button type="button" disabled={saving} onClick={()=>choose(null)} className="text-xs underline">Add another option</button>}</div>
        <label className="block text-xs font-semibold text-slate-700">Option name<input required maxLength={100} placeholder="e.g. Medium · Blue" value={title} onChange={event=>setTitle(event.target.value)} className="mt-2 w-full rounded-lg border p-2.5 text-sm font-normal"/></label>
        <label className="block text-xs font-semibold text-slate-700">Option SKU<input maxLength={100} value={sku} onChange={event=>setSku(event.target.value)} className="mt-2 w-full rounded-lg border p-2.5 text-sm font-normal"/></label>
        <div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-slate-700">Option price (BDT)<input type="number" min="0" max="1000000000" step="0.01" placeholder="Use product price" value={price} onChange={event=>setPrice(event.target.value)} className="mt-2 w-full rounded-lg border p-2.5 text-sm font-normal"/></label><label className="text-xs font-semibold text-slate-700">Option stock<input required type="number" min="0" max="1000000000" step="1" value={stock} onChange={event=>setStock(event.target.value)} className="mt-2 w-full rounded-lg border p-2.5 text-sm font-normal"/></label></div>
        <p className="text-[10px] text-slate-400">Leave the option price blank to use the product price.</p>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={active} onChange={event=>setActive(event.target.checked)}/>Available to shoppers</label>
        <button disabled={saving || (!editing && product.variants.length>=100)} className="rounded-lg bg-slate-900 px-5 py-3 text-xs font-semibold text-white disabled:opacity-40">{saving?'Saving option…':'Save option'}</button>
      </form>
    </div>
  </Modal>;
}
