'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { publicSitePath } from '@/lib/sites';
import { useMerchant } from '@/lib/merchant';
import { PageState } from '../_components/PageState';
import { Globe, Plus, CheckCircle, Clock, Trash2, AlertCircle, Copy } from 'lucide-react';

export default function DomainsPage() {
  const { shop } = useMerchant();
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true); setLoadError('');
    try {
      setDomains(await fetchApi<any[]>(`/shops/${shop.id}/domains`));
    } catch (error: any) { setLoadError(error.message || 'This page could not be loaded.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [shop.id]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !newDomain.trim()) return;
    setError(null);
    setAdding(true);

    try {
      await fetchApi<any>(`/shops/${shop.id}/domains`, {
        method: 'POST',
        body: JSON.stringify({ hostname: newDomain.trim() }),
      });
      setNewDomain('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to connect custom domain');
    } finally {
      setAdding(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    if (!shop || verifying) return;
    setVerifying(domainId); setActionError(''); setNotice('');
    try {
      await fetchApi<any>(`/shops/${shop.id}/domains/${domainId}/verify`, {
        method: 'POST',
      });
      loadData();
      setNotice('DNS ownership verified. Contact the administrator to arrange HTTPS and routing.');
    } catch (err: any) {
      setActionError(err.message || 'Domain verification failed');
    } finally { setVerifying(null); }
  };

  const handleRemoveDomain = async (domainId: string) => {
    if (!shop || !confirm('Are you sure you want to disconnect this domain?')) return;
    try {
      await fetchApi(`/shops/${shop.id}/domains/${domainId}`, { method: 'DELETE' });
      setDomains((prev) => prev.filter((d) => d.id !== domainId));
    } catch (err: any) {
      setActionError(err.message || 'Failed to disconnect domain');
    }
  };

  if (loading || loadError) return <PageState loading={loading} error={loadError} onRetry={loadData} />;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {actionError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{actionError}</p>}
      <div>
        <h1 className="text-2xl font-black text-slate-900">Custom Domains</h1>
        <p className="text-xs text-slate-500">Verify domain ownership before arranging HTTPS and routing with the administrator.</p>
      </div>

      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
      {/* Connect Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900">Connect a New Domain</h3>

        {error && (
          <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAddDomain} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            aria-label="Domain hostname" maxLength={253}
            placeholder="e.g. www.yourbrand.com or store.yourbrand.bd"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            className="min-w-0 flex-1 px-3 py-2 border rounded-lg text-xs focus:ring-2 focus:ring-slate-900 outline-none"
          />
          <button
            type="submit"
            disabled={adding}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
          >
            {adding ? 'Connecting...' : 'Connect Domain'}
          </button>
        </form>

        {/* DNS Instructions Box */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-600">
          <p className="font-bold text-slate-800">Required DNS Configuration:</p>
          <p>Add the unique TXT record shown beside your domain to prove ownership. After verification, contact the administrator to configure hosting. Your local website remains available at {publicSitePath(shop)}.</p>
          <div className="bg-white p-2.5 rounded border border-slate-300 font-mono text-[11px] flex justify-between items-center">
            <span>Use the TXT hostname and value from your connected domain below.</span>
          </div>
        </div>
      </div>

      {/* Connected Domains List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] font-bold">
              <th className="py-3 px-4">Hostname</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Verification & Routing</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {domains.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-500">No domains connected. Your website uses {publicSitePath(shop)}.</td></tr>}
            {domains.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50/50 transition">
                <td className="py-3 px-4 font-mono font-bold text-slate-900">
                  {d.hostname}
                  {d.verification_record && <div className="mt-2 text-[10px] font-normal break-all"><p>TXT: {d.verification_record}</p><p>Value: {d.verification_value}</p></div>}
                </td>
                <td className="py-3 px-4">
                  <span className="capitalize text-[10px] px-2 py-0.5 bg-slate-100 rounded font-medium text-slate-600">
                    {d.domain_type.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {d.verification_status === 'verified' ? (
                    <span className="inline-flex items-center space-x-1 text-emerald-700 font-semibold text-[11px]">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{d.routing_status === 'active' ? 'Routing active' : 'DNS verified · hosting pending'}</span>
                    </span>
                  ) : (
                    <button
                      disabled={!!verifying} onClick={() => handleVerifyDomain(d.id)}
                      className="inline-flex items-center space-x-1 text-amber-700 bg-amber-50 px-2 py-1 rounded text-[11px] font-bold hover:bg-amber-100 transition"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{verifying === d.id ? 'Checking DNS…' : 'Verify DNS ownership'}</span>
                    </button>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  {d.domain_type !== 'platform_subdomain' && (
                    <button
                      onClick={() => handleRemoveDomain(d.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      aria-label={`Disconnect ${d.hostname}`} title="Disconnect"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

