'use client';

import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff, LockKeyhole, type LucideIcon } from 'lucide-react';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; icon: LucideIcon; hint?: ReactNode; trailing?: ReactNode };

export function AuthField({ id, label, icon: Icon, hint, trailing, ...input }: FieldProps) {
  return <div className="auth-field">
    <label htmlFor={id}>{label}</label>
    <div className="auth-input" data-invalid={input['aria-invalid']===true || undefined}>
      <Icon size={18} aria-hidden="true"/>
      <input {...input} id={id} aria-describedby={hint ? `${id}-hint` : input['aria-describedby']}/>
      {trailing}
    </div>
    {hint && <p id={`${id}-hint`} className={input['aria-invalid'] ? 'auth-hint is-error' : 'auth-hint'}>{hint}</p>}
  </div>;
}

export function PasswordField({ id, label, hint, ...input }: Omit<FieldProps, 'icon' | 'trailing'>) {
  const [visible, setVisible] = useState(false);
  const controlName = label === 'Confirm Password' ? 'confirm password' : 'password';
  return <AuthField {...input} id={id} label={label} hint={hint} icon={LockKeyhole} type={visible?'text':'password'} trailing={
    <button type="button" className="auth-reveal" aria-label={`${visible?'Hide':'Show'} ${controlName}`} aria-pressed={visible} aria-controls={id} onClick={()=>setVisible(value=>!value)}>
      {visible ? <EyeOff size={18} aria-hidden="true"/> : <Eye size={18} aria-hidden="true"/>}
    </button>
  }/>;
}

export function GoogleAuthButton({ label }: { label: string }) {
  return <div className="auth-social">
    <button type="button" className="auth-google" disabled>
      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#4285F4" d="M43.61 24.46c0-1.36-.12-2.66-.35-3.92H24v7.42h11a9.4 9.4 0 0 1-4.08 6.18v5.14h6.61c3.87-3.56 6.08-8.81 6.08-14.82Z"/>
        <path fill="#34A853" d="M24 44c5.4 0 9.93-1.79 13.24-4.84l-6.61-5.14c-1.83 1.23-4.17 1.97-6.63 1.97-5.23 0-9.66-3.53-11.24-8.28H5.94v5.3A20 20 0 0 0 24 44Z"/>
        <path fill="#FBBC05" d="M12.76 27.71a12 12 0 0 1 0-7.42v-5.3H5.94a20 20 0 0 0 0 18.02l6.82-5.3Z"/>
        <path fill="#EA4335" d="M24 12.01c2.94 0 5.57 1.01 7.65 2.99l5.74-5.74A19.2 19.2 0 0 0 24 4 20 20 0 0 0 5.94 14.99l6.82 5.3c1.58-4.75 6.01-8.28 11.24-8.28Z"/>
      </svg>
      <span>{label}</span>
    </button>
    <div className="auth-divider"><span>or continue with email</span></div>
  </div>;
}

export function AuthFrame({ title, description, children, showPolicyLinks = true }: { title: string; description: string; children: ReactNode; showPolicyLinks?: boolean }) {
  return <main className="platform-ui auth-page">
    <div className="auth-layout">
      <Link href="/" className="auth-back"><ArrowLeft size={18} aria-hidden="true"/>Back to Home</Link>
      <section className="auth-panel" aria-labelledby="auth-heading">
        <Link href="/" className="auth-brand" aria-label="Arise home"><span aria-hidden="true">A</span>Arise</Link>
        <header className="auth-panel-heading"><h1 id="auth-heading">{title}</h1><p>{description}</p></header>
        {children}
        {showPolicyLinks && <nav className="auth-legal" aria-label="Account policies"><Link href="/privacy" target="_blank" rel="noopener noreferrer" aria-label="Privacy notice (opens in a new tab)">Privacy notice</Link><Link href="/terms" target="_blank" rel="noopener noreferrer" aria-label="Terms of use (opens in a new tab)">Terms of use</Link></nav>}
      </section>
    </div>
  </main>;
}
