'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useMerchant } from '@/lib/merchant';
import { PageState } from '../_components/PageState';
import { CreditCard, Check, Sparkles, AlertCircle } from 'lucide-react';

export default function SubscriptionPage() {
  const { shop } = useMerchant();
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [subscription, setSubscription] = useState<any | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [upgrading, setUpgrading] = useState(false);
  const [notice, setNotice] = useState('');

  const loadData = async () => {
    setLoading(true); setLoadError('');
    try {
      const [sub, paymentList, planList] = await Promise.all([
        fetchApi<any>(`/shops/${shop.id}/subscription`),
        fetchApi<any[]>(`/shops/${shop.id}/payments`),
        fetchApi<any[]>('/plans'),
      ]);
      setSubscription(sub); setPayments(paymentList); setPlans(planList);
    } catch (error: any) { setLoadError(error.message || 'This page could not be loaded.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [shop.id]);

  const handleUpgrade = async (planSlug: string) => {
    if (!shop || upgrading || payments.some(payment => payment.status === 'pending')) return;
    setUpgrading(true); setActionError(''); setNotice('');
    try {
      const updated = await fetchApi<any>(`/shops/${shop.id}/subscriptions/upgrade`, {
        method: 'POST',
        body: JSON.stringify({
          plan_slug: planSlug,
          billing_interval: 'monthly',
          payment_method: 'manual',
        }),
      });
      setNotice(`Billing request ${updated.id} is pending. Your plan changes after the administrator confirms payment.`);
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Upgrade failed');
    } finally {
      setUpgrading(false);
    }
  };

  if (loading || loadError) return <PageState loading={loading} error={loadError} onRetry={loadData} />;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {actionError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{actionError}</p>}
      <div>
        <h1 className="text-2xl font-black text-slate-900">Subscription & Billing</h1>
        <p className="text-xs text-slate-500">Manage store plan tier, product limits, and renewal dates</p>
      </div>

      <p className="text-sm text-slate-600">Subscription payments are confirmed manually by the platform administrator. Request a plan, arrange payment with support, and quote your billing request ID.</p>
      {payments.filter(p => p.status === 'pending').map(p => <p role="status" key={p.id} className="p-4 bg-amber-50 text-sm rounded">Awaiting payment confirmation: ৳{p.amount_minor / 100} · Request {p.id}</p>)}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 break-words">{notice}</p>}
      {/* Current Plan Overview Card */}
      {subscription && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Plan:</span>
              <span className="text-xl font-black text-rose-600">{subscription.plan_name}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${['trial', 'active'].includes(subscription.status) ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                {subscription.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Billing Interval: <span className="font-semibold text-slate-800 capitalize">{subscription.billing_interval}</span> • 
              Access valid until: <span className="font-semibold text-slate-800">{new Date(subscription.current_period_end).toLocaleDateString('en-GB')}</span>
            </p>
          </div>
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-900">Billing history</h2>{payments.length === 0 ? <p className="mt-3 text-sm text-slate-500">No payment requests yet.</p> : <div className="mt-3 divide-y">{payments.map(payment => <div key={payment.id} className="flex flex-wrap justify-between gap-2 py-3 text-xs"><div className="min-w-0"><p className="font-medium">৳{(payment.amount_minor / 100).toLocaleString('en-BD')} · {payment.billing_interval}</p><p className="mt-1 break-all text-[10px] text-slate-400">Request {payment.id}</p></div><div className="text-right"><p className="capitalize">{payment.status}</p><p className="mt-1 text-slate-400">{new Date(payment.created_at).toLocaleDateString('en-GB')}</p></div></div>)}</div>}</section>
      {/* Plans Comparison */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-4">
        {plans.map((p) => {
          const isCurrent = subscription?.plan_name.toLowerCase() === p.name.toLowerCase();

          return (
            <div
              key={p.id}
              className={`bg-white rounded-2xl border p-6 flex flex-col justify-between shadow-sm ${
                isCurrent ? 'border-2 border-rose-600 ring-2 ring-rose-50' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-base text-slate-900">{p.name}</h3>
                  {isCurrent && (
                    <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded">
                      Current
                    </span>
                  )}
                </div>
                <div className="text-2xl font-black text-slate-900 mb-4">
                  ৳{(p.price_monthly_minor / 100).toLocaleString('en-BD')}
                  <span className="text-xs text-slate-500 font-normal">/month</span>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-600 border-t pt-4">
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Up to {p.product_limit.toLocaleString()} products</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>{p.custom_domain_allowed ? 'Custom domain allowed' : 'Platform subdomain only'}</span>
                  </li>
                  {p.features?.map((feat: string, idx: number) => (
                    <li key={idx} className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6">
                <button onClick={() => handleUpgrade(p.slug)} disabled={upgrading || payments.some(p => p.status === 'pending')} className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                  {upgrading ? 'Processing...' : isCurrent ? 'Renew plan' : `Request ${p.name}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

