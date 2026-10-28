'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Camera, CreditCard, FileText, Gem, KeyRound, LockKeyhole, Monitor, Phone, Settings, ShieldCheck, Store, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useMerchant } from '@/lib/merchant';
import { AuthField } from '@/components/auth/AuthUI';
import { publicSitePath } from '@/lib/sites';
import type { PortfolioStore } from '@/lib/merchant';

const sections = [
  { id: 'profile', label: 'Profile & Security', icon: UserRound },
  { id: 'plan', label: 'Plan & Upgrade', icon: Gem },
  { id: 'payment', label: 'Payment Method', icon: CreditCard },
  { id: 'invoices', label: 'Invoices & Receipts', icon: FileText },
  { id: 'stores', label: 'Store Portfolio', icon: Store },
] as const;

export default function AccountSettingsPage() {
  const { user } = useAuth();
  const { shop, shops, selectShop } = useMerchant();
  const [section, setSection] = useState<(typeof sections)[number]['id']>('profile');
  useEffect(() => { if (new URLSearchParams(window.location.search).get('section') === 'stores') setSection('stores'); }, []);
  if (!user) return null;
  const [firstName, ...lastName] = user.name.trim().split(/\s+/);
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'A';
  const role = user.role === 'platform_admin' ? 'Platform admin' : shop.owner_user_id === user.id ? 'Owner' : 'Merchant';
  const active = sections.find(item => item.id === section) || sections[0];
  const SectionIcon = active.icon;
  const ownedStores = shops.filter(store => store.owner_user_id === user.id);
  const sharedStores = shops.filter(store => store.owner_user_id !== user.id);
  const storeLimitReached = ownedStores.length >= 1;
  const storeCard = (store: PortfolioStore, owned: boolean) => <article key={store.id} className="portfolio-store-card" aria-label={store.name}>
    <div className="portfolio-store-heading"><span className="portfolio-store-avatar" aria-hidden="true">{store.name.slice(0,1).toUpperCase()}</span><div><h3>{store.name}</h3><p>{publicSitePath(store)}</p></div><span className="account-status is-neutral">{store.id === shop.id ? 'Current' : store.status}</span></div>
    <div className="portfolio-store-owner"><UserRound size={17} aria-hidden="true"/><span>{owned ? user.name : 'Shared workspace'}</span><small>{owned ? 'Owner' : 'Member access'}</small></div>
    <div className="portfolio-store-status"><span><i aria-hidden="true"/>{store.status === 'published' ? 'Published' : store.status === 'draft' ? 'Private draft' : store.status}</span><span>{store.id === shop.id ? 'Current workspace' : 'Available workspace'}</span></div>
    <div className="portfolio-store-actions">{store.id === shop.id ? <><Link href="/dashboard/settings" className="account-action"><Settings size={16} aria-hidden="true"/>Settings</Link><Link href="/dashboard" className="account-action is-primary">Enter store<ArrowRight size={15} aria-hidden="true"/></Link></> : <button type="button" className="account-action" onClick={() => selectShop(store.id)}>Switch store<ArrowRight size={15} aria-hidden="true"/></button>}</div>
  </article>;

  return <div className="account-settings">
    <h1 className="sr-only">Account settings</h1>
    <nav className="account-section-nav" aria-label="Account sections">
      {sections.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={section === id ? 'page' : undefined} onClick={() => setSection(id)}><Icon size={19} aria-hidden="true"/><span>{label}</span>{section === id && <i aria-hidden="true"/>}</button>)}
    </nav>
    <div className="account-panels">
      {section === 'profile' ? <>
        <section className="account-card" aria-labelledby="account-profile-title">
          <header className="account-card-header"><div><span className="account-card-icon"><UserRound size={21} aria-hidden="true"/></span><h2 id="account-profile-title">Profile Information</h2></div><span className="account-status"><i aria-hidden="true"/>Active account</span></header>
          <div className="account-profile-body">
            <div className="account-identity">
              <div className="account-avatar-wrap"><span className="account-large-avatar" aria-hidden="true">{initials}</span><button type="button" disabled aria-label="Change profile photo" className="account-photo-button"><Camera size={16} aria-hidden="true"/></button></div>
              <p className="account-identity-name">{user.name}</p><span className="account-role">{role}</span><p className="account-identity-email">{user.email}</p>
            </div>
            <div className="account-profile-fields">
              <AuthField id="account-first-name" label="First name" icon={UserRound} value={firstName} readOnly autoComplete="given-name"/>
              <AuthField id="account-last-name" label="Last name" icon={UserRound} value={lastName.join(' ')} readOnly autoComplete="family-name" placeholder="Last name"/>
              <AuthField id="account-phone" label="Mobile phone" icon={Phone} type="tel" value={user.phone || ''} readOnly autoComplete="tel" placeholder="+880 1XXXXXXXXX"/>
              <AuthField id="account-email" label="Primary email address" icon={LockKeyhole} type="email" value={user.email || ''} readOnly autoComplete="email"/>
              <div className="account-save-row"><button type="button" className="account-action is-primary" disabled>Save profile details</button></div>
            </div>
          </div>
        </section>
        <section className="account-card" aria-labelledby="account-security-title">
          <header className="account-card-header"><div><span className="account-card-icon"><ShieldCheck size={21} aria-hidden="true"/></span><div><h2 id="account-security-title">Login &amp; Security</h2><p>Manage how you sign in to your account.</p></div></div><span className="account-status is-neutral">Password sign-in</span></header>
          <div className="account-security-row"><span className="account-card-icon"><LockKeyhole size={21} aria-hidden="true"/></span><div><h3>Account password</h3><p>Keep your account protected with a strong password.</p></div><button type="button" className="account-action" disabled>Change password</button></div>
          <div className="account-security-row"><span className="account-card-icon"><KeyRound size={21} aria-hidden="true"/></span><div><h3>Two-factor authentication <span className="account-status is-neutral">Not enabled</span></h3><p>Add another layer of protection to your account.</p></div><button type="button" className="account-action is-primary" disabled>Enable 2FA</button></div>
        </section>
        <section className="account-card" aria-labelledby="account-sessions-title">
          <header className="account-card-header"><div><span className="account-card-icon"><Monitor size={21} aria-hidden="true"/></span><div><h2 id="account-sessions-title">Active Login Sessions</h2><p>Your current sign-in to the merchant console.</p></div></div><button type="button" className="account-action" disabled>Sign out other devices</button></header>
          <div className="account-security-row"><span className="account-card-icon"><Monitor size={21} aria-hidden="true"/></span><div><h3>This browser</h3><p>{user.email}</p></div><span className="account-status">This device</span></div>
        </section>
        <section className="account-danger-zone" aria-labelledby="account-danger-title">
          <div>
            <div className="account-danger-labels"><span className="account-danger-badge"><i aria-hidden="true"/>Danger zone</span><span>Account deletion</span></div>
            <h2 id="account-danger-title">Delete account: <span>{user.email || user.name}</span></h2>
            <p>Account deletion is permanent. Make sure you have a copy of important website data before requesting deletion.</p>
          </div>
          <button type="button" className="account-action is-danger" disabled>Delete account</button>
        </section>
      </> : <section className="account-card" aria-labelledby="account-section-title">
        <header className="account-card-header"><div><span className="account-card-icon"><SectionIcon size={21} aria-hidden="true"/></span><h2 id="account-section-title">{active.label}</h2></div>{section === 'stores' && <span className="account-status is-neutral">{ownedStores.length}/1 stores occupied</span>}</header>
        {section === 'plan' && <div className="account-section-body"><h3>A plan for your website</h3><p>Explore available plans and manage the subscription for {shop.name}.</p><Link className="account-action is-primary" href="/dashboard/subscription">View plans &amp; upgrades</Link></div>}
        {section === 'payment' && <div className="account-section-body"><h3>Manual payments</h3><p>Subscription payments are reviewed by the platform administrator. Review your plan and payment requests in billing.</p><Link className="account-action" href="/dashboard/subscription">Open billing</Link><button type="button" className="account-action is-primary" disabled>Add payment method</button></div>}
        {section === 'invoices' && <div className="account-section-body"><h3>Your billing records</h3><p>Review payment requests and their confirmation status for {shop.name}.</p><Link className="account-action is-primary" href="/dashboard/subscription#billing-history">View billing history</Link></div>}
        {section === 'stores' && <div className="account-section-body portfolio-body">
          <div className="portfolio-limit"><LockKeyhole size={18} aria-hidden="true"/><p>One store per account. Additional stores and store-limit upgrades are currently locked.</p><button type="button" className="account-action" disabled>Upgrade store limit</button></div>
          <h3>Your owned stores</h3>
          {ownedStores.length ? <div className="portfolio-store-grid">{ownedStores.map(store => storeCard(store, true))}</div> : <p>You have not created your store yet.</p>}
          <div className="portfolio-create">{storeLimitReached ? <button type="button" className="account-action" disabled><LockKeyhole size={15} aria-hidden="true"/>Create another store</button> : <Link href="/setup?new=1" className="account-action is-primary">Create your store<ArrowRight size={15} aria-hidden="true"/></Link>}</div>
          {sharedStores.length > 0 && <div className="portfolio-shared"><h3>Shared stores · Member access</h3><div className="portfolio-store-grid">{sharedStores.map(store => storeCard(store, false))}</div></div>}
        </div>}
      </section>}
    </div>
  </div>;
}
