'use client';

import React, { useState, useEffect } from 'react';
import { ProductImage } from '@/components/ProductImage';
import { fetchApi } from '@/lib/api';
import { parsePrice } from '@/lib/pricing';
import { ProductOptions } from '../_components/ProductOptions';
import { useMerchant } from '@/lib/merchant';
import { PageState } from '../_components/PageState';
import { Modal } from '@/components/Modal';
import { 
  Package, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  X, 
  Check, 
  AlertCircle
} from 'lucide-react';

export default function ProductsPage() {
  const { shop } = useMerchant();
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState(false);
  const [productStatus, setProductStatus] = useState('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [optionsProduct, setOptionsProduct] = useState<any | null>(null);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [priceBdt, setPriceBdt] = useState('');
  const [comparePriceBdt, setComparePriceBdt] = useState('');
  const [stock, setStock] = useState('20');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true); setLoadError('');
    try {
      const [prods, cats] = await Promise.all([
        fetchApi<any[]>(`/shops/${shop.id}/products`),
        fetchApi<any[]>(`/shops/${shop.id}/categories`),
      ]);
      setProducts(prods); setCategories(cats);
    } catch (error: any) { setLoadError(error.message || 'This page could not be loaded.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { setStockFilter(new URLSearchParams(window.location.search).get('stock') === 'low'); loadData(); }, [shop.id]);

  const openProduct = (product: any | null = null) => {
    setEditingProduct(product); setProductStatus(product?.status || 'active');
    setName(product?.name || '');
    setPriceBdt(product ? (product.price_minor / 100).toFixed(2) : '');
    setComparePriceBdt(product?.compare_at_price_minor != null ? (product.compare_at_price_minor / 100).toFixed(2) : '');
    setStock(product ? String(product.stock_quantity) : '20');
    setSku(product?.sku || ''); setDescription(product?.description || '');
    setImageUrl(product?.images?.find((image: any) => image.is_primary)?.image_url || product?.images?.[0]?.image_url || '');
    setCategoryIds(product?.category_ids || []); setIsFeatured(product?.is_featured || false);
    setError(null); setIsModalOpen(true);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    setError(null);
    setSubmitting(true);

    try {
      const priceMinor = parsePrice(priceBdt);
      const compareMinor = comparePriceBdt ? parsePrice(comparePriceBdt) : null;
      const stockQuantity = Number(stock);
      if (!Number.isInteger(stockQuantity) || stockQuantity < 0 || stockQuantity > 1000000000) throw new Error('Enter a valid whole stock quantity.');
      const originalImages = editingProduct?.images || [];
      const primaryIndex = Math.max(0, originalImages.findIndex((image: any) => image.is_primary));
      const originalUrl = originalImages[primaryIndex]?.image_url || '';
      const images = originalImages.filter((_: any, i: number) => i !== primaryIndex).map((image: any) => ({ image_url: image.image_url, alt_text: image.alt_text, sort_order: image.sort_order, is_primary: false }));
      if (imageUrl.trim()) images.unshift({ image_url: imageUrl.trim(), alt_text: originalImages[primaryIndex]?.alt_text || null, sort_order: 0, is_primary: true });
      if (images.length > 0 && !imageUrl.trim()) images[0].is_primary = true;
      const categoriesChanged = !editingProduct || categoryIds.length !== editingProduct.category_ids.length || categoryIds.some(id => !editingProduct.category_ids.includes(id));
      const hasVariants = editingProduct?.variants?.some((variant: any) => variant.is_active);
      const stockChanged = !editingProduct || stockQuantity !== editingProduct.stock_quantity;

      const payload = {
        name: name.trim(),
        price_minor: priceMinor,
        compare_at_price_minor: compareMinor,
        ...(!hasVariants && editingProduct?.track_inventory !== false && stockChanged ? {
          stock_quantity: stockQuantity,
          ...(editingProduct ? { expected_stock_quantity: editingProduct.stock_quantity } : {}),
        } : {}),
        sku: sku.trim() || null,
        description: description.trim() || null,
        is_featured: isFeatured,
        status: productStatus,
        ...(categoriesChanged ? { category_ids: categoryIds.filter(id => categories.some(category => category.id === id)) } : {}),
        ...(!editingProduct || imageUrl.trim() !== originalUrl ? { images } : {}),
      };

      await fetchApi<any>(`/shops/${shop.id}/products${editingProduct ? `/${editingProduct.id}` : ''}`, {
        method: editingProduct ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });

      setIsModalOpen(false);
      // Reset form
      setName('');
      setPriceBdt('');
      setComparePriceBdt('');
      setStock('20');
      setSku('');
      setDescription('');
      setImageUrl('');
      setCategoryIds([]);
      setEditingProduct(null);
      setIsFeatured(false);

      // Refresh list
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!shop || !confirm('Are you sure you want to archive this product?')) return;
    try {
      await fetchApi(`/shops/${shop.id}/products/${productId}`, { method: 'DELETE' });
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete product');
    }
  };

  const filteredProducts = products.filter((p) =>
    `${p.name} ${p.sku || ''}`.toLowerCase().includes(search.trim().toLowerCase()) && (!stockFilter || (p.status === 'active' && p.track_inventory && (p.variants?.some((v: any) => v.is_active) ? p.variants.some((v: any) => v.is_active && v.stock_quantity <= 5) : p.stock_quantity <= 5)))
  );

  if (loading || loadError) return <PageState loading={loading} error={loadError} onRetry={loadData} />;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {actionError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{actionError}</p>}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Products Catalog</h1>
          <p className="text-xs text-slate-500">Manage products, inventory quantities, and pricing</p>
        </div>

        <button
          onClick={() => openProduct()}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 transition shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          aria-label="Search products"
          placeholder="Search products by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs outline-none bg-transparent"
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={stockFilter} onChange={event => setStockFilter(event.target.checked)} />Only low-stock products (5 or fewer units in any active option)</label>
      <p className="text-xs text-slate-400">{filteredProducts.length} of {products.length} products</p>
      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Price (BDT)</th>
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const img = p.images?.[0]?.image_url;
                  const quantity = p.variants?.some((v: any) => v.is_active) ? p.variants.filter((v: any) => v.is_active).reduce((sum: number, v: any) => sum + v.stock_quantity, 0) : p.stock_quantity;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 flex items-center space-x-3">
                        <ProductImage src={img} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 [&>span]:hidden" />
                        <div className="truncate max-w-xs">
                          <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{p.sku || 'No SKU'}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        ৳{(p.price_minor / 100).toLocaleString('en-BD')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                          quantity > 5 ? 'bg-slate-100 text-slate-800' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {!p.track_inventory ? 'Not tracked' : p.variants?.some((v: any) => v.is_active) ? `${p.variants.filter((v: any) => v.is_active).reduce((sum: number, v: any) => sum + v.stock_quantity, 0)} across options` : `${p.stock_quantity} in stock`}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`capitalize px-2 py-0.5 rounded text-[10px] font-bold ${p.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <button type="button" onClick={() => setOptionsProduct(p)} aria-label={`Options for ${p.name}`} className="mr-2 rounded-lg border px-2 py-1.5 text-[10px] text-slate-600">Options</button>
                        <button onClick={() => openProduct(p)} aria-label={`Edit ${p.name}`} title="Edit Product" className="p-1.5 text-slate-500 hover:text-slate-900 rounded"><Edit className="w-4 h-4" /></button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                          aria-label={`Archive ${p.name}`}
                          title="Archive Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {optionsProduct && <ProductOptions product={optionsProduct} onClose={() => setOptionsProduct(null)} onUpdated={updated => { setOptionsProduct(updated); setProducts(current => current.map(product => product.id === updated.id ? updated : product)); }} />}
      {/* Add Product Modal */}
      {isModalOpen && (
        <Modal titleId="product-dialog-title" onClose={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
            <div className="p-4 border-b flex items-center justify-between bg-slate-50">
              <h3 id="product-dialog-title" className="font-bold text-slate-900 text-sm">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button type="button" aria-label="Close product editor" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-6 space-y-4">
              <label className="block text-xs font-semibold text-slate-700">Product visibility<select aria-label="Product visibility" value={productStatus} onChange={event => setProductStatus(event.target.value)} className="mt-2 w-full rounded-lg border p-2 text-sm"><option value="active">Active — available to shoppers</option><option value="draft">Draft — hidden from shoppers</option></select></label>
              {error && (
                <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {error && editingProduct && <button type="button" className="text-xs text-slate-700 underline" onClick={async () => { try { openProduct(await fetchApi(`/shops/${shop.id}/products/${editingProduct.id}`)); } catch (err: any) { setError(err.message); } }}>Reload saved product</button>}

              <div>
                <label htmlFor="product-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Embroidered Panjabi"
                  id="product-name" value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="product-priceBdt" className="block text-xs font-semibold text-slate-700 mb-1">
                    Selling Price (BDT) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01" min="0" max="1000000000"
                    required
                    placeholder="2450.00"
                    id="product-priceBdt" value={priceBdt}
                    onChange={(e) => setPriceBdt(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="product-comparePriceBdt" className="block text-xs font-semibold text-slate-700 mb-1">
                    Compare-at Price (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01" min="0" max="1000000000"
                    placeholder="2990.00"
                    id="product-comparePriceBdt" value={comparePriceBdt}
                    onChange={(e) => setComparePriceBdt(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="product-stock" className="block text-xs font-semibold text-slate-700 mb-1">
                    Stock Quantity <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0" max="1000000000" step="1"
                    disabled={editingProduct?.variants?.some((v: any) => v.is_active) || editingProduct?.track_inventory === false}
                    id="product-stock" value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                  {editingProduct?.variants?.some((v: any) => v.is_active) && <p className="mt-1 text-xs text-slate-500">This product uses variant stock. Editing its details keeps all options unchanged.</p>}
                </div>
                <div>
                  <label htmlFor="product-sku" className="block text-xs font-semibold text-slate-700 mb-1">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    placeholder="PAN-01"
                    id="product-sku" value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="product-imageUrl" className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  id="product-imageUrl" value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>

              <fieldset>
                <legend className="block text-xs font-semibold text-slate-700 mb-1">Categories</legend>
                <div className="max-h-32 overflow-y-auto space-y-2 rounded border p-3">
                  {categories.length === 0 && <p className="text-xs text-slate-500">Create categories from the Categories page to organize this product.</p>}
                  {categories.map((category) => <label key={category.id} className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={categoryIds.includes(category.id)} onChange={e => setCategoryIds(ids => e.target.checked ? [...ids, category.id] : ids.filter(id => id !== category.id))} />{category.name}</label>)}
                </div>
              </fieldset>

              <div>
                <label htmlFor="product-description" className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe material, fit, and details..."
                  id="product-description" value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none resize-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="featuredCheck"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <label htmlFor="featuredCheck" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Feature this product on store homepage
                </label>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}

