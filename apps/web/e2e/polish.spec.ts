import { test, expect } from '@playwright/test';

const runId = process.env.E2E_RUN_ID || Date.now().toString();

test('mobile navigation, registration labels and password visibility work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open website menu', exact: true }).click();
  await page.locator('#website-menu').getByRole('link', { name: 'Themes', exact: true }).click();
  await expect(page).toHaveURL(/#themes$/);
  await expect(page.getByRole('button', { name: 'Open website menu', exact: true })).toHaveAttribute('aria-expanded', 'false');
  const annual = page.getByRole('switch', { name: 'Annual billing', exact: true });
  const initial = await annual.getAttribute('aria-checked');
  await annual.click();
  await expect(annual).toHaveAttribute('aria-checked', initial === 'true' ? 'false' : 'true');
  await page.goto('/register');
  for (const label of ['Your Full Name', 'Email Address', 'Mobile Phone (Bangladesh)', 'Password', 'Shop Name', 'Store URL name']) {
    await expect(page.getByLabel(label, { exact: false })).toBeVisible();
  }
  await page.getByLabel('Store URL name', { exact: false }).fill('chosen-store');
  await page.getByPlaceholder('e.g. Dhaka Artisan Silk').fill('বাংলা দোকান');
  await expect(page.getByLabel('Store URL name', { exact: false })).toHaveValue('chosen-store');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.goto('/login');
  await page.getByLabel('Password', { exact: true }).fill('visible-password');
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password', exact: true }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password');
});

test('expired private sessions return to sign in with an explanation', async ({ page }) => {
  await page.route('**/api/v1/**', route => new URL(route.request().url()).pathname.endsWith('/auth/me')
    ? route.fulfill({ json: { id: 'expired-owner', name: 'Owner', email: 'owner@example.com', role: 'merchant' } })
    : route.fulfill({ status: 401, json: { detail: 'Session expired' } }));
  await page.goto('/dashboard/products');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('status')).toContainText('Your session expired. Please sign in again.');
});

test('options, stock conflict recovery and an empty-bag checkout recovery work end to end', async ({ page, baseURL }) => {
  const headers = { Origin: new URL(baseURL!).origin };
  expect((await page.request.post('/api/v1/auth/register', { headers, data: { name: 'Polish Merchant', email: `e2e-${runId}-polish@example.com`, password: 'Browser-test-password-123' } })).status()).toBe(201);
  const shop = await (await page.request.post('/api/v1/shops', { headers, data: { name: 'Options Store', slug: `polish-${runId}` } })).json();
  const path = `/api/v1/shops/${shop.id}/products`;
  const product = await (await page.request.post(path, { headers, data: { name: 'Option Shirt', price_minor: 9000, stock_quantity: 2 } })).json();
  expect((await page.request.post(`/api/v1/shops/${shop.id}/publish`, { headers })).status()).toBe(200);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/dashboard/products');
  await page.getByRole('button', { name: 'Options for Option Shirt', exact: true }).click();
  const options = page.getByRole('dialog', { name: 'Product options', exact: true });
  await options.getByLabel('Option name', { exact: true }).fill('Blue / Medium');
  await options.getByLabel('Option SKU', { exact: true }).fill('BLUE-M');
  await options.getByLabel('Option price (BDT)', { exact: true }).fill('0.29');
  await options.getByLabel('Option stock', { exact: true }).fill('2');
  await options.getByRole('button', { name: 'Save option', exact: true }).click();
  await expect(options.getByRole('status')).toHaveText('Product option saved.');
  await page.screenshot({ path: '../../.gravitas/sessions/polish/product-options.png' });
  const current = await (await page.request.get(path + '/' + product.id)).json();
  const variant = current.variants[0]; expect(variant.price_minor).toBe(29);
  await options.getByRole('button', { name: 'Edit option Blue / Medium', exact: true }).click();
  await options.getByLabel('Option stock', { exact: true }).fill('5');
  expect((await page.request.patch(`${path}/${product.id}/variants/${variant.id}`, { headers, data: { stock_quantity: 1, expected_stock_quantity: 2 } })).status()).toBe(200);
  await options.getByRole('button', { name: 'Save option', exact: true }).click();
  await expect(options.getByRole('alert')).toContainText('Option stock changed');
  await expect(options.getByLabel('Option stock', { exact: true })).toHaveValue('5');
  await options.getByRole('button', { name: 'Reload options', exact: true }).click();
  await expect(options.getByLabel('Option stock', { exact: true })).toHaveValue('1');
  await options.getByLabel('Option stock', { exact: true }).fill('2');
  await options.getByRole('button', { name: 'Save option', exact: true }).click();
  await expect(options.getByRole('status')).toHaveText('Product option saved.');
  await page.keyboard.press('Escape'); await expect(options).not.toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/store/${shop.slug}`);
  await page.getByRole('button', { name: 'Add to Bag', exact: true }).click();
  const bag = page.getByRole('dialog', { name: 'Your Shopping Bag', exact: true });
  const increase = bag.getByRole('button', { name: /^Increase quantity/ });
  await increase.click(); await expect(increase).toBeDisabled();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
  }
  await page.keyboard.press('Escape'); await expect(bag).not.toBeVisible();
  await page.getByRole('button', { name: 'Open cart', exact: true }).click();
  await bag.getByRole('button', { name: 'Proceed to Checkout', exact: true }).click();
  const checkout = page.getByRole('dialog', { name: 'Checkout', exact: true });
  await checkout.getByLabel('Full Name', { exact: false }).fill('Checkout Customer');
  await checkout.getByLabel('Mobile Number (Bangladesh)', { exact: false }).fill('01712345678');
  await checkout.getByLabel('Full Delivery Address', { exact: false }).fill('House 10, Road 4, Dhaka');
  await page.screenshot({ path: '../../.gravitas/sessions/polish/checkout-mobile.png' });
  await checkout.getByRole('button', { name: 'Edit shopping bag', exact: true }).click();
  await expect(bag).toBeVisible();
  await bag.getByRole('button', { name: 'Proceed to Checkout', exact: true }).click();
  await expect(checkout.getByLabel('Full Name', { exact: false })).toHaveValue('Checkout Customer');
  let dropped = false;
  await page.route('**/api/v1/public/orders', async route => {
    if (!dropped) { dropped = true; expect((await route.fetch()).status()).toBe(201); await route.abort('failed'); }
    else await route.continue();
  });
  await checkout.getByRole('button', { name: /Confirm Order/ }).click();
  await expect(checkout.getByRole('button', { name: 'Recover saved checkout', exact: true })).toBeVisible();
  await checkout.getByRole('button', { name: 'Edit shopping bag', exact: true }).click();
  await bag.getByRole('button', { name: /^Remove Option Shirt/ }).click();
  await expect(bag.getByText('Your cart is empty', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Open cart', exact: true }).click();
  await bag.getByRole('button', { name: 'Recover saved checkout', exact: true }).click();
  await checkout.getByRole('button', { name: 'Recover saved checkout', exact: true }).click();
  await expect(checkout.getByText('Thank you for your order!', { exact: true })).toBeVisible();
  const orders = await (await page.request.get(`/api/v1/shops/${shop.id}/orders`)).json();
  expect(orders).toHaveLength(1); expect(orders[0].items[0].quantity).toBe(2);
  expect(orders[0].items[0].variant_title_snapshot).toBe('Blue / Medium');
  expect((await page.request.patch(`${path}/${product.id}/variants/${variant.id}`, { headers, data: { title: 'Renamed after sale', price_minor: 50000 } })).status()).toBe(200);
  await page.goto(`/dashboard/orders/${orders[0].id}/invoice`);
  await expect(page.getByText('Blue / Medium', { exact: true })).toBeVisible();
  await expect(page.getByText('৳0.29', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: '../../.gravitas/sessions/polish/option-invoice-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('admin load failures and action failures are explicit and recoverable', async ({ page }) => {
  let failed = false; let actionFailed = false; let submitted: any;
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { id: 'admin', name: 'Admin', email: 'admin@example.com', role: 'platform_admin' } });
    if (path.endsWith('/metrics')) {
      if (!failed) { failed = true; return route.fulfill({ status: 503, json: { detail: 'Platform data unavailable' } }); }
      return route.fulfill({ json: { total_shops: 1, published_shops: 1, total_products: 1, total_orders: 0, total_revenue_minor: 0, mrr_estimate_minor: 0 } });
    }
    if (path.endsWith('/shops')) return route.fulfill({ json: [{ id: 'shop', name: 'Example Store', slug: 'example', status: 'published', created_at: '2026-10-25T00:00:00Z' }] });
    if (path.endsWith('/payments')) return route.fulfill({ json: [{ id: 'payment', shop_id: 'shop', amount_minor: 10000, billing_interval: 'monthly' }] });
    if (path.endsWith('/verify')) {
      submitted = route.request().postDataJSON();
      if (!actionFailed) { actionFailed = true; return route.fulfill({ status: 409, json: { detail: 'Receipt reference is already in use' } }); }
      return route.fulfill({ json: { id: 'payment', status: 'completed' } });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto('/admin');
  await expect(page.locator('main').getByRole('alert')).toContainText('Platform data unavailable');
  await expect(page.getByText('No pending payment requests.', { exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await page.getByLabel('Search merchant stores', { exact: true }).fill('missing');
  await expect(page.getByRole('cell', { name: 'No stores match these filters.', exact: true })).toBeVisible();
  await page.getByLabel('Search merchant stores', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Confirm received payment', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Confirm received payment', exact: true });
  await dialog.getByLabel('Receipt or transaction reference', { exact: true }).fill('RECEIPT-123');
  await dialog.getByLabel('Reason for this action', { exact: true }).fill('Receipt checked in provider account');
  await dialog.getByRole('button', { name: 'Confirm action', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Receipt reference is already in use');
  await expect(dialog.getByLabel('Receipt or transaction reference', { exact: true })).toHaveValue('RECEIPT-123');
  await dialog.getByRole('button', { name: 'Confirm action', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(submitted).toEqual({ provider_reference: 'RECEIPT-123', reason: 'Receipt checked in provider account' });
  await expect(page.getByRole('status')).toContainText('Payment receipt confirmed.');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Suspend store', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Suspend store', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Suspend store', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
