from pathlib import Path
base=Path('apps/web/src/app/dashboard')
# Product list and editor retain stock concurrency behavior.
p=base/'products/page.tsx';s=p.read_text().replace("import { PageState } from '../_components/PageState';", "import { PageState } from '../_components/PageState';\nimport { Modal } from '../_components/Modal';")
s=s.replace("  const [search, setSearch] = useState('');", "  const [search, setSearch] = useState('');\n  const [stockFilter, setStockFilter] = useState(false);\n  const [productStatus, setProductStatus] = useState('active');")
s=s.replace('useEffect(() => { loadData(); }, [shop.id]);', "useEffect(() => { setStockFilter(new URLSearchParams(window.location.search).get('stock') === 'low'); loadData(); }, [shop.id]);")
s=s.replace('    setEditingProduct(product);', "    setEditingProduct(product); setProductStatus(product?.status || 'active');")
s=s.replace("...(!editingProduct ? { status: 'active' } : {}),", 'status: productStatus,')
s=s.replace("`${p.name} ${p.sku || ''}`.toLowerCase().includes(search.toLowerCase())", "`${p.name} ${p.sku || ''}`.toLowerCase().includes(search.trim().toLowerCase()) && (!stockFilter || (p.status === 'active' && p.track_inventory && (p.variants?.some((v: any) => v.is_active) ? p.variants.some((v: any) => v.is_active && v.stock_quantity <= 5) : p.stock_quantity <= 5)))")
s=s.replace('placeholder="Search products by name or SKU..."','aria-label="Search products"\n          placeholder="Search products by name or SKU..."')
s=s.replace('      {/* Products Table */}', '''      <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={stockFilter} onChange={event => setStockFilter(event.target.checked)} />Only low-stock products (5 or fewer units in any active option)</label>
      <p className="text-xs text-slate-400">{filteredProducts.length} of {products.length} products</p>
      {/* Products Table */}''')
s=s.replace('title="Archive Product"','aria-label={`Archive ${p.name}`}\n                          title="Archive Product"')
s=s.replace('<div role="dialog" aria-modal="true" aria-labelledby="product-dialog-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">', '<Modal titleId="product-dialog-title" onClose={() => setIsModalOpen(false)}>')
s=s.replace('max-w-lg w-full overflow-hidden my-8 border','max-w-lg w-full overflow-hidden border')
assert '        </div>\n      )}' in s
s=s.replace('        </div>\n      )}', '        </Modal>\n      )}',1)
marker='            <form onSubmit={handleCreateProduct} className="p-6 space-y-4">'
s=s.replace(marker,marker+'''\n              <label className="block text-xs font-semibold text-slate-700">Product visibility<select aria-label="Product visibility" value={productStatus} onChange={event => setProductStatus(event.target.value)} className="mt-2 w-full rounded-lg border p-2 text-sm"><option value="active">Active — available to shoppers</option><option value="draft">Draft — hidden from shoppers</option></select></label>''')
p.write_text(s)
# Categories gain edit controls and accessible native dialogs.
p=base/'categories/page.tsx';s=p.read_text().replace("import { PageState } from '../_components/PageState';", "import { PageState } from '../_components/PageState';\nimport { Modal } from '../_components/Modal';")
s=s.replace('FolderTree, Plus, Trash2, X, AlertCircle','FolderTree, Plus, Trash2, X, AlertCircle, Edit')
s=s.replace("  const [name, setName] = useState('');", "  const [editingCategory, setEditingCategory] = useState<any | null>(null);\n  const [name, setName] = useState('');")
s=s.replace('`/shops/${shop.id}/categories`, {\n        method: \'POST\',', "`/shops/${shop.id}/categories${editingCategory ? `/${editingCategory.id}` : ''}`, {\n        method: editingCategory ? 'PATCH' : 'POST',")
s=s.replace("description: description.trim() || undefined,", "description: description.trim() || null,")
s=s.replace('onClick={() => setIsModalOpen(true)}', "onClick={() => { setEditingCategory(null); setName(''); setDescription(''); setError(null); setIsModalOpen(true); }}")
s=s.replace('className="flex items-center justify-between"','className="flex flex-wrap items-center justify-between gap-3"',1)
s=s.replace('shadow-sm overflow-hidden">\n        <table','shadow-sm overflow-x-auto">\n        <table')
s=s.replace('                  <td className="py-3 px-4 text-right">', '''                  <td className="py-3 px-4 whitespace-nowrap text-right">
                    <button type="button" aria-label={`Edit ${c.name}`} onClick={() => { setEditingCategory(c); setName(c.name); setDescription(c.description || ''); setError(null); setIsModalOpen(true); }} className="rounded p-2 text-slate-500"><Edit size={16} /></button>''')
s=s.replace('onClick={() => handleDeleteCategory(c.id)}', 'aria-label={`Archive ${c.name}`}\n                      onClick={() => handleDeleteCategory(c.id)}')
s=s.replace('<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">', '<Modal titleId="category-dialog-title" onClose={() => setIsModalOpen(false)}>')
s=s.replace('<h3 className="font-bold text-slate-900 text-sm">Add Category</h3>', '<h3 id="category-dialog-title" className="font-bold text-slate-900 text-sm">{editingCategory ? \'Edit Category\' : \'Add Category\'}</h3>')
s=s.replace('<button onClick={() => setIsModalOpen(false)}','<button aria-label="Close category editor" onClick={() => setIsModalOpen(false)}')
s=s.replace('        </div>\n      )}', '        </Modal>\n      )}',1)
s=s.replace('<label className="block text-xs font-semibold text-slate-700 mb-1">\n                  Category Name', '<label htmlFor="category-name" className="block text-xs font-semibold text-slate-700 mb-1">\n                  Category Name')
s=s.replace('placeholder="e.g. Traditional Sarees"','id="category-name" maxLength={100}\n                  placeholder="e.g. Traditional Sarees"')
s=s.replace('<label className="block text-xs font-semibold text-slate-700 mb-1">\n                  Description', '<label htmlFor="category-description" className="block text-xs font-semibold text-slate-700 mb-1">\n                  Description')
s=s.replace('<textarea\n                  rows={2}', '<textarea id="category-description"\n                  rows={2}')
p.write_text(s)
