import { test, expect, type Page } from '@playwright/test';

const runId = process.env.E2E_RUN_ID || Date.now().toString();
const shop = { id:'shop-one', name:'Merchant Test Store', slug:'merchant-test', status:'draft', description:'Our shop', contact_email:null, contact_phone:null, address:null, logo_url:null, banner_url:null, inside_dhaka_delivery_fee_minor:'2900', outside_dhaka_delivery_fee_minor:'8000' };
const products = [
  {id:'one',name:'Active item',status:'active',track_inventory:true,stock_quantity:20,price_minor:10000,variants:[],images:[],category_ids:[]},
  {id:'two',name:'Variant item',status:'active',track_inventory:true,stock_quantity:0,price_minor:20000,variants:[{is_active:true,stock_quantity:1},{is_active:true,stock_quantity:20}],images:[],category_ids:[]},
  {id:'three',name:'Draft item',status:'draft',track_inventory:true,stock_quantity:0,price_minor:30000,variants:[],images:[],category_ids:[]},
];
const orders = ['pending','delivered','cancelled','returned','refunded'].map((status,index)=>({id:`order-${index}`,order_number:`ORD-TEST-${index}`,status,total_minor:(index+1)*10000,customer_name:'A customer',customer_phone:'01712345678',created_at:'2026-10-25T09:00:00Z',payment_method:'cod',payment_status:'unpaid',items:[],allowed_statuses:[]}));

async function mockMerchant(page: Page) {
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith('/auth/me') ? {id:'merchant',name:'Test Merchant',email:'merchant@example.com',role:'merchant'}
      : path.endsWith('/shops') ? [shop]
      : path.endsWith('/products') ? products
      : path.endsWith('/orders') ? orders
      : path.endsWith('/subscription') ? {plan_name:'Starter',status:'trial',billing_interval:'monthly',current_period_end:'2026-11-08T09:00:00Z'}
      : path.endsWith('/domains') ? [{id:'domain',hostname:'shop.example.com',domain_type:'custom',verification_status:'pending',routing_status:'inactive',verification_record:'_arise-verification.shop.example.com',verification_value:'x'.repeat(120)}]
      : path.endsWith('/theme-settings') ? {theme_key:'fashion-modern',settings:{brand:{}}}
      : [];
    return route.fulfill({json:data});
  });
}

test('overview separates delivered value, active products and low-stock options', async ({page}) => {
  await mockMerchant(page); await page.goto('/dashboard');
  await expect(page.getByRole('link',{name:'Orders to fulfill: 1',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Delivered order value: ৳200',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Active products: 2',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Total orders: 5',exact:true})).toBeVisible();
  await expect(page.getByText('1 products with low-stock options',{exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'View storefront',exact:true})).toHaveCount(0);
  await expect(page.getByText('https://merchant-test.arisestore.com')).toHaveCount(0);
  await page.getByRole('link',{name:'1 products with low-stock options',exact:false}).click();
  await expect(page.getByRole('checkbox',{name:/Only low-stock products/})).toBeChecked();
  await expect(page.getByText('Variant item',{exact:true})).toBeVisible();
  await expect(page.getByText('Draft item',{exact:true})).not.toBeVisible();
});

test('merchant pages recover request failures and remain usable on mobile', async ({page}) => {
  await mockMerchant(page);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:390,height:844});
  await page.route('**/api/v1/shops',route=>route.fulfill({status:503,json:{detail:'Stores unavailable'}}),{times:1});
  await page.goto('/dashboard');
  await expect(page.locator('#merchant-content').getByRole('alert')).toContainText('Stores unavailable');
  await page.getByRole('button',{name:'Try again',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Store overview',exact:true})).toBeVisible();
  const cases = [
    ['/dashboard','**/shops/shop-one/orders'],
    ['/dashboard/orders','**/shops/shop-one/orders'],
    ['/dashboard/products','**/shops/shop-one/products'],
    ['/dashboard/categories','**/shops/shop-one/categories'],
    ['/dashboard/themes','**/api/v1/themes'],
    ['/dashboard/domains','**/shops/shop-one/domains'],
    ['/dashboard/subscription','**/shops/shop-one/payments'],
  ];
  for (const [path,endpoint] of cases) await test.step(path,async()=>{
    await page.route(endpoint,route=>route.fulfill({status:503,json:{detail:'Temporarily unavailable'}}),{times:1});
    await page.goto(path);
    await expect(page.locator('#merchant-content').getByRole('alert')).toContainText('Temporarily unavailable');
    await page.getByRole('button',{name:'Try again',exact:true}).click();
    await expect(page.locator('#merchant-content').getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('heading',{level:1})).toBeVisible();
    expect(await page.locator('#merchant-content').evaluate(el=>el.getBoundingClientRect().top)).toBeLessThanOrEqual(65);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  });
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  const menu=page.getByRole('dialog',{name:'Dashboard navigation',exact:true});
  await expect(menu).toBeVisible();
  await menu.getByRole('link',{name:'Settings',exact:true}).click();
  await expect(menu).not.toBeVisible();
  await expect(page.getByRole('heading',{name:'Store Settings',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  await page.keyboard.press('Escape');await expect(menu).not.toBeVisible();
  await expect(page.getByRole('button',{name:'Open navigation',exact:true})).toBeFocused();
  expect(errors).toEqual([]);
});

test('merchant completes store setup, fulfillment, billing request and store switching', async ({page,baseURL}) => {
  test.setTimeout(120000);
  const headers={Origin:new URL(baseURL!).origin};
  const post=async(path:string,data:any,extra:Record<string,string>={})=>{
    const response=await page.request.post(`/api/v1${path}`,{headers:{...headers,...extra},data});
    expect(response.ok(),await response.text()).toBe(true);return response.json();
  };
  await post('/auth/register',{name:'Dashboard Merchant',email:`e2e-${runId}-dashboard@example.com`,password:'Browser-test-password-123'});
  await page.goto('/dashboard');
  await page.getByLabel('Website type',{exact:true}).selectOption('online_store');
  await page.getByLabel('Website name',{exact:true}).fill('Dashboard Store');
  await page.getByLabel('Website URL name',{exact:true}).fill(`dashboard-${runId}`);
  await page.getByRole('button',{name:'Create website',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Store overview',exact:true})).toBeVisible();
  const shopList=await (await page.request.get('/api/v1/shops')).json();const current=shopList[0];
  await page.goto('/dashboard/categories');
  await page.getByRole('button',{name:'Add Category',exact:true}).click();
  await page.getByLabel('Category Name').fill('Shirts');
  await page.getByLabel('Description',{exact:true}).fill('Original category');
  await page.getByRole('button',{name:'Save Category',exact:true}).click();
  await page.getByRole('button',{name:'Edit Shirts',exact:true}).click();
  await page.getByLabel('Category Name').fill('Apparel');await page.getByLabel('Description',{exact:true}).fill('');
  await page.getByRole('button',{name:'Save Category',exact:true}).click();
  await expect(page.getByText('Apparel',{exact:true})).toBeVisible();
  const categories=await (await page.request.get(`/api/v1/shops/${current.id}/categories`)).json();
  expect(categories[0].description).toBeNull();
  await page.goto('/dashboard/products');
  await page.getByRole('button',{name:'Add New Product',exact:true}).click();
  await page.getByLabel('Product Name').fill('Everyday Shirt');
  await page.getByLabel('Selling Price (BDT)').fill('100');
  await page.getByLabel('Stock Quantity').fill('10');
  await page.getByLabel('Product visibility').selectOption('draft');
  await page.getByRole('button',{name:'Save Product',exact:true}).click();
  await expect(page.locator('tbody').getByText('draft',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Edit Everyday Shirt',exact:true}).click();
  await page.getByLabel('Product visibility').selectOption('active');
  await page.getByRole('button',{name:'Save Product',exact:true}).click();
  await expect(page.locator('tbody').getByText('active',{exact:true})).toBeVisible();
  const catalog=await (await page.request.get(`/api/v1/shops/${current.id}/products`)).json();
  await page.goto('/dashboard/settings');
  await page.getByLabel('Store Name',{exact:true}).fill('Updated Merchant Store');
  await page.getByLabel('Store Description',{exact:true}).fill('A description to clear');
  await page.getByLabel('Inside Dhaka Delivery Fee (৳)',{exact:true}).fill('0.29');
  await page.getByRole('button',{name:'Save Settings',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Settings saved');
  await page.getByLabel('Store Description',{exact:true}).fill('');
  await page.getByRole('button',{name:'Save Settings',exact:true}).click();
  await expect.poll(async()=> (await (await page.request.get(`/api/v1/shops/${current.id}`)).json()).description).toBeNull();
  const saved=await (await page.request.get(`/api/v1/shops/${current.id}`)).json();expect(saved.inside_dhaka_delivery_fee_minor).toBe('29');
  await expect(page.locator('aside').getByText('Updated Merchant Store',{exact:true})).toBeVisible();
  await page.locator('aside').getByRole('link',{name:'Overview',exact:true}).click();
  await page.getByRole('button',{name:'Publish store',exact:true}).click();
  await expect(page.getByRole('link',{name:'View live store',exact:true})).toBeVisible();
  const order=await post('/public/orders',{customer_name:'Dashboard Customer',customer_phone:'01712345678',shipping_city:'Dhaka',shipping_address:'House 10, Dhaka',items:[{product_id:catalog[0].id,quantity:1}]},{'X-Shop-Slug':current.slug,'Idempotency-Key':`dashboard-${runId}`});
  await page.getByRole('button',{name:'Refresh overview',exact:true}).click();
  await page.getByRole('link',{name:'Orders to fulfill: 1',exact:true}).click();
  await expect(page.getByLabel('Filter order status')).toHaveValue('unfulfilled');
  await page.getByRole('button',{name:order.order_number,exact:true}).click();
  const details=page.getByRole('dialog',{name:'Order details',exact:true});
  await expect(details.getByText('Dashboard Customer',{exact:true})).toBeVisible();
  await expect(details.getByText('Everyday Shirt',{exact:true})).toBeVisible();
  await page.keyboard.press('Escape');await expect(details).not.toBeVisible();
  await page.getByLabel('Filter order status').selectOption('');
  for(const status of ['confirmed','processing','ready_to_ship','shipped','delivered']){
    await page.getByLabel(`Fulfillment status for ${order.order_number}`,{exact:true}).selectOption(status);
    await expect(page.getByLabel(`Fulfillment status for ${order.order_number}`,{exact:true})).toBeEnabled();
    await expect(page.getByLabel(`Fulfillment status for ${order.order_number}`,{exact:true})).toHaveValue(status);
  }
  await page.goto('/dashboard');
  await expect(page.getByRole('link',{name:'Delivered order value: ৳100.29',exact:true})).toBeVisible();
  await page.goto('/dashboard/subscription');
  await page.getByRole('button',{name:'Request Growth',exact:true}).click();
  await expect(page.getByText(/Awaiting payment confirmation:/)).toBeVisible();
  await expect(page.getByRole('button',{name:'Request Growth',exact:true})).toBeDisabled();
  const subscription=await (await page.request.get(`/api/v1/shops/${current.id}/subscription`)).json();expect(subscription.plan_name).toBe('Starter');
  const second=await post('/shops',{name:'Second Dashboard Store',slug:`second-${runId}`});
  await page.reload();await page.getByRole('combobox',{name:'Active website',exact:true}).selectOption(second.id);
  await expect(page.getByRole('combobox',{name:'Active website',exact:true})).toHaveValue(second.id);
  await page.goto('/dashboard');await expect(page.getByRole('link',{name:'Total orders: 0',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('arise_active_shop'))).toBe(second.slug);
});

test('settings preserve edits on failure and domain verification reports ownership separately from hosting', async ({page}) => {
  await mockMerchant(page);
  await page.route('**/api/v1/shops/shop-one',route=>route.fulfill({status:503,json:{detail:'Save temporarily unavailable'}}));
  await page.goto('/dashboard/settings');
  await page.getByLabel('Store Name',{exact:true}).fill('Keep these edits');
  await page.getByRole('button',{name:'Save Settings',exact:true}).click();
  await expect(page.locator('#merchant-content').getByRole('alert')).toContainText('Save temporarily unavailable');
  await expect(page.getByLabel('Store Name',{exact:true})).toHaveValue('Keep these edits');
  await expect(page.getByRole('button',{name:'Save Settings',exact:true})).toBeEnabled();

  let verified=false;
  const domain={id:'domain',hostname:'shop.example.com',domain_type:'custom',verification_status:'pending',routing_status:'inactive',verification_record:'_arise-verification.shop.example.com',verification_value:'verification-token'};
  await page.route('**/api/v1/shops/shop-one/domains',route=>route.fulfill({json:[{...domain,verification_status:verified?'verified':'pending'}]}));
  await page.route('**/api/v1/shops/shop-one/domains/domain/verify',route=>{
    if(!verified){verified=true;return route.fulfill({status:409,json:{detail:'TXT record not found'}});}
    return route.fulfill({json:{...domain,verification_status:'verified'}});
  });
  await page.goto('/dashboard/domains');
  await page.getByRole('button',{name:'Verify DNS ownership',exact:true}).click();
  await expect(page.locator('#merchant-content').getByRole('alert')).toContainText('TXT record not found');
  await expect(page.getByRole('button',{name:'Verify DNS ownership',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Verify DNS ownership',exact:true}).click();
  await expect(page.getByText('DNS verified · hosting pending',{exact:true})).toBeVisible();
  await expect(page.getByText('Routing active',{exact:true})).toHaveCount(0);
  await expect(page.locator('#merchant-content').getByRole('status')).toContainText('Contact the administrator to arrange HTTPS and routing');
});
