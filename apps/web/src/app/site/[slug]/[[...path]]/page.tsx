import {cache} from 'react';
import {notFound,redirect} from 'next/navigation';
import {fetchApi,ApiError} from '@/lib/api';
import {Website} from '@/components/website/Website';

type Params={slug:string;path?:string[]};
const pageIndex=(value?:string)=>{const result=Number(value);return Number.isInteger(result)&&result>=1&&result<=10000?result:1;};
const load=cache(async(slug:string,path:string,pageNumber:number)=>{
  const query=`shop=${encodeURIComponent(slug)}`;
  try{
    if(!path){
      const site=await fetchApi<any>(`/public/website?${query}`,{cache:'no-store'});
      if(site.website_type==='online_store')redirect(`/store/${slug}`);
    }
    if(path==='blog'){
      const feed=await fetchApi<any>(`/public/website/posts?${query}&page=${pageNumber}`,{cache:'no-store'});
      return {site:feed.site,page:{title:'Blog',description:'Articles, ideas and the latest updates.',sections:[]},feed};
    }
    const pieces=path?path.split('/'):['home'];
    const kind=pieces[0]==='blog'&&pieces.length===2?'post':'page';
    if((kind==='page'&&pieces.length!==1)||pieces.length>2)notFound();
    const pageSlug=kind==='post'?pieces[1]:pieces[0];
    const data=await fetchApi<any>(`/public/website/content/${kind}/${encodeURIComponent(pageSlug)}?${query}`,{cache:'no-store'});
    return {...data,feed:undefined};
  }catch(error){if(error instanceof ApiError&&[403,404].includes(error.status))notFound();throw error;}
});
export async function generateMetadata({params,searchParams}:{params:Promise<Params>;searchParams:Promise<{page?:string}>}){
  const {slug,path}=await params;const query=await searchParams;
  const data=await load(slug,(path||[]).join('/'),pageIndex(query.page));
  return {title:`${data.page.title} | ${data.site.name}`,description:data.page.description||data.site.description||undefined};
}
export default async function PublicWebsitePage({params,searchParams}:{params:Promise<Params>;searchParams:Promise<{page?:string}>}){
  const {slug,path}=await params;const query=await searchParams;
  const data=await load(slug,(path||[]).join('/'),pageIndex(query.page));
  return <Website site={data.site} page={data.page} feed={data.feed}/>;
}
