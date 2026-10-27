'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { isOnlineStore } from '@/lib/sites';
import { useMerchant } from '@/lib/merchant';
import { StorefrontSettings } from '../_components/StorefrontSettings';
import { Settings, Save, AlertCircle, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
  const { shop, updateShop } = useMerchant();
  const store = isOnlineStore(shop);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [insideFeeBdt, setInsideFeeBdt] = useState('60');
  const [outsideFeeBdt, setOutsideFeeBdt] = useState('120');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(shop.name || ''); setDescription(shop.description || '');
    setContactEmail(shop.contact_email || ''); setContactPhone(shop.contact_phone || '');
    setAddress(shop.address || ''); setLogoUrl(shop.logo_url || '');
    setInsideFeeBdt(String(Number(shop.inside_dhaka_delivery_fee_minor) / 100));
    setOutsideFeeBdt(String(Number(shop.outside_dhaka_delivery_fee_minor) / 100));
  }, [shop.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || saving) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const deliveryMinor = (value: string) => {
        if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('Delivery fees must be nonnegative amounts with at most two decimal places.');
        const [whole, fraction = ''] = value.split('.');
        const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
        if (!Number.isSafeInteger(minor) || minor > 10000000) throw new Error('Delivery fees cannot exceed ৳100,000.');
        return String(minor);
      };
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
        address: address.trim() || null,
        logo_url: logoUrl.trim() || null,
        ...(store ? {inside_dhaka_delivery_fee_minor: deliveryMinor(insideFeeBdt), outside_dhaka_delivery_fee_minor: deliveryMinor(outsideFeeBdt)} : {}),
      };

      const updated = await fetchApi<any>(`/shops/${shop.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      updateShop(updated);
      setSuccess(true);

    } catch (err: any) {
      setError(err.message || 'Failed to update store settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">{store?'Store Settings':'Website Settings'}</h1>
        <p className="text-xs text-slate-500">{store?'Configure your store information, contact details, and delivery charges':'Configure your website name, description and public contact details'}</p>
      </div>

      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        {success && (
          <div role="status" className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>Settings saved successfully!</span>
          </div>
        )}

        {error && (
          <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label htmlFor="store-name" className="block text-xs font-semibold text-slate-700 mb-1">
            {store?'Store Name':'Website Name'}
          </label>
          <input id="store-name" minLength={2} maxLength={100}
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
          />
        </div>

        <div>
          <label htmlFor="store-description" className="block text-xs font-semibold text-slate-700 mb-1">
            {store?'Store Description':'Website Description'}
          </label>
          <textarea id="store-description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="store-email" className="block text-xs font-semibold text-slate-700 mb-1">
              Contact Email
            </label>
            <input id="store-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
            />
          </div>
          <div>
            <label htmlFor="store-phone" className="block text-xs font-semibold text-slate-700 mb-1">
              Support Phone (Customer Hotline)
            </label>
            <input id="store-phone"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="store-address" className="block text-xs font-semibold text-slate-700 mb-1">
            {store?'Store Physical Address':'Address'}
          </label>
          <input id="store-address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-700">{store?'Store logo URL':'Website logo URL'}<input type="url" value={logoUrl} onChange={event => setLogoUrl(event.target.value)} placeholder="https://…" className="mt-2 w-full rounded-lg border p-3 text-sm font-normal" /></label></div>
        {/* Delivery Rates */}
        {store && <div className="border-t pt-4 space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Cash on Delivery Shipping Rates (BDT)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="inside-fee" className="block text-xs font-medium text-slate-600 mb-1">
                Inside Dhaka Delivery Fee (৳)
              </label>
              <input id="inside-fee"
                type="number"
                step="0.01" min="0" max="100000"
                required
                value={insideFeeBdt}
                onChange={(e) => setInsideFeeBdt(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
              />
            </div>
            <div>
              <label htmlFor="outside-fee" className="block text-xs font-medium text-slate-600 mb-1">
                Outside Dhaka Delivery Fee (৳)
              </label>
              <input id="outside-fee"
                type="number"
                step="0.01" min="0" max="100000"
                required
                value={outsideFeeBdt}
                onChange={(e) => setOutsideFeeBdt(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
              />
            </div>
          </div>
        </div>

        }
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
      {store && <StorefrontSettings />}
    </div>
  );
}

