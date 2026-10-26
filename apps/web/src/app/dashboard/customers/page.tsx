'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Search, X, ArrowRight } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useMerchant } from '@/lib/merchant';
import { businessTime, money } from '@/lib/business';
import { Modal } from '@/components/Modal';
import { PageState } from '../_components/PageState';

export default function CustomersPage() {
  const {shop}=useMerchant();
  const [draftSearch,setDraftSearch]=useState('');
  const [criteria,setCriteria]=useState({query:'',page:1});
  const [data,setData]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [detail,setDetail]=useState<any>(null);
  const [detailError,setDetailError]=useState('');
  const [detailVersion,setDetailVersion]=useState(0);

  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');
    const query=new URLSearchParams({search:criteria.query,page:String(criteria.page),page_size:'25'});
    fetchApi(`/shops/${shop.id}/customers?${query}`,{signal:controller.signal})
      .then(value=>{if(!controller.signal.aborted)setData(value);})
      .catch(error=>{if(!controller.signal.aborted)setError(error.message || 'Customers could not be loaded.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[shop.id,criteria]);
  useEffect(()=>{
    if(!selectedId)return;
    const controller=new AbortController();setDetailError('');
    fetchApi(`/shops/${shop.id}/customers/${selectedId}`,{signal:controller.signal})
      .then(value=>{if(!controller.signal.aborted)setDetail(value);})
      .catch(error=>{if(!controller.signal.aborted)setDetailError(error.message || 'Customer history could not be loaded.');});
    return ()=>controller.abort();
  },[shop.id,selectedId,detailVersion]);

  return <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
    <header><p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Know your customers</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Customers</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Find customer contacts and review their order history with your store. Delivered value includes delivery and saved discounts.</p></header>
    <form onSubmit={event=>{event.preventDefault();setCriteria({query:draftSearch.trim(),page:1});}} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3"><label className="flex min-w-0 flex-1 items-center gap-2 text-slate-400"><Search size={18}/><span className="sr-only">Search customers</span><input maxLength={100} value={draftSearch} onChange={event=>setDraftSearch(event.target.value)} placeholder="Name, phone or email" className="w-full min-w-0 p-2 text-sm text-slate-900 outline-none" /></label><button className="rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white">Search</button></form>
    {loading || error ? <PageState loading={loading} error={error} onRetry={()=>setCriteria({...criteria})}/> : <>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>{data.total} customers{criteria.query ? ` matching “${criteria.query}”` : ''}</span>{criteria.query && <button onClick={()=>{setDraftSearch('');setCriteria({query:'',page:1});}} className="underline">Clear search</button>}</div>
      {data.items.length===0 ? <div className="rounded-xl border border-slate-200 bg-white p-12 text-center"><Users size={30} className="mx-auto text-slate-300"/><h2 className="mt-4 font-semibold">{criteria.query ? 'No customers match your search.' : 'Your customer list starts with your first order.'}</h2><p className="mt-2 text-sm text-slate-500">Customer contacts are saved when an order is placed.</p></div> : <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="hidden grid-cols-[2fr_1fr_1fr_1fr] gap-4 bg-slate-50 px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400 lg:grid"><span>Customer</span><span>Orders</span><span>Delivered value</span><span>History</span></div>{data.items.map(customer=><button type="button" key={customer.id} onClick={()=>{setDetail(null);setDetailError('');setSelectedId(customer.id);}} aria-label={`View ${customer.name} history`} className="grid w-full gap-4 border-t border-slate-100 p-5 text-left transition hover:bg-slate-50 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]"><div className="min-w-0"><p className="break-words text-sm font-semibold">{customer.name}</p><p className="mt-1 text-xs text-slate-500">{customer.phone}</p>{customer.email && <p className="mt-1 truncate text-xs text-slate-400">{customer.email}</p>}</div><div className="text-xs"><p>{customer.total_orders} {customer.total_orders===1?'order':'orders'}</p><p className="mt-2 text-slate-400">{customer.delivered_orders} delivered</p></div><p className="text-sm font-semibold">{money(customer.delivered_value_minor)}</p><span className="flex items-center gap-2 text-xs font-semibold text-rose-600">View history <ArrowRight size={14}/></span></button>)}</div>}
      <div className="flex items-center justify-between gap-3 text-xs"><button disabled={criteria.page===1} onClick={()=>setCriteria({...criteria,page:criteria.page-1})} className="rounded-lg border bg-white px-4 py-2 disabled:opacity-40">Previous</button><span className="text-slate-500">Page {criteria.page} of {Math.max(1,Math.ceil(data.total/data.page_size))}</span><button disabled={criteria.page*data.page_size>=data.total} onClick={()=>setCriteria({...criteria,page:criteria.page+1})} className="rounded-lg border bg-white px-4 py-2 disabled:opacity-40">Next</button></div>
    </>}
    {selectedId && <Modal titleId="customer-history-title" onClose={()=>setSelectedId(null)}><header className="flex items-center justify-between border-b p-5"><h2 id="customer-history-title" className="font-semibold">Customer history</h2><button aria-label="Close customer history" onClick={()=>setSelectedId(null)} className="p-2"><X size={20}/></button></header>{!detail || detailError ? <PageState loading={!detailError} error={detailError} onRetry={()=>setDetailVersion(value=>value+1)}/> : <div className="space-y-5 p-5"><section><h3 className="break-words text-xl font-semibold">{detail.name}</h3><a href={`tel:${detail.phone}`} className="mt-2 inline-block text-sm text-slate-500 underline">{detail.phone}</a>{detail.email && <p className="mt-1 break-all text-xs text-slate-400">{detail.email}</p>}</section><div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-xs"><p>{detail.total_orders} total orders</p><p>{detail.delivered_orders} delivered</p><p>{detail.cancelled_orders} cancelled</p><p>{detail.returned_orders} returned/refunded</p></div><p className="text-sm font-semibold">Delivered value: {money(detail.delivered_value_minor)}</p><section><h3 className="text-sm font-semibold">Recent orders</h3>{detail.orders.length===0 ? <p className="mt-3 text-sm text-slate-500">No orders linked to this customer.</p> : <div className="mt-2 divide-y">{detail.orders.map(order=><Link key={order.id} href={`/dashboard/orders?search=${encodeURIComponent(order.order_number)}`} className="flex items-start justify-between gap-3 py-3 text-xs"><div className="min-w-0"><p className="break-all font-mono">{order.order_number}</p><p className="mt-1 text-[10px] text-slate-400">{businessTime(order.created_at)} · Dhaka</p></div><div className="shrink-0 text-right"><p className="font-semibold">{money(order.total_minor)}</p><p className="mt-1 capitalize text-slate-500">{order.status.replaceAll('_',' ')}</p></div></Link>)}</div>}</section>{detail.has_more_orders && <p className="text-xs text-slate-500">Showing the latest 50 orders.</p>}<Link href={`/dashboard/orders?search=${encodeURIComponent(detail.phone)}`} className="inline-flex items-center gap-2 text-xs font-semibold text-rose-600">View all customer orders <ArrowRight size={14}/></Link><p className="text-[10px] leading-5 text-slate-400">Contact details come from the first checkout. Each order keeps its own delivery details. History shown here belongs only to this store.</p></div>}</Modal>}
  </div>;
}
