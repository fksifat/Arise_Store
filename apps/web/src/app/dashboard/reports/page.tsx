'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Download, ShoppingBag, Truck, Users } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useMerchant } from '@/lib/merchant';
import { businessDate, money } from '@/lib/business';
import { downloadCSV } from '@/lib/csv';
import { PageState } from '../_components/PageState';

const recentRange=(days:number)=>({start:businessDate(new Date(Date.now()-(days-1)*86400000)),end:businessDate()});

export default function ReportsPage(){
  const {shop}=useMerchant();
  const [dates,setDates]=useState(()=>recentRange(30));
  const [range,setRange]=useState(()=>recentRange(30));
  const [report,setReport]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');setReport(null);
    const query=new URLSearchParams({start_date:range.start,end_date:range.end});
    fetchApi(`/shops/${shop.id}/reports?${query}`,{signal:controller.signal})
      .then(value=>{if(!controller.signal.aborted)setReport(value);})
      .catch(error=>{if(!controller.signal.aborted)setError(error.message || 'Reports could not be loaded.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[shop.id,range]);
  const exportReport=()=>{
    if(!report)return;
    downloadCSV(`${shop.slug}-report-${report.start_date}-${report.end_date}.csv`,[
      ['Date (Asia/Dhaka)','Orders placed','Delivered order value (BDT)'],
      ...report.daily.map(day=>[day.date,day.orders,(day.delivered_value_minor/100).toFixed(2)]),
    ]);
  };
  const maximum=report ? Math.max(1,...report.daily.map(day=>day.delivered_value_minor)) : 1;
  const points=report?.daily.map((day,index)=>`${20+index/Math.max(1,report.daily.length-1)*680},${150-day.delivered_value_minor/maximum*120}`).join(' ');

  return <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Understand your business</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Sales reports</h1><p className="mt-2 text-sm text-slate-500">Real order activity, with Bangladesh business dates.</p></div><button disabled={!report || loading} onClick={exportReport} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs font-semibold disabled:opacity-40"><Download size={15}/>Export daily report</button></header>
    <section aria-label="Report period" className="rounded-xl border border-slate-200 bg-white p-5"><form onSubmit={event=>{event.preventDefault();setRange({...dates});}} className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-xs font-medium text-slate-600">Report start date<input required type="date" value={dates.start} max={dates.end} onChange={event=>setDates({...dates,start:event.target.value})} className="mt-2 w-full rounded-lg border p-2.5 text-sm"/></label><label className="min-w-0 flex-1 text-xs font-medium text-slate-600">Report end date<input required type="date" value={dates.end} min={dates.start} onChange={event=>setDates({...dates,end:event.target.value})} className="mt-2 w-full rounded-lg border p-2.5 text-sm"/></label><button className="rounded-lg bg-slate-900 px-5 py-3 text-xs font-semibold text-white">Apply dates</button></form><div className="mt-4 flex flex-wrap gap-2">{[7,30,90].map(days=><button key={days} onClick={()=>{const next=recentRange(days);setDates(next);setRange(next);}} className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] text-slate-500">Last {days} days</button>)}<span className="self-center text-[10px] text-slate-400">Asia/Dhaka · Up to 366 days per report</span></div></section>
    {loading || error ? <PageState loading={loading} error={error} onRetry={()=>setRange({...range})}/> : report && <>
      <p className="text-xs leading-6 text-slate-500">{report.start_date} through {report.end_date}. Grouped by order placement date, using each order’s current status. Delivered value includes delivery and saved discounts.</p>
      <section aria-label="Report metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[
        {label:'Orders placed',value:report.metrics.total_orders,icon:ShoppingBag},
        {label:'Delivered order value',value:money(report.metrics.delivered_value_minor),icon:Truck},
        {label:'Average delivered order',value:money(report.metrics.average_delivered_minor),icon:BarChart3},
        {label:'Customer phone numbers',value:report.metrics.customer_count,icon:Users},
      ].map(({label,value,icon:Icon})=><article key={label} aria-label={label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex items-start justify-between gap-2 text-xs text-slate-500"><h2>{label}</h2><Icon size={17} className="shrink-0 text-slate-400"/></div><p className="mt-4 break-words text-2xl font-semibold">{value}</p></article>)}</section>
      {report.metrics.total_orders===0 && <p role="status" className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">No orders were placed in this date range.</p>}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Daily delivered order value</h2><span className="text-xs text-slate-400">Highest day: {money(maximum===1 && !report.daily.some(day=>day.delivered_value_minor) ? 0 : maximum)}</span></div><svg viewBox="0 0 720 180" role="img" aria-label="Daily delivered order value chart" className="mt-5 w-full"><line x1="20" y1="150" x2="700" y2="150" stroke="#e2e8f0"/><line x1="20" y1="90" x2="700" y2="90" stroke="#f1f5f9"/><line x1="20" y1="30" x2="700" y2="30" stroke="#f1f5f9"/>{report.daily.length>1 && <polyline points={points} fill="none" stroke="#e11d48" strokeWidth="2.5"/>}{report.daily.map((day,index)=><circle key={day.date} cx={20+index/Math.max(1,report.daily.length-1)*680} cy={150-day.delivered_value_minor/maximum*120} r={report.daily.length>90?1.5:3} fill="#e11d48"><title>{day.date}: {money(day.delivered_value_minor)} · {day.orders} orders</title></circle>)}</svg><div className="flex justify-between text-[10px] text-slate-400"><span>{report.start_date}</span><span>{report.end_date}</span></div><details className="mt-5 text-xs"><summary className="cursor-pointer font-medium text-slate-500">View daily figures</summary><div className="mt-3 max-h-72 overflow-auto"><table className="w-full text-left"><thead><tr><th className="p-2">Date</th><th className="p-2">Orders</th><th className="p-2 text-right">Delivered value</th></tr></thead><tbody>{report.daily.map(day=><tr key={day.date} className="border-t"><td className="p-2">{day.date}</td><td className="p-2">{day.orders}</td><td className="p-2 text-right">{money(day.delivered_value_minor)}</td></tr>)}</tbody></table></div></details></section>
      <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Delivered value breakdown</h2><dl className="mt-4 space-y-3 text-sm">{[['Products after discounts',report.metrics.delivered_products_minor],['Delivery fees',report.metrics.delivered_delivery_minor],['Total delivered value',report.metrics.delivered_value_minor],['Discounts included',report.metrics.delivered_discounts_minor]].map(([label,value])=><div key={label} className="flex justify-between gap-3"><dt className="text-slate-500">{label}</dt><dd className="font-medium">{money(Number(value))}</dd></div>)}</dl><p className="mt-4 text-[11px] leading-5 text-slate-400">Cancelled, returned and refunded orders are excluded from delivered values. These are order records, not bank settlement reports.</p></section><section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Order status breakdown</h2><div className="mt-4 grid grid-cols-2 gap-3">{Object.entries(report.statuses).map(([status,count])=><div key={status} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 text-xs"><span className="capitalize text-slate-500">{status.replaceAll('_',' ')}</span><strong>{String(count)}</strong></div>)}</div></section></div>
      <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Top products in delivered orders</h2><p className="mt-2 text-xs text-slate-500">Ranked by units. Item value is before order-wide discounts and excludes delivery.</p>{report.top_products.length===0 ? <p className="py-8 text-center text-sm text-slate-400">No delivered products in this period.</p> : <div className="mt-4 divide-y">{report.top_products.map((product,index)=><div key={`${product.name}-${index}`} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm"><div className="min-w-0"><p className="break-words font-medium">{product.name}</p><p className="mt-1 text-xs text-slate-400">{product.units} {product.units===1?'unit':'units'} delivered</p></div><span className="font-semibold">{money(product.item_value_minor)}</span></div>)}</div>}</section>
    </>}
  </div>;
}
