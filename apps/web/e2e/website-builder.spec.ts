import { finishSetup } from './_helpers/setup';
import {test,expect} from '@playwright/test';
import {websiteTypes,websiteThemes} from '../src/lib/sites';
const run=process.env.E2E_RUN_ID||Date.now().toString();
const password='Builder-browser-password-123';

async function account(page:any,baseURL:string,suffix:string){
 const headers={Origin:new URL(baseURL).origin};
 const registration={headers,data:{name:'Website Owner',email:`e2e-${run}-${suffix}@example.com`,password}};
 let response=await page.request.post('/api/v1/auth/register',registration);
 // Each website type needs its own owner; respect the shared IP's registration limit.
 if(response.status()===429){
  const retryAfter=Number(response.headers()['retry-after']);
  expect(retryAfter).toBeGreaterThan(0);expect(retryAfter).toBeLessThanOrEqual(60);
  await new Promise(resolve=>setTimeout(resolve,retryAfter*1000));
  response=await page.request.post('/api/v1/auth/register',registration);
 }
 expect(response.status()).toBe(201);return headers;
}

test('business onboarding, section editing and private-to-public publishing work',async({page,context,baseURL})=>{
 test.setTimeout(120000);page.setDefaultTimeout(15000);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/register');
 await page.getByLabel('Your Full Name',{exact:false}).fill('Builder Owner');
 await page.getByLabel('Email Address',{exact:false}).fill(`e2e-${run}-builder@example.com`);
 await page.getByLabel('Password',{exact:true}).fill(password);
 await page.getByLabel('Confirm Password',{exact:true}).fill(password);
  await page.getByRole('checkbox', {name:/I agree to Arise/}).check();
 await page.getByRole('button',{name:'Create account',exact:true}).click();
 await finishSetup(page, 'Business website', 'Builder Business', `builder-${run}`);
 await expect(page.getByRole('heading',{name:'Website overview',exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'Products',exact:true})).toHaveCount(0);
 const site=(await(await page.request.get('/api/v1/shops')).json())[0];expect(site.website_type).toBe('business');
 await page.goto('/dashboard/pages');
 await page.getByRole('link',{name:/Home.*Homepage/}).click();
 await expect(page.getByRole('heading',{name:'Page editor',exact:true})).toBeVisible();
 await page.getByLabel('Section heading',{exact:true}).fill('A business worth discovering');
 await page.getByLabel('Section text',{exact:true}).fill('Real information about a real business.');
 const toolbar=page.getByRole('banner',{name:'Console toolbar'});
 await toolbar.getByRole('button',{name:'Account profile',exact:true}).click();
 page.once('dialog',async dialog=>{expect(dialog.message()).toContain('Discard unsaved changes');await dialog.dismiss();});
 await toolbar.getByRole('region',{name:'Account profile',exact:true}).getByRole('button',{name:'Sign out',exact:true}).click();
 await expect(page.getByLabel('Section heading',{exact:true})).toHaveValue('A business worth discovering');
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Save draft',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Draft saved.');
 const privateTab=context.waitForEvent('page');await page.getByRole('link',{name:'Preview saved draft',exact:true}).click();const preview=await privateTab;
 await expect(preview.getByRole('heading',{name:'A business worth discovering',exact:true})).toBeVisible();
 await expect(preview.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);await preview.close();
 const visitorContext=await context.browser()!.newContext();const visitor=await visitorContext.newPage();
 expect((await visitor.goto(baseURL+`/site/${site.slug}`))?.status()).toBe(404);
 await page.getByRole('button',{name:'Publish page',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Publish your website from Overview');
 await page.goto('/dashboard');await page.getByRole('button',{name:'Publish website',exact:true}).click();
 await expect(page.locator('#merchant-content').getByRole('link',{name:'View website',exact:true})).toBeVisible();
 const response=await visitor.goto(baseURL+`/site/${site.slug}`);expect(response?.status()).toBe(200);
 await expect(visitor.getByRole('heading',{name:'A business worth discovering',exact:true})).toBeVisible();
 expect(await response!.text()).toContain('Real information about a real business.');
 await page.goto('/dashboard/pages');await page.getByRole('link',{name:/Home.*Homepage/}).click();
 await page.getByLabel('Section heading',{exact:true}).fill('Private next version');
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('Draft saved.');
 await visitor.reload();await expect(visitor.getByRole('heading',{name:'A business worth discovering',exact:true})).toBeVisible();await expect(visitor.getByText('Private next version',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Publish page',exact:true}).click();await expect(page.getByRole('status')).toContainText('Published content updated.');
 await visitor.reload();await expect(visitor.getByRole('heading',{name:'Private next version',exact:true})).toBeVisible();
 await page.getByRole('combobox',{name:'New section type',exact:true}).selectOption('faq');await page.getByRole('button',{name:'Add section',exact:true}).click();
 await page.getByLabel('Section heading',{exact:true}).fill('Frequently asked questions');await page.getByLabel('Item 1 heading',{exact:true}).fill('How do we begin?');await page.getByLabel('Item 1 body',{exact:true}).fill('Get in touch with our team.');
 await page.getByRole('button',{name:'Move section 5 up',exact:true}).click();await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('Draft saved.');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);await page.getByRole('button',{name:'Mobile',exact:true}).click();
 await page.screenshot({path:'../../.gravitas/sessions/website-builder/editor-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Publish page',exact:true}).click();await expect(page.getByRole('status')).toContainText('Published content updated.');
 await visitor.setViewportSize({width:390,height:844});await visitor.reload();await visitor.getByText('How do we begin?',{exact:true}).click();await expect(visitor.getByText('Get in touch with our team.',{exact:true})).toBeVisible();expect(await visitor.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 await visitorContext.close();expect(errors).toEqual([]);
});

test('pages, blog posts, color choices and draft URLs keep their publication boundaries',async({page,baseURL})=>{
 test.setTimeout(120000);page.setDefaultTimeout(15000);const headers=await account(page,baseURL!,'builder-content');
 const site=await(await page.request.post('/api/v1/shops',{headers,data:{name:'The Journal Website',slug:`journal-${run}`,website_type:'blog'}})).json();
 const home=(await(await page.request.get(`/api/v1/shops/${site.id}/pages`)).json()).items[0];
 expect((await page.request.post(`/api/v1/shops/${site.id}/pages/${home.id}/publish`,{headers,data:{expected_revision:home.revision}})).status()).toBe(200);
 expect((await page.request.post(`/api/v1/shops/${site.id}/publish`,{headers})).status()).toBe(200);
 await page.goto('/dashboard/blog');await page.getByRole('button',{name:'New post',exact:true}).click();
 await page.getByLabel('Post title',{exact:true}).fill('A first published article');await page.getByLabel('Post URL',{exact:true}).fill('first-article');await page.getByRole('button',{name:'Create post',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Post editor',exact:true})).toBeVisible();await page.getByLabel('Search description',{exact:true}).fill('An article about useful ideas.');await page.getByLabel('Section text',{exact:true}).fill('Words that belong to this website.\n<script>alert("not executable")</script>');
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('Draft saved.');
 await page.getByRole('button',{name:'Publish post',exact:true}).click();await expect(page.getByRole('status')).toContainText('Published content updated.');
 const published=await page.context().newPage();await published.goto(`/site/${site.slug}/blog`);await published.getByRole('link',{name:'A first published article',exact:true}).click();await expect(published.getByRole('heading',{name:'A first published article',exact:true})).toBeVisible();await expect(published.locator('meta[name="description"]')).toHaveAttribute('content','An article about useful ideas.');await expect(published.getByText('<script>alert("not executable")</script>',{exact:false})).toBeVisible();
 await page.goto('/dashboard/themes');await expect(page.locator('article[data-website-theme]')).toHaveCount(3);await page.getByLabel('Brand color',{exact:true}).fill('#ffffff');await page.getByRole('button',{name:'Save brand style',exact:true}).click();await expect(page.getByRole('status')).toContainText('Brand style saved.');
 for(const theme of websiteThemes.filter(theme=>theme.website_type==='blog'&&theme.key!=='blog-journal')){await page.locator(`[data-website-theme="${theme.key}"]`).getByRole('button',{name:'Apply theme',exact:true}).click();await expect(page.getByRole('status')).toContainText('is now applied.');await published.reload();await expect(published.getByRole('heading',{name:'A first published article',exact:true})).toBeVisible();}
 const setting=await(await page.request.get(`/api/v1/shops/${site.id}/theme-settings`)).json();expect(setting.settings.brand.primary_color).toBe('#ffffff');
 await page.goto('/dashboard/pages');await page.getByRole('button',{name:'New page',exact:true}).click();await page.getByLabel('Page title',{exact:true}).fill('About the journal');await page.getByLabel('Page URL',{exact:true}).fill('about');await page.getByRole('button',{name:'Create page',exact:true}).click();await page.getByRole('button',{name:'Publish page',exact:true}).click();await expect(page.getByRole('status')).toContainText('Published content updated.');
 await published.goto(`/site/${site.slug}`);await published.getByRole('navigation',{name:'Website navigation',exact:true}).getByRole('link',{name:'About the journal',exact:true}).click();await expect(published.getByRole('heading',{name:'About the journal',exact:true})).toBeVisible();
 await page.getByLabel('URL name',{exact:true}).fill('our-story');await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('Draft saved.');
 expect((await published.request.get(`/site/${site.slug}/about`)).status()).toBe(200);expect((await published.request.get(`/site/${site.slug}/our-story`)).status()).toBe(404);
 await page.getByRole('button',{name:'Publish page',exact:true}).click();await expect(page.getByRole('status')).toContainText('Published content updated.');expect((await published.request.get(`/site/${site.slug}/about`)).status()).toBe(404);expect((await published.request.get(`/site/${site.slug}/our-story`)).status()).toBe(200);
 await page.getByRole('button',{name:'Unpublish content',exact:true}).click();await expect(page.getByRole('status')).toContainText('Content unpublished.');expect((await published.request.get(`/site/${site.slug}/our-story`)).status()).toBe(404);await published.close();
});

for(const type of websiteTypes.filter(type=>type.key!=='online_store'))test(`${type.label} renders all three themes and keeps commerce separate`,async({page,baseURL})=>{
 test.setTimeout(150000);page.setDefaultTimeout(15000);const headers=await account(page,baseURL!,`builder-types-${type.key}`);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const site=await(await page.request.post('/api/v1/shops',{headers,data:{name:`${type.label} example`,slug:`${type.key.replaceAll('_','-')}-${run}`,website_type:type.key}})).json();
  const content=(await(await page.request.get(`/api/v1/shops/${site.id}/pages`)).json()).items[0];
  expect((await page.request.post(`/api/v1/shops/${site.id}/pages/${content.id}/publish`,{headers,data:{expected_revision:content.revision}})).status()).toBe(200);expect((await page.request.post(`/api/v1/shops/${site.id}/publish`,{headers})).status()).toBe(200);
  for(const theme of websiteThemes.filter(theme=>theme.website_type===type.key)){
   expect((await page.request.put(`/api/v1/shops/${site.id}/theme-settings`,{headers,data:{theme_key:theme.key,settings_json:{brand:{primary_color:theme.accent}}}})).status()).toBe(200);
   for(const width of [1440,390]){await page.setViewportSize({width,height:width===1440?1000:844});expect((await page.goto(`/site/${site.slug}`))?.status()).toBe(200);await expect(page.locator('.wb h1')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);}
  }
  expect((await page.request.get('/api/v1/public/products',{headers:{'X-Shop-Slug':site.slug}})).status()).toBe(404);
 expect(errors).toEqual([]);
});
