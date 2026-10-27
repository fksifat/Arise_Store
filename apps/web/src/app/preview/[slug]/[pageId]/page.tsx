'use client';
import {use,useEffect,useState} from 'react';
import Link from 'next/link';
import {useAuth} from '@/lib/auth';
import {fetchApi} from '@/lib/api';
import {Website} from '@/components/website/Website';
export default function DraftPreview({params}:{params:Promise<{slug:string;pageId:string}>}){
 const {slug,pageId}=use(params);const {user,loading}=useAuth();const [data,setData]=useState<any>(null);const [error,setError]=useState('');
 useEffect(()=>{if(!user)return;let cancelled=false;(async()=>{try{const sites=await fetchApi<any[]>('/shops');const site=sites.find(site=>site.slug===slug);if(!site)throw new Error('You do not have access to this website.');const [page,theme]=await Promise.all([fetchApi(`/shops/${site.id}/pages/${pageId}`),fetchApi<any>(`/shops/${site.id}/pages/preview-site`)]);if(!cancelled)setData({site:theme,page});}catch(error:any){if(!cancelled)setError(error.message);}})();return()=>{cancelled=true;};},[user,slug,pageId]);
 if(loading)return <p role="status" className="p-8">Checking preview access…</p>;
 if(!user)return <div className="p-8"><h1 className="text-xl font-semibold">Sign in to preview this draft</h1><Link href="/login" className="mt-4 inline-block underline">Sign in</Link></div>;
 return <><div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 px-6 py-4 text-xs text-white"><span>Private draft preview · Links are disabled</span><Link href={`/dashboard/pages/${pageId}`} className="underline">Back to editor</Link></div>{error?<p role="alert" className="p-8 text-rose-700">{error}</p>:data?<Website site={data.site} page={data.page} preview/>:<p role="status" className="p-8">Loading draft…</p>}</>;
}
