'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { fetchApi } from '@/lib/api';
import { setupSearch, type SetupProgress } from '@/lib/setup';
import { AuthField, AuthFrame, GoogleAuthButton, PasswordField } from '@/components/auth/AuthUI';

export default function LoginForm({ showDemoCredentials }: { showDemoCredentials: boolean }) {
  const router = useRouter();
  const { login, sessionExpired, loading: checkingSession } = useAuth();
  const [query, setQuery] = useState('');
  useEffect(() => { setQuery(setupSearch(window.location.search)); }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading || checkingSession) return;
    setError(''); setLoading(true);
    try {
      const data = await fetchApi<{access_token: string; user: any}>('/auth/login', {method:'POST', body:JSON.stringify({email:email.trim(), password, remember_me:remember})});
      login(data.access_token, data.user);
      if (data.user.role === 'platform_admin') router.push('/admin');
      else {
        const [draft, shops] = await Promise.all([fetchApi<SetupProgress | null>('/setup'), fetchApi<any[]>('/shops')]);
        router.push(shops.some(shop => shop.owner_user_id === data.user.id) ? '/dashboard' : draft ? '/setup' : !shops.length || query ? '/setup' + setupSearch(window.location.search, !!shops.length) : '/dashboard');
      }
    } catch (error: any) { setError(error.message || 'Sign in failed. Please check your details and try again.'); }
    finally { setLoading(false); }
  }
  function fillDemo(admin: boolean) {
    setError(''); setRemember(false);
    setEmail(admin?'admin@arisestore.com':'merchant@arisestore.com');
    setPassword(admin?'adminpassword123':'merchantpassword123');
  }

  return <AuthFrame title="Welcome back" description="Sign in to manage your websites and content.">
    <GoogleAuthButton label="Sign in with Google"/>
    {sessionExpired && <p role="status" className="auth-notice">Your session expired. Please sign in again.</p>}
    {error && <p role="alert" className="auth-error"><AlertCircle size={18} aria-hidden="true"/><span>{error}</span></p>}
    <form onSubmit={submit} aria-busy={checkingSession || loading}>
      <fieldset disabled={checkingSession || loading} className="auth-fields">
        <legend className="sr-only">Sign in details</legend>
        <AuthField id="login-email" label="Email Address" icon={Mail} type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254} placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/>
        <PasswordField id="login-password" label="Password" autoComplete="current-password" required maxLength={128} placeholder="Your password" value={password} onChange={e=>setPassword(e.target.value)}/>
        <div className="auth-remember-row auth-login-options">
          <label htmlFor="remember-login"><input id="remember-login" type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/><span>Remember me for 7 days</span></label>
          <button type="button" className="auth-forgot" disabled>Forgot password?</button>
        </div>
        <button type="submit" className="auth-submit">{loading?'Signing in…':'Sign In'}</button>
      </fieldset>
    </form>
    <p className="auth-switch">Don&apos;t have an account? <Link href={'/register'+query}>Create an account</Link></p>
    {showDemoCredentials && <section className="auth-demo" aria-label="Demo accounts"><p>Just exploring? Try a demo account.</p><div><button type="button" disabled={checkingSession || loading} onClick={()=>fillDemo(false)}>Demo Merchant</button><button type="button" disabled={checkingSession || loading} onClick={()=>fillDemo(true)}>Platform Admin</button></div><p className="auth-demo-hint">Fills sample credentials. Select Sign In to continue.</p></section>}
  </AuthFrame>;
}
