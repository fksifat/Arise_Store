'use client';

import Link from 'next/link';
import { type CSSProperties } from 'react';
import { ArrowUpRight, ArrowRight, Mail, Phone, MapPin, Menu } from 'lucide-react';
import { websiteTheme, publicSitePath, contentPath, type Section } from '@/lib/sites';
import { businessDate } from '@/lib/business';
import {ProductImage} from '@/components/ProductImage';
import './website.css';

export function Website({site,page,preview=false,embedded=false,feed}:{site:any;page:any;preview?:boolean;embedded?:boolean;feed?:any}){
  const theme=websiteTheme(site.theme_key);
  const color=site.brand?.primary_color || theme?.accent || '#2358a8';
  const accent=/^#[0-9a-f]{6}$/i.test(color)?color:'#2358a8';
  const luminance=[1,3,5].map(offset=>parseInt(accent.slice(offset,offset+2),16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
  const onAccent=(luminance+.05)/.05>1.05/(luminance+.05)?'#151515':'#ffffff';
  const sections:Section[]=(page.sections||[]).filter(section=>section.enabled!==false);
  const hasHero=sections.some(section=>section.type==='hero');
  let heroCount=0;
  const Content=embedded?'div':'main';
  const navigation=(site.navigation||[]).map(item=>({...item,href:contentPath(site,item)}));
  if(page.slug==='home'){const labels:Record<string,string>={features:'Services',gallery:'Selected work',text:'About',contact:'Contact'};for(const section of sections.filter(item=>labels[item.type]).slice(0,3)){navigation.push({title:labels[section.type],href:`#${section.anchor||section.id}`});}}
  if((site.recent_posts||[]).length || site.website_type==='blog')navigation.push({title:'Blog',href:`/site/${site.slug}/blog`,slug:'blog'});
  const cancel=(event:React.MouseEvent)=>{if(preview)event.preventDefault();};
  const postCards=(items:any[])=><div className="wb-grid">{items.map(post=><article key={post.slug} className="wb-post"><p className="wb-eyebrow">{post.published_at?businessDate(post.published_at):'Article'}</p><h3><a href={contentPath(site,{...post,kind:'post'})} onClick={cancel}>{post.title}</a></h3>{post.description && <p>{post.description}</p>}<a className="wb-text-link" href={contentPath(site,{...post,kind:'post'})} onClick={cancel}>Read article <ArrowUpRight size={16}/></a></article>)}</div>;
  return <div className={`wb wb--${theme?.presentation||'studio'} wb-theme-${theme?.key||'default'}${preview?' wb--preview':''}`} data-font={site.brand?.font_family||'theme'} style={{'--wb-accent':accent,'--wb-on-accent':onAccent} as CSSProperties}>
    <a href="#website-main" className="wb-skip">Skip to content</a>
    <header className="wb-header"><div className="wb-container wb-header-inner"><a href={publicSitePath(site)} onClick={cancel} className="wb-brand">{site.logo_url?<img src={site.logo_url} alt=""/>:<span aria-hidden="true">{site.name?.charAt(0)||'A'}</span>}<strong>{site.name}</strong></a>
      <nav className="wb-desktop-nav" aria-label="Website navigation"><a href={publicSitePath(site)} onClick={cancel}>Home</a>{navigation.slice(0,5).map(item=><a key={item.href} href={item.href} onClick={cancel}>{item.title}</a>)}{navigation.length>5&&<details className="wb-more"><summary>More</summary><div>{navigation.slice(5).map(item=><a key={item.href} href={item.href} onClick={cancel}>{item.title}</a>)}</div></details>}</nav>
      <details className="wb-mobile-menu"><summary aria-label="Open website navigation"><Menu size={22}/></summary><nav aria-label="Mobile website navigation"><a href={publicSitePath(site)} onClick={cancel}>Home</a>{navigation.map(item=><a key={item.href} href={item.href} onClick={cancel}>{item.title}</a>)}</nav></details>
    </div></header>
    <Content id="website-main">
      {(!hasHero||page.kind==='post'||feed)&&<header className="wb-container wb-page-title"><p className="wb-eyebrow">{page.kind==='post'?'From the journal':site.name}</p><h1>{page.title}</h1>{page.description&&<p>{page.description}</p>}{page.published_at&&<time dateTime={page.published_at}>{businessDate(page.published_at)}</time>}</header>}
      {sections.map(section=>{
        const Heading=section.type==='hero'&&page.kind!=='post'&&heroCount++===0?'h1':'h2';
        return <section key={section.id} id={section.anchor||section.id} className={`wb-section wb-section--${section.type} wb-layout-${section.layout||'default'} wb-space-${section.spacing||'default'} wb-tone-${section.tone||'default'}${section.image_url?' wb-section--with-image':''}`}><div className="wb-container">
          <div className="wb-section-copy">{section.eyebrow&&<p className="wb-eyebrow">{section.eyebrow}</p>}{section.heading&&<Heading>{section.heading}</Heading>}{section.body&&<p className="wb-body">{section.body}</p>}{section.button_text&&section.button_url&&<a href={section.button_url} onClick={cancel} className="wb-button">{section.button_text}<ArrowRight size={16}/></a>}</div>
          {section.image_url&&<ProductImage className="wb-section-image" src={section.image_url} alt={section.image_alt||'Section image'} loading={section.type==='hero'?'eager':'lazy'}/>}
          {['features','gallery'].includes(section.type)&&<div className="wb-grid">{(section.items||[]).map((item,index)=><article key={index} className="wb-card">{item.image_url&&<ProductImage src={item.image_url} alt={item.image_alt||item.heading||'Gallery image'}/>}<span className="wb-card-number">{String(index+1).padStart(2,'0')}</span>{item.heading&&<h3>{item.heading}</h3>}{item.body&&<p>{item.body}</p>}{item.button_text&&item.button_url&&<a className="wb-text-link" href={item.button_url} onClick={cancel}>{item.button_text}<ArrowUpRight size={16}/></a>}</article>)}</div>}
          {section.type==='testimonials'&&<div className="wb-grid">{(section.items||[]).map((item,index)=><figure key={index} className="wb-card"><blockquote className="wb-body">{item.body}</blockquote><figcaption className="wb-eyebrow">{item.heading}</figcaption></figure>)}</div>}
          {section.type==='faq'&&<div className="wb-faq">{(section.items||[]).map((item,index)=><details key={index}><summary>{item.heading}</summary><p>{item.body}</p></details>)}</div>}
          {section.type==='contact'&&<div className="wb-contact">{site.contact_email&&<a href={`mailto:${site.contact_email}`} onClick={cancel}><Mail size={18}/>{site.contact_email}</a>}{site.contact_phone&&<a href={`tel:${site.contact_phone}`} onClick={cancel}><Phone size={18}/>{site.contact_phone}</a>}{site.address&&<p><MapPin size={18}/>{site.address}</p>}</div>}
          {section.type==='posts'&&((site.recent_posts||[]).length?postCards(site.recent_posts):<p className="wb-empty">New stories are on the way.</p>)}
        </div></section>;
      })}
      {feed&&<section className="wb-container wb-feed">{feed.items.length?postCards(feed.items):<p className="wb-empty">New stories are on the way.</p>}<nav aria-label="Blog pages" className="wb-pagination">{feed.page>1&&<Link href={`?page=${feed.page-1}`}>← Previous</Link>}<span>Page {feed.page}</span>{feed.page*feed.page_size<feed.total&&<Link href={`?page=${feed.page+1}`}>Next →</Link>}</nav></section>}
    </Content>
    <footer className="wb-footer"><div className="wb-container"><a className="wb-footer-name" href={publicSitePath(site)} onClick={cancel}>{site.name}</a><p>{site.description||'A space for ideas, information and the things that matter.'}</p><span>Built with Arise</span></div></footer>
  </div>;
}
