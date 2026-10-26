from pathlib import Path
base=Path('apps/web/src/app/dashboard')
requests={
 'products':'''      const [prods, cats] = await Promise.all([
        fetchApi<any[]>(`/shops/${shop.id}/products`),
        fetchApi<any[]>(`/shops/${shop.id}/categories`),
      ]);
      setProducts(prods); setCategories(cats);''',
 'categories':'''      setCategories(await fetchApi<any[]>(`/shops/${shop.id}/categories`));''',
 'orders':'''      setOrders(await fetchApi<any[]>(`/shops/${shop.id}/orders`));''',
 'domains':'''      setDomains(await fetchApi<any[]>(`/shops/${shop.id}/domains`));''',
 'subscription':'''      const [sub, paymentList, planList] = await Promise.all([
        fetchApi<any>(`/shops/${shop.id}/subscription`),
        fetchApi<any[]>(`/shops/${shop.id}/payments`),
        fetchApi<any[]>('/plans'),
      ]);
      setSubscription(sub); setPayments(paymentList); setPlans(planList);''',
}
for page, body in requests.items():
 p=base/page/'page.tsx';s=p.read_text()
 s=s.replace("import { fetchApi } from '@/lib/api';", "import { fetchApi } from '@/lib/api';\nimport { useMerchant } from '@/lib/merchant';\nimport { PageState } from '../_components/PageState';")
 assert "  const [shop, setShop] = useState<any | null>(null);" in s
 s=s.replace("  const [shop, setShop] = useState<any | null>(null);", "  const { shop } = useMerchant();\n  const [loadError, setLoadError] = useState('');\n  const [actionError, setActionError] = useState('');")
 start=s.index('  const loadData = async () => {')
 end=s.index('  const handle',start) if page!='products' else s.index('  const openProduct',start)
 replacement=f'''  const loadData = async () => {{
    setLoading(true); setLoadError('');
    try {{
{body}
    }} catch (error: any) {{ setLoadError(error.message || 'This page could not be loaded.'); }}
    finally {{ setLoading(false); }}
  }};

  useEffect(() => {{ loadData(); }}, [shop.id]);

'''
 s=s[:start]+replacement+s[end:]
 marker='  return (\n    <div className='
 assert marker in s
 s=s.replace(marker,"  if (loading || loadError) return <PageState loading={loading} error={loadError} onRetry={loadData} />;\n\n"+marker,1)
 marker='mx-auto space-y-6">'
 s=s.replace(marker, marker+'\n      {actionError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{actionError}</p>}',1)
 s=s.replace('alert(err.message ||', 'setActionError(err.message ||')
 p.write_text(s)
