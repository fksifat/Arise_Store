import {test,expect} from '@playwright/test';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {websiteThemes} from '../src/lib/sites';
import {storefrontThemes} from '../src/lib/storefront-themes';

const manifestPath=process.env.THEME_REVIEW_MANIFEST;
const accounts=manifestPath?JSON.parse(readFileSync(manifestPath,'utf8')).accounts:[];
const output=resolve('../../.gravitas/sessions/theme-quality');
const themes=[...websiteThemes,...storefrontThemes];

if(!manifestPath)test.skip('36-account theme review requires the private local manifest',()=>{});
else for(const preset of themes){
 test(`${preset.key}: its own account, editable design, desktop and mobile`,async({page,context,baseURL})=>{
  test.setTimeout(90000);context.setDefaultTimeout(10000);
  // Keep this retained-account review below the shared local API rate limit.
  await new Promise(resolve=>setTimeout(resolve,3000));
  expect(['localhost','127.0.0.1']).toContain(new URL(baseURL!).hostname);
  const account=accounts.find((item:any)=>item.theme_key===preset.key);
  expect(account).toBeTruthy();
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const headers={Origin:new URL(baseURL!).origin};
  const login=await page.request.post('/api/v1/auth/login',{headers,data:{email:account.email,password:account.password}});expect(login.status()).toBe(200);
  const who=await page.request.get('/api/v1/auth/me');expect(who.status()).toBe(200);expect((await who.json()).email).toBe(account.email);
  const shops=await(await page.request.get('/api/v1/shops')).json();expect(shops).toHaveLength(1);expect(shops[0].id).toBe(account.site_id);
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/dashboard/themes');
  await page.getByLabel('Brand color hex',{exact:true}).fill('#245d50');
  await page.getByRole('combobox',{name:'Heading typography',exact:true}).selectOption('serif');
  await page.getByRole('button',{name:'Save brand style',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Brand style saved.'})).toBeVisible();
  const visitor=await context.newPage();await visitor.goto(account.url);
  await expect(visitor.getByRole('heading',{level:1})).toBeVisible();
  expect(await visitor.getByRole('heading',{level:1}).evaluate(el=>getComputedStyle(el).fontFamily)).toContain('Georgia');
  await page.getByLabel('Brand color hex',{exact:true}).fill(preset.accent);
  await page.getByRole('combobox',{name:'Heading typography',exact:true}).selectOption('theme');
  await page.getByRole('button',{name:'Save brand style',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Brand style saved.'})).toBeVisible();
  if(account.website_type!=='online_store'){
   await page.goto(`/dashboard/pages/${account.home_id}`);
   await expect(page.locator('#merchant-content main')).toHaveCount(0);
   const savedPage=await(await page.request.get(`/api/v1/shops/${account.site_id}/pages/${account.home_id}`)).json();await expect(page.getByLabel('Section heading',{exact:true})).toHaveValue(savedPage.sections[0].heading);
   await page.getByRole('combobox',{name:'Layout',exact:true}).selectOption('center');
   await page.getByRole('combobox',{name:'Section spacing',exact:true}).selectOption('compact');
   await page.getByRole('combobox',{name:'Background',exact:true}).selectOption('accent');
   await page.getByLabel('Section anchor',{exact:true}).fill('review-intro');
   if(preset.key==='business-studio'){await page.getByRole('combobox',{name:'Layout',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:resolve(output,'editor-controls.png')});}
   await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('Draft saved.');
   await page.reload();await expect(page.getByLabel('Section anchor',{exact:true})).toHaveValue('review-intro');
   await visitor.reload();await expect(visitor.locator('#review-intro')).toHaveCount(0);
   await page.getByRole('button',{name:'Publish page',exact:true}).click();await expect(page.getByRole('status')).toContainText('Published content updated.');
   await visitor.reload();await expect(visitor.locator('#review-intro')).toHaveClass(/wb-layout-center.*wb-space-compact.*wb-tone-accent/);
   const design=await visitor.locator('#review-intro').evaluate(element=>({padding:getComputedStyle(element).paddingTop,background:getComputedStyle(element).backgroundColor,alignment:getComputedStyle(element.querySelector('.wb-container')!).textAlign}));
   expect(await visitor.locator('#review-intro h1').evaluate(element=>getComputedStyle(element).color)).toBe(await visitor.locator('#review-intro .wb-body').evaluate(element=>getComputedStyle(element).color));
   expect(design).toEqual({padding:'42px',background:`rgb(${[1,3,5].map(offset=>parseInt(preset.accent.slice(offset,offset+2),16)).join(', ')})`,alignment:'center'});
   await page.getByRole('combobox',{name:'Layout',exact:true}).selectOption('default');await page.getByRole('combobox',{name:'Section spacing',exact:true}).selectOption('default');await page.getByRole('combobox',{name:'Background',exact:true}).selectOption('default');await page.getByLabel('Section anchor',{exact:true}).fill('');
   await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('Draft saved.');
   await page.getByRole('button',{name:'Publish page',exact:true}).click();await expect(page.getByRole('status')).toContainText('Published content updated.');
   const items=page.getByRole('button',{name:/ (features|gallery) · Visible$/});
   if(account.website_type!=='blog'){
    await expect(items).toHaveCount(1);
    await items.first().click();const first=await page.getByLabel('Item 1 heading',{exact:true}).inputValue();
    await page.getByRole('button',{name:'Move item 1 down',exact:true}).click();await expect(page.getByLabel('Item 1 heading',{exact:true})).not.toHaveValue(first);
    await page.getByRole('button',{name:'Move item 2 up',exact:true}).click();await expect(page.getByLabel('Item 1 heading',{exact:true})).toHaveValue(first);
    if(preset.key==='business-studio'){
     await page.getByRole('combobox',{name:'Background',exact:true}).selectOption('accent');await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('Draft saved.');await page.getByRole('button',{name:'Publish page',exact:true}).click();await expect(page.getByRole('status')).toContainText('Published content updated.');
     await visitor.reload();expect(await visitor.locator('#details .wb-card').first().evaluate(element=>({background:getComputedStyle(element).backgroundColor,color:getComputedStyle(element.querySelector('p')!).color}))).toEqual({background:'rgba(0, 0, 0, 0)',color:'rgb(255, 255, 255)'});
     await page.getByRole('combobox',{name:'Background',exact:true}).selectOption('default');await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('Draft saved.');await page.getByRole('button',{name:'Publish page',exact:true}).click();await expect(page.getByRole('status')).toContainText('Published content updated.');
    }
   }
  }else{
   await page.goto('/dashboard/settings');
   const headline=page.getByLabel('Banner headline',{exact:true});await expect(headline).toBeVisible();const original='title' in preset?preset.title:await headline.inputValue();
   await headline.fill('A thoughtful edit.\nFor your everyday.');
   await page.getByLabel('Banner button URL',{exact:true}).fill('#store-info');
   await page.getByLabel('Store story heading',{exact:true}).fill('Selected with care. Made personal.');
   await page.getByLabel('Footer tagline',{exact:true}).fill('Useful things. Thoughtful details.');
   await page.getByRole('button',{name:'Save banner & offers',exact:true}).click();await expect(page.getByRole('status')).toContainText('Banner and offers saved.');
   await page.reload();await expect(page.getByLabel('Banner headline',{exact:true})).toHaveValue('A thoughtful edit.\nFor your everyday.');await visitor.reload();await expect(visitor.getByRole('heading',{level:1})).toHaveText('A thoughtful edit. For your everyday.');
   await expect(visitor.locator('.sf-primary-link').first()).toHaveAttribute('href','#store-info');
   await headline.fill(original);await page.getByLabel('Banner button URL',{exact:true}).fill('#catalog');
   await page.getByRole('button',{name:'Save banner & offers',exact:true}).click();await expect(page.getByRole('status')).toContainText('Banner and offers saved.');
   await page.reload();await expect(page.getByLabel('Store story heading',{exact:true})).toHaveValue('Selected with care. Made personal.');
  }
  mkdirSync(output,{recursive:true});
  for(const width of [1440,390]){
   await visitor.setViewportSize({width,height:width===1440?1000:844});await visitor.goto(account.url);
   await expect(visitor.getByRole('heading',{level:1})).toBeVisible();
   for(const image of await visitor.locator('img').all()){await image.scrollIntoViewIfNeeded();await image.evaluate(async image=>{if(image instanceof HTMLImageElement)await image.decode().catch(()=>{});});}await visitor.evaluate(()=>window.scrollTo(0,0));
   const broken=await visitor.locator('img').evaluateAll(images=>images.filter(image=>image instanceof HTMLImageElement&&(!image.complete||image.naturalWidth===0)).map(image=>image.getAttribute('src')));expect(broken).toEqual([]);
   await expect(visitor.getByRole('img',{name:/image unavailable/})).toHaveCount(0);
   const contrast=await visitor.locator(account.website_type==='online_store'?'.sf-hero-copy>p':'.wb-body').first().evaluate(element=>{
    const rgb=(value:string)=>(value.match(/[\d.]+/g)||[]).map(Number);
    let parent:Element|null=element;let background=[255,255,255];
    while(parent){const value=rgb(getComputedStyle(parent).backgroundColor);if(value.length===3||value[3]===1){background=value;break;}parent=parent.parentElement;}
    const luminance=(value:number[])=>value.slice(0,3).map(channel=>{const c=channel/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((sum,c,index)=>sum+c*[.2126,.7152,.0722][index],0);
    const text=rgb(getComputedStyle(element).color);if(text.length===4)for(let i=0;i<3;i++)text[i]=text[i]*text[3]+background[i]*(1-text[3]);
    const a=luminance(text),b=luminance(background);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
   });expect(contrast).toBeGreaterThanOrEqual(4.5);
   expect(await visitor.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
   if(width===390&&preset.key==='general-store'){
    const hero=await visitor.locator('.sf-hero-copy').evaluate(element=>({width:element.getBoundingClientRect().width,height:element.querySelector('h1')!.getBoundingClientRect().height}));
    expect(hero.width).toBeGreaterThan(300);expect(hero.height).toBeLessThan(230);
   }
   if(width===390){
    const menu=account.website_type==='online_store'?visitor.getByRole('button',{name:'Open menu',exact:true}):visitor.locator('summary[aria-label="Open website navigation"]');await menu.click();
    await expect(visitor.getByRole('navigation',{name:account.website_type==='online_store'?'Mobile navigation':'Mobile website navigation',exact:true})).toBeVisible();
    if(account.website_type==='online_store'){await visitor.keyboard.press('Escape');await expect(menu).toHaveAttribute('aria-expanded','false');}
    else await menu.click();
   }
   await visitor.screenshot({path:resolve(output,`${preset.key}-${width}.png`),fullPage:true});
   if(width===1440&&process.env.UPDATE_THEME_PREVIEWS==='true')await visitor.screenshot({path:resolve(`public/themes/previews/${preset.key}.jpg`),type:'jpeg',quality:82});
  }
  expect(errors).toEqual([]);await visitor.close();
  const final=await(await page.request.get(`/api/v1/shops/${account.site_id}/theme-settings`,{headers})).json();expect(final.theme_key).toBe(preset.key);expect(final.settings.brand.font_family).toBe('theme');
 });
}
