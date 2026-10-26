'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { downloadCSV } from '@/lib/csv';
import { businessDate } from '@/lib/business';
import { fetchApi } from '@/lib/api';
import { useMerchant } from '@/lib/merchant';
import { PageState } from '../_components/PageState';
import { Modal } from '@/components/Modal';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Eye, 
  Check, 
  Clock, 
  Truck, 
  CheckCircle2, 
  XCircle,
  AlertCircle, X
} from 'lucide-react';

export default function OrdersPage() {
  const { shop } = useMerchant();
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true); setLoadError('');
    try {
      setOrders(await fetchApi<any[]>(`/shops/${shop.id}/orders`));
    } catch (error: any) { setLoadError(error.message || 'This page could not be loaded.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { const params = new URLSearchParams(window.location.search); setSearch(params.get('search') || ''); setStatusFilter(params.get('status') || ''); loadData(); }, [shop.id]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (!shop || updatingOrder) return;
    setUpdatingOrder(orderId); setActionError('');
    try {
      const updated = await fetchApi<any>(`/shops/${shop.id}/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(updated);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to update order status');
    } finally { setUpdatingOrder(null); }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = !statusFilter || (statusFilter === 'unfulfilled' ? ['pending', 'confirmed', 'processing', 'ready_to_ship'].includes(o.status) : o.status === statusFilter);
    const matchesSearch = !search.trim() || 
      o.order_number.toLowerCase().includes(search.trim().toLowerCase()) ||
      o.customer_name.toLowerCase().includes(search.trim().toLowerCase()) ||
      o.customer_phone.includes(search.trim());
    const day = businessDate(o.created_at);
    return matchesStatus && matchesSearch && (!startDate || day >= startDate) && (!endDate || day <= endDate);
  });

  const getStatusBadge = (status: string) => <span className={`inline-block rounded px-2 py-1 text-[10px] font-semibold capitalize ${status === 'delivered' ? 'bg-emerald-50 text-emerald-800' : ['cancelled', 'returned', 'refunded'].includes(status) ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>{status.replaceAll('_', ' ')}</span>;

  if (loading || loadError) return <PageState loading={loading} error={loadError} onRetry={loadData} />;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {actionError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{actionError}</p>}
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">Customer Orders</h1>
        <p className="text-xs text-slate-500">Track and fulfill Cash on Delivery orders from customers</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            aria-label="Search orders"
            placeholder="Search by Order #, Customer Name, or Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs outline-none bg-transparent"
          />
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select aria-label="Filter order status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs outline-none bg-transparent"
          >
            <option value="">All Order Statuses</option>
            <option value="unfulfilled">Awaiting fulfillment</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="confirmed">Confirmed</option>
            <option value="ready_to_ship">Ready to Ship</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="returned">Returned</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-slate-500"><span>{filteredOrders.length} of {orders.length} orders</span>{(search || statusFilter || startDate || endDate) && <button onClick={() => { setSearch(''); setStatusFilter(''); setStartDate(''); setEndDate(''); }} className="font-semibold underline">Clear filters</button>}</div>
      <div className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-xs text-slate-500">Orders from<input type="date" aria-label="Orders from" value={startDate} max={endDate || undefined} onChange={event=>setStartDate(event.target.value)} className="mt-2 w-full rounded-lg border bg-white p-2.5 text-sm"/></label><label className="min-w-0 flex-1 text-xs text-slate-500">Orders through<input type="date" aria-label="Orders through" value={endDate} min={startDate || undefined} onChange={event=>setEndDate(event.target.value)} className="mt-2 w-full rounded-lg border bg-white p-2.5 text-sm"/></label><button disabled={filteredOrders.length===0} onClick={()=>downloadCSV(`${shop.slug}-orders-${businessDate()}.csv`,[
        ['Order number','Placed date (Asia/Dhaka)','Customer','Phone','Email','City','Address','Status','Payment status','Product subtotal (BDT)','Discount (BDT)','Delivery (BDT)','Total (BDT)'],
        ...filteredOrders.map(order=>[order.order_number,businessDate(order.created_at),order.customer_name,order.customer_phone,order.customer_email,order.shipping_city,order.shipping_address,order.status,order.payment_status,(order.subtotal_minor/100).toFixed(2),(order.discount_minor/100).toFixed(2),(order.delivery_fee_minor/100).toFixed(2),(order.total_minor/100).toFixed(2)]),
      ])} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs font-semibold disabled:opacity-40">Export current view</button></div>
      <p className="text-[10px] text-slate-400">Dates use Asia/Dhaka. Select an order number for details and a printable invoice.</p>
      {startDate && endDate && startDate > endDate && <p role="alert" className="text-xs text-rose-700">The start date must be on or before the end date.</p>}
      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Total (BDT)</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Fulfillment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No orders found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <button type="button" onClick={() => setSelectedOrder(ord)} className="text-left underline decoration-slate-300 underline-offset-4">{ord.order_number}</button>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {businessDate(ord.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{ord.customer_name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{ord.customer_phone}</p>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      ৳{(ord.total_minor / 100).toLocaleString('en-BD')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="uppercase text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                        {ord.payment_method} ({ord.payment_status})
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(ord.status)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <select aria-label={`Fulfillment status for ${ord.order_number}`} disabled={!!updatingOrder}
                        value={ord.status}
                        onChange={(e) => handleUpdateStatus(ord.id, e.target.value)}
                        className="py-1 px-2 border rounded text-xs bg-white text-slate-800 font-medium outline-none focus:ring-1 focus:ring-slate-900"
                      >
                        <option value={ord.status}>{ord.status.replace(/_/g, ' ')}</option>
                        {(ord.allowed_statuses || []).map((status: string) => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedOrder && <Modal titleId="order-dialog-title" onClose={() => setSelectedOrder(null)}>
        <header className="flex items-center justify-between gap-3 border-b p-5"><div><h2 id="order-dialog-title" className="font-semibold text-slate-900">Order details</h2><p className="mt-1 break-all font-mono text-[10px] text-slate-500">{selectedOrder.order_number}</p></div><button type="button" aria-label="Close order details" onClick={() => setSelectedOrder(null)} className="shrink-0 rounded p-2"><X size={20} /></button></header>
        <div className="space-y-5 p-5 text-sm"><Link href={`/dashboard/orders/${selectedOrder.id}/invoice`} target="_blank" className="inline-flex rounded-lg border px-4 py-2 text-xs font-semibold">Open printable invoice ↗</Link><div className="flex flex-wrap items-center gap-3">{getStatusBadge(selectedOrder.status)}<span className="text-xs text-slate-500">{selectedOrder.payment_method.toUpperCase()} · {selectedOrder.payment_status}</span></div>
          <section aria-label="Delivery details"><h3 className="font-semibold text-slate-900">Customer & delivery</h3><p className="mt-2">{selectedOrder.customer_name}</p><a href={`tel:${selectedOrder.customer_phone}`} className="text-slate-600 underline">{selectedOrder.customer_phone}</a><p className="mt-2 break-words text-slate-500">{selectedOrder.shipping_address}, {selectedOrder.shipping_city}</p>{selectedOrder.customer_note && <p className="mt-2 break-words text-xs text-slate-500">Customer note: {selectedOrder.customer_note}</p>}</section>
          <section aria-label="Ordered items"><h3 className="font-semibold text-slate-900">Items</h3><div className="mt-2 divide-y">{selectedOrder.items.map((item: any) => <div key={item.id} className="flex justify-between gap-4 py-3"><div className="min-w-0"><p className="break-words text-xs">{item.product_name_snapshot}</p>{item.variant_title_snapshot && <p className="mt-1 text-xs text-slate-500">{item.variant_title_snapshot}</p>}<p className="mt-1 text-[10px] text-slate-500">Qty {item.quantity}{item.sku_snapshot ? ` · ${item.sku_snapshot}` : ''}</p></div><span className="shrink-0 text-xs">৳{(item.line_total_minor / 100).toLocaleString('en-BD')}</span></div>)}</div></section>
          <dl className="space-y-2 border-t pt-4 text-xs">{[['Subtotal', selectedOrder.subtotal_minor], ['Delivery', selectedOrder.delivery_fee_minor], ['Discount', -selectedOrder.discount_minor], ['Total', selectedOrder.total_minor]].map(([label, amount]) => <div key={label} className="flex justify-between"><dt>{label}</dt><dd className="font-semibold">৳{(Number(amount) / 100).toLocaleString('en-BD')}</dd></div>)}</dl>
        </div>
      </Modal>}
    </div>
  );
}

