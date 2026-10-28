'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ChevronDown, LogOut, Menu, Settings, X } from 'lucide-react';
import type { User } from '@/lib/auth';

export function DashboardHeader({ title, websiteId, user, menuOpen, onOpenNavigation, onSignOut, loggingOut, logoutError }: {
  title: string; websiteId?: string; user: User; menuOpen: boolean;
  onOpenNavigation: () => void; onSignOut: () => Promise<void>; loggingOut: boolean; logoutError: string;
}) {
  const pathname = usePathname();
  const [panel, setPanel] = useState<'notifications' | 'profile' | null>(null);
  const actions = useRef<HTMLDivElement>(null);
  const notifications = useRef<HTMLButtonElement>(null);
  const profile = useRef<HTMLButtonElement>(null);

  useEffect(() => { setPanel(null); }, [pathname, websiteId]);
  useEffect(() => {
    if (!panel) return;
    const outside = (event: PointerEvent) => { if (!actions.current?.contains(event.target as Node)) setPanel(null); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setPanel(null); (panel === 'profile' ? profile : notifications).current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [panel]);

  function closePanel() { setPanel(null); (panel === 'profile' ? profile : notifications).current?.focus(); }
  const initials = user.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'A';
  const AccountLink = pathname.startsWith('/dashboard/pages/') ? 'a' : Link;

  return <header className="console-topbar" aria-label="Console toolbar">
    <div className="console-page-context">
      <button type="button" className="console-icon-button console-mobile-menu" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => { setPanel(null); onOpenNavigation(); }}><Menu size={20} aria-hidden="true"/></button>
      <p className="console-current-page">{title}</p>
    </div>
    <div className="console-header-actions" ref={actions}>
      <button ref={notifications} type="button" className="console-icon-button" aria-label="Notifications" aria-expanded={panel === 'notifications'} aria-controls="console-notifications" onClick={() => setPanel(current => current === 'notifications' ? null : 'notifications')}><Bell size={20} aria-hidden="true"/></button>
      <button ref={profile} type="button" className="console-profile-trigger" aria-label="Account profile" aria-expanded={panel === 'profile'} aria-controls="console-profile" onClick={() => setPanel(current => current === 'profile' ? null : 'profile')}>
        <span className="console-avatar" aria-hidden="true">{initials}</span><span className="console-profile-name">{user.name}</span><ChevronDown size={14} aria-hidden="true"/>
      </button>
      {panel === 'notifications' && <section id="console-notifications" className="console-dropdown" aria-label="Notifications">
        <div className="console-dropdown-heading"><h2>Notifications</h2><button type="button" className="console-icon-button" aria-label="Close notifications" onClick={closePanel}><X size={16} aria-hidden="true"/></button></div>
        <div className="console-notification-empty"><Bell size={26} aria-hidden="true"/><p>No notifications to show</p></div>
      </section>}
      {panel === 'profile' && <section id="console-profile" className="console-dropdown" aria-label="Account profile">
        <div className="console-dropdown-heading"><h2>Your account</h2><button type="button" className="console-icon-button" aria-label="Close account profile" onClick={closePanel}><X size={16} aria-hidden="true"/></button></div>
        <div className="console-account-details"><p>{user.name}</p><span>{user.email}</span><small>{user.role === 'platform_admin' ? 'Platform admin' : 'Website owner'}</small></div>
        <AccountLink href="/dashboard/account" className="console-profile-link" onClick={() => setPanel(null)}><Settings size={17} aria-hidden="true"/>Account settings</AccountLink>
        <button type="button" className="console-profile-link" disabled={loggingOut} onClick={onSignOut}><LogOut size={17} aria-hidden="true"/>{loggingOut ? 'Signing out…' : 'Sign out'}</button>
        {logoutError && <p role="alert" className="console-account-error">{logoutError}</p>}
      </section>}
    </div>
  </header>;
}
