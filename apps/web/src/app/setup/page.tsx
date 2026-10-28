'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, LockKeyhole, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { fetchApi } from '@/lib/api';
import { initialSetup, type SetupProgress } from '@/lib/setup';
import { anyTheme, websiteTypes, websiteThemes, websiteType } from '@/lib/sites';
import { storefrontThemes } from '@/lib/storefront-themes';

const steps = ['Website type', 'Website details', 'Choose a theme', 'Review'];

export default function SetupPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const userId = user?.id;
  const userRole = user?.role;
  const [draft, setDraft] = useState<SetupProgress | null>(null);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState('All changes saved');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [hasWebsites, setHasWebsites] = useState(false);
  const [storeLimitReached, setStoreLimitReached] = useState(false);
  const lastSaved = useRef('');
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const saveNumber = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);

  const save = useCallback((progress: SetupProgress) => {
    const number = ++saveNumber.current;
    setSaveState('Saving…');
    const job = queue.current.catch(()=>{}).then(()=>fetchApi<SetupProgress>('/setup', {method:'PUT', body:JSON.stringify(progress)}));
    queue.current = job;
    return job.then(saved=>{
      lastSaved.current = JSON.stringify(saved);
      if (number === saveNumber.current) setSaveState('All changes saved');
      return saved;
    }).catch(error=>{
      if (number === saveNumber.current) setSaveState('Changes not saved');
      throw error;
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!userId) { router.replace('/login'); return; }
    if (userRole === 'platform_admin') { router.replace('/admin'); return; }
    let active = true;
    setError('');
    Promise.all([fetchApi<SetupProgress | null>('/setup'), fetchApi<any[]>('/shops')]).then(async ([saved, sites])=>{
      if (!active) return;
      setHasWebsites(sites.length > 0);
      if (sites.some(site => site.owner_user_id === userId)) { setStoreLimitReached(true); return; }
      const query = new URLSearchParams(window.location.search);
      if (!saved && sites.length && !query.has('new') && !query.has('theme') && !query.has('type')) { router.replace('/dashboard'); return; }
      const progress = saved || await save(initialSetup(window.location.search));
      if (active) { lastSaved.current = JSON.stringify(progress); setDraft(progress); }
    }).catch(error=>{ if (active) setError(error.message || 'Your setup could not be loaded.'); });
    return ()=>{ active = false; };
  }, [loading, userId, userRole, router, save, retry]);

  useEffect(() => {
    if (!draft || busy || JSON.stringify(draft) === lastSaved.current) return;
    setSaveState('Saving…');
    const timer = setTimeout(()=>{save(draft).catch(error=>setError(error.message || 'Your progress could not be saved. Please try again.'));}, 500);
    return ()=>clearTimeout(timer);
  }, [draft, busy, save]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (draft && JSON.stringify(draft) !== lastSaved.current) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return ()=>window.removeEventListener('beforeunload', warn);
  }, [draft]);

  useEffect(() => { heading.current?.focus(); }, [draft?.step]);

  function update(values: Partial<SetupProgress>) { setError(''); setDraft(current=>current ? {...current, ...values} : current); }
  async function go(step: number) {
    if (!draft || busy) return;
    setBusy(true); setError('');
    try { const next = {...draft, step}; await save(next); setDraft(next); }
    catch (error: any) { setError(error.message || 'Your progress could not be saved. Please try again.'); }
    finally { setBusy(false); }
  }
  function openWebsite(site: any) {
    localStorage.setItem('arise_active_shop', site.slug);
    router.replace('/dashboard');
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft || busy) return;
    if (draft.step < 4) { await go(draft.step + 1); return; }
    setBusy(true); setError('');
    try {
      await save(draft);
      const site = await fetchApi<any>('/shops', {method:'POST', body:JSON.stringify({...draft, name:draft.name.trim(), slug:draft.slug.trim(), complete_setup:true})});
      openWebsite(site);
    } catch (error: any) {
      // Recover a successful creation whose response was lost; the server clears its draft atomically.
      try {
        if (await fetchApi('/setup') === null) {
          const sites = await fetchApi<any[]>('/shops');
          const site = sites.find(site=>site.owner_user_id===user?.id && site.slug===draft.slug.trim() && site.website_type===draft.website_type && site.name===draft.name.trim());
          if (site) { openWebsite(site); return; }
        }
      } catch { /* Keep the original creation error and the user's input. */ }
      setError(error.message || 'Your website could not be created. Your setup is saved.');
      setBusy(false);
    }
  }
  async function signOut() {
    if (!draft || busy) return;
    setBusy(true); setError('');
    try { await save(draft); await logout(); }
    catch (error: any) { setError(error.message || 'Sign out failed. Please try again.'); setBusy(false); }
  }

  if (storeLimitReached) return <main className="platform-ui auth-shell flex min-h-screen items-center justify-center p-6"><section className="max-w-md rounded-2xl border bg-white p-7 text-center"><LockKeyhole size={28} className="mx-auto text-slate-500" aria-hidden="true"/><h1 className="mt-4 text-xl font-semibold">Store limit reached</h1><p className="mt-3 text-sm leading-7 text-slate-500">Your account can own one store. Creating additional stores and upgrading this limit are currently locked.</p><Link href="/dashboard/account?section=stores" className="primary-action mt-5">View Store Portfolio</Link></section></main>;
  if (!draft) return <main className="platform-ui auth-shell flex min-h-screen items-center justify-center p-6"><div role={error?'alert':'status'} className="max-w-md text-center"><p>{error || 'Opening your website setup…'}</p>{error && <button onClick={()=>setRetry(v=>v+1)} className="mt-5 rounded-xl border bg-white p-3">Try again</button>}</div></main>;
  const hasUnsavedChanges = JSON.stringify(draft) !== lastSaved.current;
  const themes = draft.website_type === 'online_store' ? storefrontThemes : websiteThemes.filter(theme=>theme.website_type===draft.website_type);
  return <main className="platform-ui setup-shell min-h-screen">
    <header className="setup-header">
      <Link href="/" aria-label="Arise home" className="footer-logo"><span aria-hidden="true">A</span>Arise</Link>
      <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1"><span className="hidden text-xs text-slate-500 sm:block">{user?.email}</span><button type="button" disabled={busy} onClick={signOut} className="flex items-center gap-2 text-xs text-slate-600"><LogOut size={15}/>Save and sign out</button></div>
    </header>
    <div className="setup-container">
      <nav aria-label="Setup progress"><ol className="setup-steps">{steps.map((label,index)=><li key={label} aria-current={draft.step===index+1?'step':undefined}><span className={draft.step>=index+1?'is-active':''}>{draft.step>index+1?<Check size={16}/>:index+1}</span><span>{label}</span></li>)}</ol></nav>
      <div className="setup-heading"><p className="text-xs text-brand-700">Step {draft.step} of 4</p><h1 ref={heading} tabIndex={-1}>{['What are you building?', 'Give your website a name.', 'Find a look that feels like you.', 'Ready for your next chapter?'][draft.step-1]}</h1><p>{['Choose a starting point. We’ll show you the tools that fit.', 'You can use a Bangla name. Choose English letters, numbers and dashes for your URL.', 'Your content stays yours. You can change the design later.', 'Your website starts as a private draft. Publish when you’re ready.'][draft.step-1]}</p></div>
      {error && <p role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="min-w-0">
          <legend className="sr-only">{steps[draft.step-1]}</legend>
          {draft.step===1 && <div className="setup-types">{websiteTypes.map(type=><label key={type.key} className={draft.website_type===type.key?'setup-choice is-selected':'setup-choice'}><input type="radio" aria-label={type.label} name="website-type" value={type.key} checked={draft.website_type===type.key} onChange={()=>update({website_type:type.key,theme_key:type.default_theme})}/><span><strong>{type.label}</strong><span>{type.description}</span></span></label>)}</div>}
          {draft.step===2 && <div className="setup-details space-y-6"><label className="block text-sm font-semibold">Website name<input required minLength={2} maxLength={100} value={draft.name} placeholder="e.g. Dhaka Artisan Silk" onChange={e=>{const name=e.target.value;const generated=draft.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50);update({name,...(!draft.slug || draft.slug===generated ? {slug:name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50)} : {})});}} className="mt-3 w-full border p-3 font-normal"/></label><label className="block text-sm font-semibold">Website URL name<input required minLength={3} maxLength={50} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug} onChange={e=>update({slug:e.target.value.toLowerCase()})} placeholder="your-website" className="mt-3 w-full border p-3 font-normal"/></label><p className="break-all rounded-xl bg-slate-50 p-4 text-xs text-slate-500">Your website: {draft.website_type==='online_store'?'/store/':'/site/'}{draft.slug || 'your-website'}</p></div>}
          {draft.step===3 && <div className="setup-themes">{themes.map(theme=><label key={theme.key} className={draft.theme_key===theme.key?'setup-theme is-selected':'setup-theme'}><img src={theme.preview_image_url} alt={`${theme.name} design preview`} loading="lazy"/><span className="flex items-center gap-3 p-4"><input type="radio" aria-label={theme.name} name="website-theme" value={theme.key} checked={draft.theme_key===theme.key} onChange={()=>update({theme_key:theme.key})}/><strong className="text-sm">{theme.name}</strong></span></label>)}</div>}
          {draft.step===4 && <div className="setup-review"><div><img src={anyTheme(draft.theme_key)?.preview_image_url} alt={`${anyTheme(draft.theme_key)?.name} design preview`}/><p className="p-4 text-xs text-slate-500">{anyTheme(draft.theme_key)?.name}</p></div><dl><dt>Website name</dt><dd>{draft.name}</dd><dt>Website type</dt><dd>{websiteType(draft.website_type).label}</dd><dt>Website address</dt><dd>{draft.website_type==='online_store'?'/store/':'/site/'}{draft.slug}</dd><dt>Getting started</dt><dd>14-day free trial · Private draft</dd></dl></div>}
        </fieldset>
        <div className="setup-actions"><div>{draft.step>1 && <button type="button" disabled={busy} onClick={()=>go(draft.step-1)} className="flex items-center gap-2 text-sm"><ArrowLeft size={16}/>Back</button>}</div><button type="submit" disabled={busy} className="primary-action disabled:opacity-50">{busy?(draft.step===4?'Creating website…':'Saving…'):draft.step===4?'Create website':'Continue'}<ArrowRight size={16}/></button></div>
      </form>
      <div className="setup-save-state"><p role="status" aria-live="polite">{saveState === 'All changes saved' && hasUnsavedChanges ? 'Saving…' : saveState}</p><p>You can leave and finish later. Your progress is saved to your account.</p>{hasWebsites && <Link href="/dashboard" className="mt-3 inline-block text-brand-700 underline">Go to your existing websites</Link>}</div>
    </div>
  </main>;
}
