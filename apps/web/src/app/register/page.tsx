'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Mail, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { fetchApi } from '@/lib/api';
import { setupSearch } from '@/lib/setup';
import { AuthField, AuthFrame, GoogleAuthButton, PasswordField } from '@/components/auth/AuthUI';

export default function RegisterPage() {
  const router = useRouter();
  const { login, user, loading: checkingSession } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => { setQuery(setupSearch(window.location.search)); }, []);
  useEffect(() => {
    if (!checkingSession && user) router.replace(user.role==='platform_admin'?'/admin':'/setup'+setupSearch(window.location.search, true));
  }, [checkingSession, user, router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || checkingSession) return;
    if (password!==confirmation) { setError('Passwords do not match. Please check your confirmation.'); return; }
    setBusy(true); setError('');
    try {
      const data = await fetchApi<{access_token: string; user: any}>('/auth/register', {method:'POST', body:JSON.stringify({name:name.trim(), email:email.trim().toLowerCase(), password})});
      login(data.access_token, data.user);
    } catch (error: any) { setError(error.message || 'Your account could not be created. Please try again.'); }
    finally { setBusy(false); }
  }

  if (user) return <AuthFrame title="Opening your account" description="Taking you to your workspace."><p role="status" className="auth-hint">Please wait…</p></AuthFrame>;
  const mismatch = !!confirmation && confirmation!==password;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/].filter(pattern=>pattern.test(password)).length;
  const strength = password.length < 8 ? 1 : Math.min(4, 1 + Number(password.length >= 12) + Number(password.length >= 16) + Number(variety >= 3));
  const strengthLabel = ['Weak', 'Fair', 'Good', 'Strong'][strength - 1];
  return <AuthFrame title="Create your account" description="Your account first. Build your website next." showPolicyLinks={false}>
    <GoogleAuthButton label="Sign up with Google"/>
    {error && <p role="alert" className="auth-error"><AlertCircle size={18} aria-hidden="true"/><span>{error}</span></p>}
    <form onSubmit={submit} aria-busy={busy || checkingSession}>
      <fieldset disabled={busy || checkingSession} className="auth-fields">
        <legend className="sr-only">Account details</legend>
        <AuthField id="register-name" label="Your Full Name" icon={UserRound} autoComplete="name" required minLength={2} maxLength={100} placeholder="e.g. Rahim Chowdhury" value={name} onChange={e=>setName(e.target.value)}/>
        <AuthField id="register-email" label="Email Address" icon={Mail} type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254} placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/>
        <PasswordField id="register-password" label="Password" autoComplete="new-password" required minLength={8} maxLength={128} placeholder="••••••••••••" hint={password ? <>
          <span className="auth-strength-bar" data-strength={strength} role="meter" aria-label="Password strength" aria-valuemin={0} aria-valuemax={4} aria-valuenow={strength} aria-valuetext={strengthLabel}><span style={{width:`${strength * 25}%`}}/></span>
          <span>Strength: <strong>{strengthLabel}</strong></span>
        </> : undefined} value={password} onChange={e=>{setPassword(e.target.value);setError('');}}/>
        <PasswordField id="register-confirm-password" label="Confirm Password" autoComplete="new-password" required minLength={8} maxLength={128} placeholder="••••••••••••" aria-invalid={mismatch} hint={mismatch?'Passwords must match.':undefined} value={confirmation} onChange={e=>{setConfirmation(e.target.value);setError('');}}/>
        <label className="auth-consent" htmlFor="register-agreement">
          <input id="register-agreement" type="checkbox" required/>
          <span>I agree to Arise&apos;s <Link href="/terms" target="_blank" rel="noopener noreferrer" aria-label="Terms of use (opens in a new tab)">Terms of use</Link> and <Link href="/privacy" target="_blank" rel="noopener noreferrer" aria-label="Privacy notice (opens in a new tab)">Privacy notice</Link>.</span>
        </label>
        <button type="submit" className="auth-submit">{busy?'Creating account…':'Create account'}</button>
      </fieldset>
    </form>
    <p className="auth-switch">Already have an account? <Link href={'/login'+query}>Sign in</Link></p>
  </AuthFrame>;
}
