'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Printer } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useMerchant } from '@/lib/merchant';
import { businessTime, money } from '@/lib/business';
import { PageState } from '../../../_components/PageState';
import './print.css';

export default function InvoicePage({params}:{params:Promise<{orderId:string}>}){
  const {orderId}=use(params);
  const {shop}=useMerchant();
  const [order,setOrder]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [version,setVersion]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');setOrder(null);
    fetchApi(`/shops/${shop.id}/orders/${orderId}`,{signal:controller.signal})
      .then(value=>{if(!controller.signal.aborted)setOrder(value);})
      .catch(error=>{if(!controller.signal.aborted)setError(error.message || 'Invoice could not be loaded.');})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[shop.id,orderId,version]);
  if(loading || error)return <PageState loading={loading} error={error} onRetry={()=>setVersion(value=>value+1)}/>;
  return <div className="mx-auto max-w-4xl p-5 sm:p-8">
    <div className="invoice-actions mb-5 flex flex-wrap items-center justify-between gap-3"><Link href={`/dashboard/orders?search=${encodeURIComponent(order.order_number)}`} className="text-xs font-medium text-slate-500 underline">Back to order</Link><button onClick={()=>window.print()} className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-xs font-semibold text-white"><Printer size={16}/>Print invoice</button></div>
    <article className="order-invoice space-y-7 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-10">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b border-slate-200 pb-6"><div className="min-w-0"><h1 className="text-2xl font-semibold tracking-tight">Order invoice</h1><h2 className="mt-3 break-words text-lg font-semibold">{shop.name}</h2>{shop.address && <p className="mt-2 max-w-md break-words text-xs leading-6 text-slate-500">{shop.address}</p>}{shop.contact_phone && <p className="mt-1 text-xs text-slate-500">{shop.contact_phone}</p>}{shop.contact_email && <p className="mt-1 break-all text-xs text-slate-500">{shop.contact_email}</p>}</div><div className="min-w-0 text-xs text-slate-500"><p className="break-all font-mono font-semibold text-slate-900">{order.order_number}</p><p className="mt-2">{businessTime(order.created_at)} · Asia/Dhaka</p><p className="mt-2 capitalize">Order: {order.status.replaceAll('_',' ')}</p><p className="mt-1 uppercase">{order.payment_method} · {order.payment_status}</p></div></header>
      <section aria-label="Invoice customer"><h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Deliver to</h2><p className="mt-3 break-words text-sm font-semibold">{order.customer_name}</p><p className="mt-1 text-xs text-slate-500">{order.customer_phone}</p>{order.customer_email && <p className="mt-1 break-all text-xs text-slate-500">{order.customer_email}</p>}<p className="mt-2 break-words text-xs leading-6 text-slate-500">{order.shipping_address}<br/>{order.shipping_city}</p></section>
      <table className="w-full table-fixed text-left text-xs"><thead className="border-y border-slate-200 bg-slate-50"><tr><th className="w-[43%] py-3 pr-2">Item</th><th className="w-[10%] py-3 text-center">Qty</th><th className="w-[23%] py-3 text-right">Unit price</th><th className="w-[24%] py-3 text-right">Amount</th></tr></thead><tbody>{order.items.map(item=><tr key={item.id} className="border-b border-slate-100"><td className="break-words py-4 pr-2"><p className="font-medium">{item.product_name_snapshot}</p>{item.variant_title_snapshot && <p className="mt-1 text-[11px] text-slate-500">{item.variant_title_snapshot}</p>}{item.sku_snapshot && <p className="mt-1 text-[10px] text-slate-400">SKU: {item.sku_snapshot}</p>}</td><td className="py-4 text-center">{item.quantity}</td><td className="break-words py-4 text-right">{money(item.unit_price_minor)}</td><td className="break-words py-4 text-right font-medium">{money(item.line_total_minor)}</td></tr>)}</tbody></table>
      <dl className="ml-auto max-w-sm space-y-3 text-sm">{[['Product subtotal',order.subtotal_minor],['Store discount',-order.discount_minor],['Delivery',order.delivery_fee_minor],['Total payable',order.total_minor]].map(([label,value])=><div key={label} className={`flex justify-between gap-4 ${label==='Total payable'?'border-t border-slate-200 pt-4 text-base font-semibold':''}`}><dt className="text-slate-500">{label}</dt><dd>{money(Number(value))}</dd></div>)}</dl>
      {order.customer_note && <section className="border-t pt-5"><h2 className="text-xs font-semibold">Customer note</h2><p className="mt-2 break-words text-xs leading-6 text-slate-500">{order.customer_note}</p></section>}
      <footer className="border-t pt-5 text-[11px] leading-6 text-slate-400">Thank you for shopping with {shop.name}.<br/>Amounts and items reflect the saved order. Payment status: {order.payment_status}.</footer>
    </article>
  </div>;
}
