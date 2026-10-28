'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { anyTheme, themeWebsiteType, websiteTypes, websiteType } from '@/lib/sites';
import { fetchApi } from '@/lib/api';
import { AlertCircle, Lock, Mail, User as UserIcon, Phone, Store, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { login, user } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopSlug, setShopSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [themeKey, setThemeKey] = useState('business-studio');
  const [websiteKind, setWebsiteKind] = useState('business');
  useEffect(() => { const preset=anyTheme(new URLSearchParams(window.location.search).get('theme') || ''); if(preset){setThemeKey(preset.key);setWebsiteKind(themeWebsiteType(preset.key));} else {const type=new URLSearchParams(window.location.search).get('type');const choice=websiteTypes.find(item=>item.key===type);if(choice){setWebsiteKind(choice.key);setThemeKey(choice.default_theme);}} }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShopNameChange = (val: string) => {
    setShopName(val);
    const generated = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!slugEdited) setShopSlug(generated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Retry shop creation with the existing session if account creation already succeeded.
      if (!user) {
      const authData = await fetchApi<{ access_token: string; user: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          password,
        }),
      });

      login(authData.access_token, authData.user);

      }
      // 2. Create Initial Shop
      const created = await fetchApi<any>('/shops', {
        method: 'POST',
        body: JSON.stringify({
          name: shopName.trim(),
          slug: shopSlug.trim().toLowerCase(),
          theme_key: themeKey,
          website_type: websiteKind,
        }),
      });

      localStorage.setItem('arise_active_shop', created.slug);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="platform-ui auth-shell min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <div className="auth-card max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100 space-y-6">
        <div className="text-center space-y-1">
          <Link href="/" className="inline-block">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl mx-auto shadow-md mb-2">
              A
            </div>
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900">Create your website</h1>
          <p className="text-xs text-slate-500">14-day free trial • No credit card required</p>
        </div>

        {error && (
          <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-center text-xs text-slate-500">Starting with {anyTheme(themeKey)?.name}. You can change it anytime.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset><legend className="mb-3 text-xs font-semibold text-slate-700">What are you building?</legend><div className="grid grid-cols-2 gap-2">{websiteTypes.map(type=><label key={type.key} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-xs ${websiteKind===type.key?'border-slate-900 bg-slate-50':'border-slate-200'}`}><input type="radio" name="website-type" value={type.key} checked={websiteKind===type.key} onChange={()=>{setWebsiteKind(type.key);setThemeKey(type.default_theme);}}/>{type.label}</label>)}</div><p className="mt-3 text-xs leading-5 text-slate-500">{websiteType(websiteKind).description}</p></fieldset>
          {user ? <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Signed in as {user.email}. Create a new website for this account.</p> : <>
          <div>
            <label htmlFor="register-name" className="block text-xs font-semibold text-slate-700 mb-1">
              Your Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input id="register-name" autoComplete="name" minLength={2} maxLength={100}
                type="text"
                required
                placeholder="e.g. Rahim Chowdhury"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="register-email" className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input id="register-email" autoComplete="email" maxLength={254}
                type="email"
                required
                placeholder="you@brand.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="register-phone" className="block text-xs font-semibold text-slate-700 mb-1">
              Mobile Phone (Bangladesh)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input id="register-phone" autoComplete="tel" inputMode="tel" maxLength={20}
                type="tel"
                placeholder="01712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="register-password" className="block text-xs font-semibold text-slate-700 mb-1">
              Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input id="register-password" autoComplete="new-password" minLength={12} maxLength={128}
                type="password"
                required
                placeholder="At least 12 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
              />
            </div>
          </div>

          </>}
          <div className="border-t pt-3 space-y-3">
            <div>
              <label htmlFor="register-shop" className="block text-xs font-semibold text-slate-700 mb-1">
                {websiteKind==='online_store'?'Shop Name':'Website name'} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Store className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input id="register-shop" minLength={2} maxLength={100}
                  type="text"
                  required
                  placeholder="e.g. Dhaka Artisan Silk"
                  value={shopName}
                  onChange={(e) => handleShopNameChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-slug" className="block text-xs font-semibold text-slate-700 mb-1">
                {websiteKind==='online_store'?'Store URL name':'Website URL name'}
              </label>
              <div className="flex items-center">
                <span className="rounded-l-lg border border-r-0 bg-slate-100 px-3 py-2 text-xs font-mono text-slate-500">{websiteKind==='online_store'?'/store/':'/site/'}</span>
                <input id="register-slug" minLength={3} maxLength={50} pattern="[a-z0-9]+(-[a-z0-9]+)*" type="text" required placeholder="dhaka-silk" value={shopSlug} onChange={event=>{setSlugEdited(true);setShopSlug(event.target.value.toLowerCase());}} className="min-w-0 w-full rounded-r-lg border px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-slate-900 outline-none" />
              </div>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">Choose a short URL using English letters, numbers and dashes. Your website name can be in Bangla.</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition disabled:opacity-50 shadow-md"
          >
            {loading ? <span>Creating website...</span> : <span>Create website</span>}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link href="/login" className="text-slate-900 font-semibold hover:underline">
            Sign in to your workspace
          </Link>
        </p>
      </div>
    </div>
  );
}

