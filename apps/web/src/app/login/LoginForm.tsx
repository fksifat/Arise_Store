'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { fetchApi } from '@/lib/api';
import { AlertCircle, Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function LoginForm({ showDemoCredentials }: { showDemoCredentials: boolean }) {
  const router = useRouter();
  const { login, sessionExpired } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await fetchApi<{ access_token: string; user: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      login(data.access_token, data.user);
      
      if (data.user.role === 'platform_admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoMerchant = () => {
    setError(null);
    setEmail('merchant@arisestore.com');
    setPassword('merchantpassword123');
  };

  const fillDemoAdmin = () => {
    setError(null);
    setEmail('admin@arisestore.com');
    setPassword('adminpassword123');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100 space-y-6">
        <div className="text-center space-y-1">
          <Link href="/" className="inline-block">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl mx-auto shadow-md mb-2">
              A
            </div>
          </Link>
          <h1 className="text-2xl font-black text-slate-900">Sign in to your store</h1>
          <p className="text-xs text-slate-500">Access your merchant dashboard and manage orders</p>
        </div>

        {sessionExpired && <p role="status" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Your session expired. Please sign in again.</p>}
        {error && (
          <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Demo Fast Login Buttons */}
        {showDemoCredentials && <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
          <p className="text-[11px] font-semibold text-slate-600 text-center uppercase tracking-wider">
            Quick Fill Demo Credentials
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={fillDemoMerchant}
              className="py-1.5 px-2 bg-white hover:bg-slate-100 border rounded text-xs font-medium text-slate-700 transition"
            >
              Demo Merchant
            </button>
            <button
              type="button"
              onClick={fillDemoAdmin}
              className="py-1.5 px-2 bg-white hover:bg-slate-100 border rounded text-xs font-medium text-slate-700 transition"
            >
              Platform Admin
            </button>
          </div>
        </div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="login-email" autoComplete="email" type="email"
                required
                placeholder="merchant@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="login-password" autoComplete="current-password" type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-11 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none"
              />
              <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1.5 rounded p-1.5 text-slate-400">{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition disabled:opacity-50 shadow-md"
          >
            {loading ? <span>Signing in...</span> : <span>Sign In</span>}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Don't have an online store yet?{' '}
          <Link href="/register" className="text-rose-600 font-semibold hover:underline">
            Register your shop free
          </Link>
        </p>
      </div>
    </div>
  );
}

