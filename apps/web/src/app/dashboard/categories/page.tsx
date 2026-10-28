'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useMerchant } from '@/lib/merchant';
import { PageState } from '../_components/PageState';
import { Modal } from '@/components/Modal';
import { FolderTree, Plus, Trash2, X, AlertCircle, Edit } from 'lucide-react';

export default function CategoriesPage() {
  const { shop } = useMerchant();
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true); setLoadError('');
    try {
      setCategories(await fetchApi<any[]>(`/shops/${shop.id}/categories`));
    } catch (error: any) { setLoadError(error.message || 'This page could not be loaded.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [shop.id]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    setError(null);
    setSubmitting(true);

    try {
      await fetchApi<any>(`/shops/${shop.id}/categories${editingCategory ? `/${editingCategory.id}` : ''}`, {
        method: editingCategory ? 'PATCH' : 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      setIsModalOpen(false);
      setName('');
      setDescription('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!shop || !confirm('Are you sure you want to archive this category?')) return;
    try {
      await fetchApi(`/shops/${shop.id}/categories/${categoryId}`, { method: 'DELETE' });
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete category');
    }
  };

  if (loading || loadError) return <PageState loading={loading} error={loadError} onRetry={loadData} />;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {actionError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{actionError}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Categories</h1>
          <p className="text-xs text-slate-500">Organize your store catalog into browseable sections</p>
        </div>

        <button
          onClick={() => { setEditingCategory(null); setName(''); setDescription(''); setError(null); setIsModalOpen(true); }}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] font-bold">
              <th className="py-3 px-4">Category Name</th>
              <th className="py-3 px-4">URL Slug</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400">
                  No categories created yet. Click "Add Category" to organize your store.
                </td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">/{c.slug}</td>
                  <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{c.description || '—'}</td>
                  <td className="py-3 px-4 whitespace-nowrap text-right">
                    <button type="button" aria-label={`Edit ${c.name}`} onClick={() => { setEditingCategory(c); setName(c.name); setDescription(c.description || ''); setError(null); setIsModalOpen(true); }} className="rounded p-2 text-slate-500"><Edit size={16} /></button>
                    <button
                      aria-label={`Archive ${c.name}`}
                      onClick={() => handleDeleteCategory(c.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <Modal titleId="category-dialog-title" onClose={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="p-4 border-b flex items-center justify-between bg-slate-50">
              <h3 id="category-dialog-title" className="font-bold text-slate-900 text-sm">{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
              <button aria-label="Close category editor" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="p-6 space-y-4">
              {error && (
                <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="category-name" className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  id="category-name" maxLength={100}
                  placeholder="e.g. Traditional Sarees"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>

              <div>
                <label htmlFor="category-description" className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea id="category-description"
                  rows={2}
                  placeholder="Optional brief description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none resize-none"
                />
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
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}

