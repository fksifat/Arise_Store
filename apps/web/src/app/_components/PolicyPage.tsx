import Link from 'next/link';

export function PolicyPage({title, introduction, sections}: {title:string; introduction:string; sections:{title:string; body:string}[]}) {
  return <main className="platform-ui policy-page"><div className="policy-container">
    <header className="policy-header"><Link href="/" className="auth-brand" aria-label="Arise home"><span aria-hidden="true">A</span>Arise</Link><Link href="/login">Back to sign in</Link></header>
    <article className="policy-content"><h1>{title}</h1><p>{introduction}</p>
      <aside className="policy-draft" aria-label="Draft policy notice"><strong>Draft for review</strong>This page describes the current product and intended use. Operating-entity details, a policy contact, retention periods and final legal terms still need owner review before publication. No legal compliance is claimed.</aside>
      {sections.map(section=><section key={section.title}><h2>{section.title}</h2><p>{section.body}</p></section>)}
      <nav aria-label="Policy navigation" className="policy-nav"><Link href="/privacy">Privacy notice</Link><Link href="/terms">Terms of use</Link><Link href="/register">Create an account</Link></nav>
    </article>
  </div></main>;
}
