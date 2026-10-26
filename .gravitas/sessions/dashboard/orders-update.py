from pathlib import Path
p=Path('apps/web/src/app/dashboard/orders/page.tsx');s=p.read_text()
s=s.replace("import { PageState } from '../_components/PageState';", "import { PageState } from '../_components/PageState';\nimport { Modal } from '../_components/Modal';")
s=s.replace('  AlertCircle\n', '  AlertCircle, X\n')
s=s.replace('  const [selectedOrder,', "  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);\n  const [selectedOrder,")
s=s.replace('useEffect(() => { loadData(); }, [shop.id]);', "useEffect(() => { const params = new URLSearchParams(window.location.search); setSearch(params.get('search') || ''); setStatusFilter(params.get('status') || ''); loadData(); }, [shop.id]);")
s=s.replace('    if (!shop) return;\n    try {\n      const updated', "    if (!shop || updatingOrder) return;\n    setUpdatingOrder(orderId); setActionError('');\n    try {\n      const updated")
s=s.replace("      setActionError(err.message || 'Failed to update order status');\n    }", "      setActionError(err.message || 'Failed to update order status');\n    } finally { setUpdatingOrder(null); }")
s=s.replace('const matchesStatus = !statusFilter || o.status === statusFilter;', "const matchesStatus = !statusFilter || (statusFilter === 'unfulfilled' ? ['pending', 'confirmed', 'processing', 'ready_to_ship'].includes(o.status) : o.status === statusFilter);")
s=s.replace('!search ||', '!search.trim() ||').replace('search.toLowerCase()', 'search.trim().toLowerCase()').replace('o.customer_phone.includes(search)', 'o.customer_phone.includes(search.trim())')
start=s.index('  const getStatusBadge =')
end=s.index('  if (loading || loadError)',start)
s=s[:start]+'''  const getStatusBadge = (status: string) => <span className={`inline-block rounded px-2 py-1 text-[10px] font-semibold capitalize ${status === 'delivered' ? 'bg-emerald-50 text-emerald-800' : ['cancelled', 'returned', 'refunded'].includes(status) ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>{status.replaceAll('_', ' ')}</span>;

'''+s[end:]
s=s.replace('placeholder="Search by Order #, Customer Name, or Phone..."','aria-label="Search orders"\n            placeholder="Search by Order #, Customer Name, or Phone..."')
s=s.replace('<select\n            value={statusFilter}', '<select aria-label="Filter order status"\n            value={statusFilter}')
s=s.replace('<option value="pending">Pending</option>', '<option value="unfulfilled">Awaiting fulfillment</option>\n            <option value="pending">Pending</option>\n            <option value="processing">Processing</option>',1)
s=s.replace('<option value="cancelled">Cancelled</option>', '<option value="cancelled">Cancelled</option>\n            <option value="returned">Returned</option>\n            <option value="refunded">Refunded</option>',1)
s=s.replace('      {/* Orders Table */}', '''      <div className="flex items-center justify-between gap-3 text-xs text-slate-500"><span>{filteredOrders.length} of {orders.length} orders</span>{(search || statusFilter) && <button onClick={() => { setSearch(''); setStatusFilter(''); }} className="font-semibold underline">Clear filters</button>}</div>
      {/* Orders Table */}''')
s=s.replace('                      {ord.order_number}\n', '                      <button type="button" onClick={() => setSelectedOrder(ord)} className="text-left underline decoration-slate-300 underline-offset-4">{ord.order_number}</button>\n')
s=s.replace('<select\n                        value={ord.status}', '<select aria-label={`Fulfillment status for ${ord.order_number}`} disabled={!!updatingOrder}\n                        value={ord.status}')
# Attach the existing snapshot details to the order-number action.
marker='    </div>\n  );\n}'
assert marker in s
s=s.replace(marker,'''      {selectedOrder && <Modal titleId="order-dialog-title" onClose={() => setSelectedOrder(null)}>
        <header className="flex items-center justify-between gap-3 border-b p-5"><div><h2 id="order-dialog-title" className="font-semibold text-slate-900">Order details</h2><p className="mt-1 break-all font-mono text-[10px] text-slate-500">{selectedOrder.order_number}</p></div><button type="button" aria-label="Close order details" onClick={() => setSelectedOrder(null)} className="shrink-0 rounded p-2"><X size={20} /></button></header>
        <div className="space-y-5 p-5 text-sm"><div className="flex flex-wrap items-center gap-3">{getStatusBadge(selectedOrder.status)}<span className="text-xs text-slate-500">{selectedOrder.payment_method.toUpperCase()} · {selectedOrder.payment_status}</span></div>
          <section aria-label="Delivery details"><h3 className="font-semibold text-slate-900">Customer & delivery</h3><p className="mt-2">{selectedOrder.customer_name}</p><a href={`tel:${selectedOrder.customer_phone}`} className="text-slate-600 underline">{selectedOrder.customer_phone}</a><p className="mt-2 break-words text-slate-500">{selectedOrder.shipping_address}, {selectedOrder.shipping_city}</p>{selectedOrder.customer_note && <p className="mt-2 break-words text-xs text-slate-500">Customer note: {selectedOrder.customer_note}</p>}</section>
          <section aria-label="Ordered items"><h3 className="font-semibold text-slate-900">Items</h3><div className="mt-2 divide-y">{selectedOrder.items.map((item: any) => <div key={item.id} className="flex justify-between gap-4 py-3"><div className="min-w-0"><p className="break-words text-xs">{item.product_name_snapshot}</p><p className="mt-1 text-[10px] text-slate-500">Qty {item.quantity}{item.sku_snapshot ? ` · ${item.sku_snapshot}` : ''}</p></div><span className="shrink-0 text-xs">৳{(item.line_total_minor / 100).toLocaleString('en-BD')}</span></div>)}</div></section>
          <dl className="space-y-2 border-t pt-4 text-xs">{[['Subtotal', selectedOrder.subtotal_minor], ['Delivery', selectedOrder.delivery_fee_minor], ['Discount', -selectedOrder.discount_minor], ['Total', selectedOrder.total_minor]].map(([label, amount]) => <div key={label} className="flex justify-between"><dt>{label}</dt><dd className="font-semibold">৳{(Number(amount) / 100).toLocaleString('en-BD')}</dd></div>)}</dl>
        </div>
      </Modal>}
    </div>
  );
}''')
p.write_text(s)
