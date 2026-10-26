from pathlib import Path
p=Path('apps/web/src/app/dashboard/settings/page.tsx');s=p.read_text()
s=s.replace("import { fetchApi } from '@/lib/api';", "import { fetchApi } from '@/lib/api';\nimport { useMerchant } from '@/lib/merchant';")
s=s.replace('  const [shop, setShop] = useState<any | null>(null);','  const { shop, updateShop } = useMerchant();')
s=s.replace("  const [address, setAddress] = useState('');", "  const [address, setAddress] = useState('');\n  const [logoUrl, setLogoUrl] = useState('');\n  const [bannerUrl, setBannerUrl] = useState('');")
start=s.index('  useEffect(() => {');end=s.index('  const handleSave',start)
s=s[:start]+'''  useEffect(() => {
    setName(shop.name || ''); setDescription(shop.description || '');
    setContactEmail(shop.contact_email || ''); setContactPhone(shop.contact_phone || '');
    setAddress(shop.address || ''); setLogoUrl(shop.logo_url || ''); setBannerUrl(shop.banner_url || '');
    setInsideFeeBdt(String(Number(shop.inside_dhaka_delivery_fee_minor) / 100));
    setOutsideFeeBdt(String(Number(shop.outside_dhaka_delivery_fee_minor) / 100));
  }, [shop.id]);

'''+s[end:]
s=s.replace('    if (!shop) return;','    if (!shop || saving) return;',1)
s=s.replace('      const payload = {', '''      const deliveryMinor = (value: string) => {
        if (!/^\\d+(?:\\.\\d{1,2})?$/.test(value)) throw new Error('Delivery fees must be nonnegative amounts with at most two decimal places.');
        const [whole, fraction = ''] = value.split('.');
        const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
        if (!Number.isSafeInteger(minor) || minor > 10000000) throw new Error('Delivery fees cannot exceed ৳100,000.');
        return String(minor);
      };
      const payload = {''')
s=s.replace('description.trim() || undefined','description.trim() || null').replace('contactEmail.trim() || undefined','contactEmail.trim() || null').replace('contactPhone.trim() || undefined','contactPhone.trim() || null').replace('address.trim() || undefined','address.trim() || null')
s=s.replace('String(Math.round(parseFloat(insideFeeBdt) * 100))','deliveryMinor(insideFeeBdt)').replace('String(Math.round(parseFloat(outsideFeeBdt) * 100))','deliveryMinor(outsideFeeBdt)')
s=s.replace('        address: address.trim() || null,', '        address: address.trim() || null,\n        logo_url: logoUrl.trim() || null, banner_url: bannerUrl.trim() || null,')
s=s.replace('      setShop(updated);','      updateShop(updated);')
s=s.replace('      setTimeout(() => setSuccess(false), 3000);','')
s=s.replace('{success && (\n          <div', '{success && (\n          <div role="status"').replace('{error && (\n          <div', '{error && (\n          <div role="alert"')
# Associate every existing input with its visible label.
labels=[('Store Name','store-name','type="text"'),('Store Description','store-description','rows={2}'),('Contact Email','store-email','type="email"'),('Support Phone (Customer Hotline)','store-phone','type="tel"'),('Store Physical Address','store-address','type="text"'),('Inside Dhaka Delivery Fee (৳)','inside-fee','type="number"'),('Outside Dhaka Delivery Fee (৳)','outside-fee','type="number"')]
for label,id,attr in labels:
 pos=s.index(label); before=s.rfind('<label',0,pos);s=s[:before]+s[before:].replace('<label ',f'<label htmlFor="{id}" ',1)
 pos=s.index(label); inp=s.index('<textarea' if attr=='rows={2}' else '<input',pos);s=s[:inp]+s[inp:].replace('<textarea' if attr=='rows={2}' else '<input',('<textarea' if attr=='rows={2}' else '<input')+f' id="{id}"',1)
s=s.replace('id="store-name"\n', 'id="store-name" minLength={2} maxLength={100}\n')
s=s.replace('step="1"','step="0.01" min="0" max="100000"')
s=s.replace('        {/* Delivery Rates */}', '''        <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-700">Store logo URL<input type="url" value={logoUrl} onChange={event => setLogoUrl(event.target.value)} placeholder="https://…" className="mt-2 w-full rounded-lg border p-3 text-sm font-normal" /></label><label className="text-xs font-semibold text-slate-700">Store banner URL<input type="url" value={bannerUrl} onChange={event => setBannerUrl(event.target.value)} placeholder="https://…" className="mt-2 w-full rounded-lg border p-3 text-sm font-normal" /></label></div>
        {/* Delivery Rates */}''')
p.write_text(s)
