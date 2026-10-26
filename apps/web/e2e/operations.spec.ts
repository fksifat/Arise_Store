import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { businessDate } from '../src/lib/business';
const runId=process.env.E2E_RUN_ID || Date.now().toString();

test('merchant reviews customers and reports, exports filtered orders, and prints a saved invoice',async({page,context,baseURL})=>{
  test.setTimeout(120000);page.setDefaultTimeout(20000);
  const headers={Origin:new URL(baseURL!).origin};
  const post=async(path:string,data:any,extra:Record<string,string>={})=>{
    const response=await page.request.post(`/api/v1${path}`,{headers:{...headers,...extra},data});
    expect(response.ok(),await response.text()).toBe(true);return response.json();
  };
  await post('/auth/register',{name:'Operations Merchant',email:`e2e-${runId}-operations@example.com`,password:'Browser-test-password-123'});
  const shop=await post('/shops',{name:'Operations Store',slug:`operations-${runId}`});
  const product=await post(`/shops/${shop.id}/products`,{name:'Original Shirt',price_minor:10000,stock_quantity:20});
  const content=await page.request.put(`/api/v1/shops/${shop.id}/storefront-content`,{headers,data:{banner_url:null,hero:{title:'Our collection'},promotion:{enabled:true,message:'Store offer',discount_percent:10}}});
  expect(content.ok()).toBe(true);
  await post(`/shops/${shop.id}/publish`,{});
  const place=async(name:string,phone:string,quantity:number,index:number)=>post('/public/orders',{customer_name:name,customer_phone:phone,shipping_city:'Dhaka',shipping_address:'House 10, Dhaka',customer_note:'Ring the bell',items:[{product_id:product.id,quantity}]},{'X-Shop-Slug':shop.slug,'Idempotency-Key':`operations-${runId}-${index}`});
  const first=await place('রহিম, "Buyer"','01712345678',1,1);
  const second=await place('রহিম, "Buyer"','01712345678',2,2);
  const third=await place('=2+3','01812345678',1,3);
  for(const status of ['confirmed','processing','ready_to_ship','shipped','delivered']){
    const response=await page.request.patch(`/api/v1/shops/${shop.id}/orders/${first.id}/status`,{headers,data:{status,admin_note:'PRIVATE MERCHANT NOTE'}});expect(response.ok()).toBe(true);
  }
  expect((await page.request.patch(`/api/v1/shops/${shop.id}/orders/${third.id}/status`,{headers,data:{status:'cancelled'}})).ok()).toBe(true);
  expect((await page.request.patch(`/api/v1/shops/${shop.id}/products/${product.id}`,{headers,data:{name:'Renamed Current Catalog'}})).ok()).toBe(true);

  await page.goto('/dashboard/customers');
  await page.getByRole('textbox',{name:'Search customers',exact:true}).fill('01712345678');
  await page.getByRole('button',{name:'Search',exact:true}).click();
  await expect(page.getByText('2 orders',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'View রহিম, "Buyer" history',exact:true}).click();
  const history=page.getByRole('dialog',{name:'Customer history',exact:true});
  await expect(history.getByText('2 total orders',{exact:true})).toBeVisible();
  await expect(history.getByText('1 delivered',{exact:true})).toBeVisible();
  await expect(history.getByText('Delivered value: ৳150.00',{exact:true})).toBeVisible();
  await page.keyboard.press('Escape');await expect(history).not.toBeVisible();

  const placed=[first,second,third];
  const firstDay=businessDate(first.created_at);
  const lastDay=businessDate(third.created_at);
  await page.goto('/dashboard/reports');
  await page.getByLabel('Report start date',{exact:true}).fill(firstDay);
  await page.getByLabel('Report end date',{exact:true}).fill(lastDay);
  const updated=page.waitForResponse(response=>response.url().includes('/reports?') && response.url().includes(`start_date=${firstDay}`));
  await page.getByRole('button',{name:'Apply dates',exact:true}).click();await updated;
  await expect(page.getByRole('article',{name:'Orders placed',exact:true})).toContainText('3');
  await expect(page.getByRole('article',{name:'Delivered order value',exact:true})).toContainText('৳150.00');
  await expect(page.getByText('Original Shirt',{exact:true})).toBeVisible();
  await expect(page.getByText('Renamed Current Catalog',{exact:true})).toHaveCount(0);
  const reportDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Export daily report',exact:true}).click();
  const reportFile=await reportDownload;const reportCSV=readFileSync((await reportFile.path())!,'utf8');
  expect(reportCSV).toContain(`"${firstDay}","${placed.filter(order=>businessDate(order.created_at)===firstDay).length}","150.00"`);
  await page.screenshot({path:'../../.gravitas/sessions/commerce-upgrade/reports-desktop.png',fullPage:true});

  await page.goto('/dashboard/orders');
  await page.getByLabel('Search orders',{exact:true}).fill('01712345678');
  const filteredDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Export current view',exact:true}).click();
  const filteredCSV=readFileSync((await (await filteredDownload).path())!,'utf8');
  expect(filteredCSV).toContain('রহিম, ""Buyer""');expect(filteredCSV).not.toContain(third.order_number);
  await page.getByLabel('Search orders',{exact:true}).fill('');
  const fullDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Export current view',exact:true}).click();
  const fullCSV=readFileSync((await (await fullDownload).path())!,'utf8');expect(fullCSV).toContain('"\'=2+3"');expect(fullCSV).not.toContain('PRIVATE MERCHANT NOTE');
  await page.getByLabel('Orders from',{exact:true}).fill(businessDate(new Date(Date.now()+86400000)));
  await expect(page.getByRole('button',{name:'Export current view',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Clear filters',exact:true}).click();
  await page.getByRole('button',{name:first.order_number,exact:true}).click();
  const popup=context.waitForEvent('page');await page.getByRole('link',{name:'Open printable invoice ↗',exact:true}).click();
  const invoice=await popup;
  await expect(invoice.getByRole('heading',{name:'Order invoice',exact:true})).toBeVisible();
  await expect(invoice.getByText('Original Shirt',{exact:true})).toBeVisible();
  await expect(invoice.getByText('৳150.00',{exact:true})).toBeVisible();
  await expect(invoice.getByText('PRIVATE MERCHANT NOTE',{exact:true})).toHaveCount(0);
  await invoice.evaluate(()=>{(window as any).printed=false;window.print=()=>{(window as any).printed=true;};});
  await invoice.getByRole('button',{name:'Print invoice',exact:true}).click();expect(await invoice.evaluate(()=>(window as any).printed)).toBe(true);
  await invoice.emulateMedia({media:'print'});
  await expect(invoice.locator('aside')).not.toBeVisible();
  await expect(invoice.getByRole('button',{name:'Print invoice',exact:true})).not.toBeVisible();
  await invoice.pdf({path:'../../.gravitas/sessions/commerce-upgrade/sample-invoice.pdf',format:'A4',printBackground:true});
  await invoice.emulateMedia({media:'screen'});
  await invoice.setViewportSize({width:390,height:844});
  expect(await invoice.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await invoice.screenshot({path:'../../.gravitas/sessions/commerce-upgrade/invoice-mobile.png',fullPage:true});
  await page.getByRole('dialog',{name:'Order details',exact:true}).getByRole('button',{name:'Close order details',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  for(const path of ['/dashboard/customers','/dashboard/reports']){
    await page.goto(path);await page.getByRole('heading',{level:1}).waitFor();
    await page.getByRole('status').filter({hasText:'Loading your store…'}).waitFor({state:'hidden'});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    await page.screenshot({path:`../../.gravitas/sessions/commerce-upgrade/${path.split('/').pop()}-mobile.png`,fullPage:true});
  }
  await invoice.close();
});

test('customer pagination and reporting failures are recoverable without leaking other store data',async({page})=>{
  let reportFails=true;
  await page.route('**/api/v1/**',route=>{
    const url=new URL(route.request().url());const path=url.pathname;
    if(path.endsWith('/auth/me'))return route.fulfill({json:{id:'owner',name:'Owner',email:'owner@example.com',role:'merchant'}});
    if(path.endsWith('/shops'))return route.fulfill({json:[{id:'shop-one',name:'One store',slug:'one-store',status:'draft'}]});
    if(path.endsWith('/customers'))return route.fulfill({json:{items:[{id:'buyer',name:url.searchParams.get('page')==='2'?'Second page customer':'First page customer',phone:'01712345678',email:null,total_orders:0,delivered_orders:0,delivered_value_minor:0}],total:26,page:Number(url.searchParams.get('page')),page_size:25}});
    if(path.endsWith('/reports')){
      if(reportFails){reportFails=false;return route.fulfill({status:503,json:{detail:'Reports temporarily unavailable'}});}
      return route.fulfill({json:{start_date:'2026-10-25',end_date:'2026-10-25',timezone:'Asia/Dhaka',metrics:{total_orders:0,delivered_value_minor:0,average_delivered_minor:0,customer_count:0,delivered_products_minor:0,delivered_delivery_minor:0,delivered_discounts_minor:0},statuses:{pending:0},daily:[{date:'2026-10-25',orders:0,delivered_value_minor:0}],top_products:[]}});
    }
    return route.fulfill({status:404,json:{detail:'Customer not found'}});
  });
  await page.goto('/dashboard/customers');
  await expect(page.getByRole('button',{name:'Previous',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(page.getByText('Second page customer',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Next',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'View Second page customer history',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Customer not found');
  await page.keyboard.press('Escape');
  await page.goto('/dashboard/reports');
  await expect(page.locator('#merchant-content').getByRole('alert')).toContainText('Reports temporarily unavailable');
  await expect(page.getByRole('button',{name:'Export daily report',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Try again',exact:true}).click();
  await expect(page.getByText('No orders were placed in this date range.',{exact:true})).toBeVisible();
});
