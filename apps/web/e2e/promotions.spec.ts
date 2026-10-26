import { test, expect } from '@playwright/test';
import { storefrontThemes } from '../src/lib/storefront-themes';
const runId=process.env.E2E_RUN_ID || Date.now().toString();

test('merchant customizes banner and offers in Settings; every theme preserves them and checkout records the discount',async({page,context,baseURL})=>{
  test.setTimeout(150000);
  page.setDefaultTimeout(20000);
  const headers={Origin:new URL(baseURL!).origin};
  const post=async(path:string,data:any)=>{
    const response=await page.request.post(`/api/v1${path}`,{headers,data});
    expect(response.ok(),await response.text()).toBe(true);return response.json();
  };
  await post('/auth/register',{name:'Offers Merchant',email:`e2e-${runId}-promotions@example.com`,password:'Browser-test-password-123'});
  const shop=await post('/shops',{name:'The Offer Store',slug:`offers-${runId}`,theme_key:'tech-cosmetics'});
  const product=await post(`/shops/${shop.id}/products`,{name:'Studio Headphones',price_minor:10000,compare_at_price_minor:20000,stock_quantity:0,variants:[{title:'Studio edition',price_minor:12500,stock_quantity:6}]});
  await post(`/shops/${shop.id}/publish`,{});
  await page.goto('/dashboard/settings');
  const image=new URL('/themes/assets/tech.jpg',baseURL).href;
  await page.getByLabel('Banner image URL',{exact:true}).fill(image);
  await page.getByLabel('Banner small heading',{exact:true}).fill('The festival edit');
  await page.getByLabel('Banner headline',{exact:true}).fill('Your sound. Your special price.');
  await page.getByLabel('Banner description',{exact:true}).fill('Discover something worth listening to.');
  await page.getByLabel('Banner button text',{exact:true}).fill('Shop the deals');
  await page.getByLabel('Banner image description',{exact:true}).fill('Studio headphones on a yellow background');
  await page.getByRole('checkbox',{name:'Enable offer',exact:true}).check();
  await page.getByLabel('Offer message',{exact:true}).fill('Festival tech offers');
  await page.getByLabel('Store-wide discount (%)',{exact:true}).fill('20');
  await page.getByRole('button',{name:'Save banner & offers',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Banner and offers saved.'})).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Banner headline',{exact:true})).toHaveValue('Your sound. Your special price.');
  await expect(page.getByLabel('Store-wide discount (%)',{exact:true})).toHaveValue('20');
  await page.locator('section[aria-labelledby="storefront-settings-heading"]').screenshot({path:'../../.gravitas/sessions/promotions/settings.png'});
  const visitor=await context.newPage(); visitor.setDefaultTimeout(20000);
  for(const preset of [...storefrontThemes.filter(theme=>theme.key!=='tech-cosmetics'),storefrontThemes.find(theme=>theme.key==='tech-cosmetics')!]){
    await page.goto('/dashboard/themes');
    await page.locator(`article[data-theme-key="${preset.key}"]`).getByRole('button',{name:'Apply theme',exact:true}).click();
    await expect(page.getByRole('status')).toContainText(`${preset.name} is now applied`);
    const settings=await (await page.request.get(`/api/v1/shops/${shop.id}/theme-settings`)).json();
    expect(settings.settings.promotion).toEqual({enabled:true,message:'Festival tech offers',discount_percent:20});
    for(const width of [1440,390]){
      await visitor.setViewportSize({width,height:width===1440?1000:844});
      await visitor.goto(`/store/${shop.slug}`);
      await expect(visitor.locator('.sf-hero h1')).toHaveText('Your sound. Your special price.');
      await expect(visitor.locator('.sf-hero-image')).toHaveAttribute('src',image);
      await expect(visitor.getByRole('link',{name:'Shop the deals',exact:true})).toBeVisible();
      await expect(visitor.getByRole('complementary',{name:'Store offer',exact:true})).toContainText('Festival tech offers');
      await expect(visitor.getByRole('complementary',{name:'Store offer',exact:true})).toContainText('20% off products at checkout');
      expect(await visitor.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
      await expect(visitor.locator('.sf-hero-image')).toHaveJSProperty('complete',true);
      expect(await visitor.locator('.sf-hero-image').evaluate((image:HTMLImageElement)=>image.naturalWidth)).toBeGreaterThan(0);
      await visitor.screenshot({path:`../../.gravitas/sessions/promotions/${preset.key}-${width}.png`});
    }
  }
  await visitor.getByRole('button',{name:'Add to Bag',exact:true}).click();
  await expect(visitor.getByText('Store discount',{exact:true})).toBeVisible();
  await expect(visitor.getByText('−৳25',{exact:true})).toBeVisible();
  await visitor.getByRole('button',{name:'Proceed to Checkout',exact:true}).click();
  const checkout=visitor.getByRole('dialog',{name:'Checkout',exact:true});
  await expect(checkout.getByText('Store discount: −৳25',{exact:true})).toBeVisible();
  await checkout.getByPlaceholder('e.g. Tanvir Ahmed').fill('Offer Customer');
  await checkout.getByPlaceholder('e.g. 01712345678').fill('01712345678');
  await checkout.getByPlaceholder('House number, Road, Area, Thana, District').fill('House 10, Dhaka');
  await checkout.getByRole('button',{name:/Confirm Order/}).click();
  await expect(visitor.getByText('Thank you for your order!',{exact:true})).toBeVisible();
  const orders=await (await page.request.get(`/api/v1/shops/${shop.id}/orders`)).json();
  expect(orders).toHaveLength(1);expect(orders[0].subtotal_minor).toBe(12500);expect(orders[0].discount_minor).toBe(2500);expect(orders[0].delivery_fee_minor).toBe(6000);expect(orders[0].total_minor).toBe(16000);
  await visitor.getByRole('link',{name:'Track this order',exact:true}).click();
  await visitor.getByLabel('Mobile Number').fill('01712345678');
  await visitor.getByRole('button',{name:'Track Status',exact:true}).click();
  await expect(visitor.getByText('Store discount:',{exact:true})).toBeVisible();
  await expect(visitor.getByText('−৳25',{exact:true})).toBeVisible();
  await page.goto('/dashboard/settings');
  await page.getByRole('checkbox',{name:'Enable offer',exact:true}).uncheck();
  await page.getByRole('button',{name:'Save banner & offers',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Banner and offers saved.'})).toBeVisible();
  await visitor.goto(`/store/${shop.slug}`);
  await expect(visitor.locator('.sf-hero h1')).toBeVisible();
  await expect(visitor.getByRole('complementary',{name:'Store offer',exact:true})).toHaveCount(0);
  const quote=await visitor.request.post('/api/v1/public/cart/validate',{headers:{...headers,'X-Shop-Slug':shop.slug},data:{items:[{product_id:product.id,variant_id:product.variants[0].id,quantity:1}],shipping_city:'Dhaka'}});
  expect(quote.ok()).toBe(true);const total=await quote.json();expect(total.discount_minor).toBe(0);expect(total.total_minor).toBe(18500);
  await visitor.close();
});

test('custom banner text stays within every mobile theme layout',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  let themeKey='fashion-modern';
  await page.route('**/api/v1/public/store',route=>route.fulfill({json:{name:'Custom Banner Store',slug:'banner-test',description:'A test store',status:'published',inside_dhaka_delivery_fee_minor:'6000',outside_dhaka_delivery_fee_minor:'12000',discount_percent:20,categories:[],theme:{theme_key:themeKey,settings:{hero:{title:'W'.repeat(160),subtitle:'S'.repeat(500),eyebrow:'E'.repeat(80),button_text:'B'.repeat(60)},promotion:{enabled:true,message:'O'.repeat(160),discount_percent:20}}}}}));
  await page.route('**/api/v1/public/products',route=>route.fulfill({json:[]}));
  for(const preset of storefrontThemes){
    themeKey=preset.key;
    await page.goto('/store/banner-test');
    await expect(page.locator('.sf-hero h1')).toHaveText('W'.repeat(160));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  }
});
