'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ExternalLink, LogOut, RefreshCw, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { fetchApi } from '@/lib/api';
import { money, businessDate, businessTime } from '@/lib/business';
import { publicSitePath } from '@/lib/sites';
import { Modal } from '@/components/Modal';

function eventDetails(value: string | null) {
  try { const details=JSON.parse(value || '{}'); return Object.entries(details).filter(([,value])=>['string','number','boolean'].includes(typeof value)).map(([key,value])=>`${key.replaceAll('_',' ')}: ${String(value)}`).join(' · '); }
  catch { return 'Details unavailable'; }
}

export default function PlatformAdminPage(){
  const router=useRouter();const {user,loading,logout}=useAuth();
  const [metrics,setMetrics]=useState<any>(null);
  const [shops,setShops]=useState<any[]>([]);
  const [payments,setPayments]=useState<any[]>([]);
  const [logs,setLogs]=useState<any[]>([]);
  const [fetching,setFetching]=useState(true);
  const [loadError,setLoadError]=useState('');
  const [search,setSearch]=useState('');
  const [status,setStatus]=useState('');
  const [action,setAction]=useState<any|null>(null);
  const [reason,setReason]=useState('');const [reference,setReference]=useState('');
  const [actionError,setActionError]=useState('');const [acting,setActing]=useState(false);
  const [notice,setNotice]=useState('');const [logoutError,setLogoutError]=useState('');
  useEffect(()=>{if(!loading && (!user || user.role!=='platform_admin'))router.replace(user?'/dashboard':'/login');},[user,loading,router]);
  const load=async()=>{
    if(user?.role!=='platform_admin')return;
    setFetching(true);setLoadError('');
    try{
      const [metrics,shops,payments,logs]=await Promise.all([fetchApi('/admin/metrics'),fetchApi<any[]>('/admin/shops'),fetchApi<any[]>('/admin/payments'),fetchApi<any[]>('/admin/audit-logs')]);
      setMetrics(metrics);setShops(shops);setPayments(payments);setLogs(logs);
    }catch(error:any){setLoadError(error.message || 'Platform data could not be loaded.');}
    finally{setFetching(false);}
  };
  useEffect(()=>{load();},[user]);
  const openAction=(value:any)=>{setAction(value);setReason('');setReference('');setActionError('');setNotice('');};
  const submit=async(event:FormEvent)=>{
    event.preventDefault();if(!action || acting)return;setActing(true);setActionError('');
    try{
      if(action.kind==='shop')await fetchApi(`/admin/shops/${action.id}/status`,{method:'PATCH',body:JSON.stringify({status:action.status,reason:reason.trim()})});
      else await fetchApi(`/admin/payments/${action.id}/${action.kind}`,{method:'POST',body:JSON.stringify({provider_reference:reference.trim(),reason:reason.trim()})});
      setNotice(action.kind==='shop'?'Store status updated.':action.kind==='verify'?'Payment receipt confirmed.':'Payment request rejected.');setAction(null);await load();
    }catch(error:any){setActionError(error.message || 'The action could not be completed.');}
    finally{setActing(false);}
  };
  const signOut=async()=>{setLogoutError('');try{await logout();}catch{setLogoutError('Sign out failed. Please try again.');}};
  if(loading || !user || user.role!=='platform_admin')return <div role="status" className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-300">Checking administrator access…</div>;
  const filtered=shops.filter(shop=>(!status || shop.status===status) && `${shop.name} ${shop.slug}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <div className="platform-ui admin-shell min-h-screen bg-slate-950 font-sans text-slate-100">
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900"><div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3"><Link href="/admin" className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={22} className="text-rose-400"/>Arise administration</Link><div className="flex items-center gap-4"><Link href="/dashboard" className="text-xs text-slate-400">Merchant view</Link><button onClick={signOut} className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs"><LogOut size={14}/>Sign out</button></div></div></header>
    <main className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-slate-500">Platform operations</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Platform overview</h1><p className="mt-2 text-sm text-slate-400">Review stores, payment requests and privileged activity.</p></div><button disabled={fetching} aria-label="Refresh platform data" onClick={load} className="rounded-lg border border-slate-700 p-3 disabled:opacity-40"><RefreshCw size={17}/></button></div>
      {logoutError && <p role="alert" className="rounded-lg border border-rose-800 bg-rose-950 p-4 text-sm text-rose-200">{logoutError}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-800 bg-emerald-950 p-4 text-sm text-emerald-200">{notice}</p>}
      {fetching ? <div role="status" className="flex min-h-56 items-center justify-center gap-3 text-sm text-slate-400"><Loader2 size={20} className="animate-spin"/>Loading platform data…</div> : loadError ? <div role="alert" className="rounded-xl border border-rose-800 bg-rose-950 p-5 text-sm text-rose-200">{loadError}<button onClick={load} className="mt-3 block rounded-lg border border-rose-700 px-4 py-2 font-semibold">Try again</button></div> : <>
        <section aria-label="Platform metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
          {label:'Websites',value:metrics.total_shops,detail:`${metrics.published_shops} published · ${metrics.total_products} products`},
          {label:'Orders',value:metrics.total_orders,detail:'All saved order statuses'},
          {label:'Delivered order value',value:money(metrics.total_revenue_minor),detail:'Includes delivery and saved discounts'},
          {label:'Active-plan monthly value',value:money(metrics.mrr_estimate_minor),detail:'Normalized plan value, not bank receipts'},
        ].map(metric=><article key={metric.label} className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-5"><h2 className="text-xs text-slate-400">{metric.label}</h2><p className="mt-3 break-words text-2xl font-semibold">{metric.value}</p><p className="mt-2 text-[10px] leading-5 text-slate-500">{metric.detail}</p></article>)}</section>
        <section className="min-w-0 space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Websites</h2><p className="mt-1 text-xs text-slate-400">Moderation preserves the store’s catalog and orders.</p></div><span className="text-xs text-slate-500">{filtered.length} of {shops.length}</span></div><div className="flex flex-col gap-3 sm:flex-row"><input aria-label="Search websites" maxLength={100} value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search by name or URL" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm"/><select aria-label="Filter store status" value={status} onChange={event=>setStatus(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm"><option value="">All statuses</option>{['draft','published','suspended','archived'].map(status=><option key={status} value={status}>{status}</option>)}</select></div>
          <div className="hidden overflow-x-auto sm:block"><table className="w-full text-left text-xs"><thead className="border-b border-slate-800 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="p-3">Store</th><th className="p-3">Storefront</th><th className="p-3">Status</th><th className="p-3">Created</th><th className="p-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-800">{filtered.length===0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No websites match these filters.</td></tr>}{filtered.map(shop=><tr key={shop.id}><td className="p-3 font-medium">{shop.name}</td><td className="p-3 font-mono text-[10px] text-slate-400">{shop.status==='published'?<Link href={publicSitePath(shop)} target="_blank" className="inline-flex items-center gap-2 text-indigo-300">{publicSitePath(shop)}<ExternalLink size={12}/></Link>:publicSitePath(shop)}</td><td className="p-3 capitalize">{shop.status}</td><td className="whitespace-nowrap p-3 text-slate-400">{businessDate(shop.created_at)}</td><td className="p-3 text-right">{['suspended','archived'].includes(shop.status)?<button onClick={()=>openAction({kind:'shop',id:shop.id,name:shop.name,status:'draft'})} className="whitespace-nowrap rounded-lg bg-emerald-900 px-3 py-2 text-emerald-100">Restore to draft</button>:<button onClick={()=>openAction({kind:'shop',id:shop.id,name:shop.name,status:'suspended'})} className="whitespace-nowrap rounded-lg bg-rose-900 px-3 py-2 text-rose-100">Suspend website</button>}</td></tr>)}</tbody></table></div>
          <div className="divide-y divide-slate-800 sm:hidden">{filtered.length===0?<p className="py-5 text-sm text-slate-400">No websites match these filters.</p>:filtered.map(shop=><article key={shop.id} className="space-y-3 py-4">
            <div className="flex items-start justify-between gap-3"><h3 className="min-w-0 break-words text-sm font-medium">{shop.name}</h3><span className="shrink-0 rounded bg-slate-800 px-2 py-1 text-[10px] capitalize text-slate-300">{shop.status}</span></div>
            {shop.status==='published'?<Link href={publicSitePath(shop)} target="_blank" className="flex items-center gap-2 break-all text-xs text-indigo-300">{publicSitePath(shop)}<ExternalLink size={12} className="shrink-0"/></Link>:<p className="break-all text-xs text-slate-400">{publicSitePath(shop)}</p>}
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] text-slate-400">Created {businessDate(shop.created_at)}</p><button onClick={()=>openAction({kind:'shop',id:shop.id,name:shop.name,status:['suspended','archived'].includes(shop.status)?'draft':'suspended'})} className="rounded-lg border border-slate-700 px-3 py-2 text-xs">{['suspended','archived'].includes(shop.status)?'Restore to draft':'Suspend website'}</button></div>
          </article>)}</div>
        </section>
        <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-semibold">Subscription payment requests</h2><p className="text-xs leading-6 text-slate-400">Confirm a receipt only after checking that the payment arrived in the bank or provider account.</p>{payments.length===0?<p className="py-4 text-sm text-slate-500">No pending payment requests.</p>:payments.map(payment=><article key={payment.id} className="space-y-3 rounded-lg border border-slate-700 p-4"><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-medium">{shops.find(shop=>shop.id===payment.shop_id)?.name || 'Store record unavailable'}</p><p className="text-sm">{money(payment.amount_minor)} · {payment.billing_interval}</p></div><p className="break-all font-mono text-[10px] text-slate-500">Request {payment.id}</p><div className="flex flex-wrap gap-2"><button onClick={()=>openAction({kind:'verify',id:payment.id})} className="rounded-lg bg-emerald-800 px-3 py-2 text-xs">Confirm received payment</button><button onClick={()=>openAction({kind:'reject',id:payment.id})} className="rounded-lg border border-rose-800 px-3 py-2 text-xs text-rose-200">Reject request</button></div></article>)}</section>
        <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-semibold">Recent audit activity</h2><p className="text-xs text-slate-500">Latest 10 privileged events · Asia/Dhaka</p>{logs.length===0?<p className="py-4 text-sm text-slate-500">No privileged activity recorded yet.</p>:<div className="divide-y divide-slate-800">{logs.slice(0,10).map(log=><article key={log.id} className="min-w-0 space-y-2 py-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="break-words text-xs font-medium text-rose-300">{log.action.replaceAll('.',' · ').replaceAll('_',' ')}</p><time className="text-[10px] text-slate-500">{businessTime(log.created_at)}</time></div><p className="break-words text-[11px] leading-6 text-slate-400">{eventDetails(log.details_json)}</p></article>)}</div>}</section>
      </>}
    </main>
    {action && <Modal titleId="admin-action-title" onClose={()=>setAction(null)} preventClose={acting}><div className="rounded-2xl bg-slate-900 p-6 text-slate-100"><header className="flex items-start justify-between gap-3"><h2 id="admin-action-title" className="font-semibold">{action.kind==='shop'?(action.status==='suspended'?'Suspend website':'Restore website to draft'):action.kind==='verify'?'Confirm received payment':'Reject payment request'}</h2><button type="button" disabled={acting} aria-label="Close administration action" onClick={()=>setAction(null)} className="p-1"><X size={20}/></button></header>{action.name && <p className="mt-2 break-words text-sm text-slate-400">{action.name}</p>}<p className="mt-3 text-xs leading-6 text-slate-400">{action.kind==='shop'?(action.status==='suspended'?'Public website access will stop. Pages, products and orders stay saved.':'The restriction will be lifted. The owner can choose when to publish again.'):'This records your manual review. Verify the actual receipt before confirming payment.'}</p><form onSubmit={submit} className="mt-5 space-y-4">{actionError && <p role="alert" className="rounded-lg bg-rose-950 p-3 text-xs text-rose-200">{actionError}</p>}{action.kind!=='shop' && <label className="block text-xs font-medium">Receipt or transaction reference<input required minLength={6} maxLength={255} value={reference} onChange={event=>setReference(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm"/></label>}<div><label htmlFor="admin-action-reason" className="block text-xs font-medium">Reason for this action</label><textarea id="admin-action-reason" required minLength={5} maxLength={1000} rows={3} value={reason} onChange={event=>setReason(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm"/></div><div className="flex gap-3"><button disabled={acting} className="rounded-lg bg-rose-600 px-4 py-3 text-xs font-semibold disabled:opacity-40">{acting?'Saving…':'Confirm action'}</button><button type="button" disabled={acting} onClick={()=>setAction(null)} className="rounded-lg border border-slate-700 px-4 py-3 text-xs">Cancel</button></div></form></div></Modal>}
  </div>;
}
