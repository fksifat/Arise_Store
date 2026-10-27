import { test, expect } from '@playwright/test';
const runId = process.env.E2E_RUN_ID || Date.now().toString();
const password = 'Browser-test-password-123';

test('merchant registration uses a cookie session and opens the dashboard', async ({ page }) => {
  await page.goto('/register');
  await page.getByRole('radio',{name:'Online store',exact:true}).check();
  await page.getByPlaceholder('e.g. Rahim Chowdhury').fill('Browser Merchant');
  await page.getByPlaceholder('you@brand.com').fill(`e2e-${runId}-registration@example.com`);
  await page.getByPlaceholder('At least 12 characters').fill(password);
  await page.getByPlaceholder('e.g. Dhaka Artisan Silk').fill(`Browser Shop ${runId}`);
  await page.getByRole('button', { name: 'Create website' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('button', { name: 'Publish store' })).toBeVisible();
  const cookie = (await page.context().cookies()).find(c => c.name === 'arise_session');
  expect(cookie?.httpOnly).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('arise_token'))).toBeNull();
});

test('variant checkout recovers a lost successful response even after stock sells out', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const register = await page.request.post('/api/v1/auth/register', { headers: { Origin: origin }, data: { name: 'Checkout Merchant', email: `e2e-${runId}-checkout@example.com`, password } });
  expect(register.status()).toBe(201);
  const shopResponse = await page.request.post('/api/v1/shops', { headers: { Origin: origin }, data: { name: 'Recovery Store', slug: `recovery-${runId}` } });
  expect(shopResponse.status()).toBe(201);
  const shop = await shopResponse.json();
  const productResponse = await page.request.post(`/api/v1/shops/${shop.id}/products`, { headers: { Origin: origin }, data: { name: 'Variant Shirt', price_minor: 10000, stock_quantity: 0, variants: [{ title: 'Medium Blue', price_minor: 12500, stock_quantity: 1 }] } });
  expect(productResponse.status()).toBe(201);
  const product = await productResponse.json();
  expect((await page.request.post(`/api/v1/shops/${shop.id}/publish`, { headers: { Origin: origin } })).status()).toBe(200);
  await page.goto(`/store/${shop.slug}`);
  await expect(page.getByRole('combobox', { name: 'Option for Variant Shirt' })).toHaveValue(product.variants[0].id);
  await page.getByRole('button', { name: 'Add to Bag' }).click();
  await page.getByRole('button', { name: 'Proceed to Checkout' }).click();
  await page.getByPlaceholder('e.g. Tanvir Ahmed').fill('Customer Test');
  await page.getByPlaceholder('e.g. 01712345678').fill('01712345678');
  await page.getByPlaceholder('House number, Road, Area, Thana, District').fill('House 10, Road 4, Dhaka');
  let dropped = false;
  let recoveryBlocked = false;
  await page.route('**/api/v1/public/orders', async route => {
    if (!dropped) { dropped = true; const response = await route.fetch(); expect(response.status()).toBe(201); await route.abort('failed'); }
    else if (!recoveryBlocked) { recoveryBlocked = true; await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ detail: 'Store temporarily restricted' }) }); }
    else await route.continue();
  });
  await page.getByRole('button', { name: /Confirm Order/ }).click();
  await expect(page.getByRole('button', { name: 'Recover saved checkout' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Open cart', exact: true }).click();
  await page.getByRole('button', { name: 'Proceed to Checkout' }).click();
  await page.getByRole('button', { name: 'Recover saved checkout' }).click();
  await expect(page.getByText('Store temporarily restricted')).toBeVisible();
  expect(await page.evaluate(slug => localStorage.getItem(`arise_checkout_${slug}`), shop.slug)).not.toBeNull();
  await page.getByRole('button', { name: 'Recover saved checkout' }).click();
  await expect(page.getByText('Thank you for your order!')).toBeVisible();
  const orders = await page.request.get(`/api/v1/shops/${shop.id}/orders`);
  const placedOrders = await orders.json();
  expect(placedOrders.length).toBe(1);
  const savedProduct = await (await page.request.get(`/api/v1/shops/${shop.id}/products/${product.id}`)).json();
  expect(savedProduct.variants[0].stock_quantity).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.getByRole('link', { name: 'Track this order', exact: true }).click();
  await expect(page.getByLabel('Order Number')).toHaveValue(placedOrders[0].order_number);
  expect(page.url()).not.toContain('01712345678');
  await page.getByLabel('Mobile Number').fill('01712345678');
  await page.getByRole('button', { name: 'Track Status', exact: true }).click();
  await expect(page.getByText('pending', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
