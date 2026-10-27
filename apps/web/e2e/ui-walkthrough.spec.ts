import { test, expect } from '@playwright/test';

const run = process.env.E2E_RUN_ID || Date.now().toString();
async function account(page: any, baseURL: string, suffix: string) {
  const headers = { Origin: new URL(baseURL).origin };
  const response = await page.request.post('/api/v1/auth/register', { headers, data: {
    name: 'Walkthrough Owner', email: `e2e-${run}-${suffix}@example.com`, password: 'Walkthrough-test-password-123',
  } });
  expect(response.status()).toBe(201);
  return headers;
}

test('editor navigation preserves unsaved work and refreshes the published navigation', async ({ page, baseURL }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1920, height: 1000 });
  const headers = await account(page, baseURL!, 'walkthrough-editor');
  const target = await (await page.request.post('/api/v1/shops', { headers, data: { name: 'Other Workspace', slug: `walkthrough-other-${run}`, website_type: 'online_store' } })).json();
  const site = await (await page.request.post('/api/v1/shops', { headers, data: { name: 'Editor Workspace', slug: `editor-${run}`, website_type: 'business' } })).json();
  await page.goto('/dashboard/pages');
  await page.getByRole('link', { name: /Home.*Homepage/ }).click();
  await expect(page.getByRole('heading', { name: 'Page editor', exact: true })).toBeVisible();
  const editorURL = page.url();
  const skip = page.getByRole('link', { name: 'Skip to content', exact: true });
  await expect(skip).not.toBeInViewport();
  await skip.focus();
  await expect(skip).toBeInViewport();
  await page.getByLabel('Section heading', { exact: true }).fill('First saved version');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved.');
  await page.getByLabel('Section heading', { exact: true }).fill('Keep this unsaved version');
  page.once('dialog', async dialog => { expect(dialog.type()).toBe('confirm'); await dialog.dismiss(); });
  await page.getByRole('link', { name: 'Open Overview', exact: true }).click();
  await expect(page).toHaveURL(editorURL);
  await expect(page.getByLabel('Section heading', { exact: true })).toHaveValue('Keep this unsaved version');
  page.once('dialog', async dialog => { expect(dialog.message()).toContain('switch websites'); await dialog.dismiss(); });
  await page.getByRole('combobox', { name: 'Active website', exact: true }).selectOption(target.id);
  await expect(page).toHaveURL(editorURL);
  await expect(page.getByRole('combobox', { name: 'Active website', exact: true })).toHaveValue(site.id);
  expect(await page.evaluate(() => localStorage.getItem('arise_active_shop'))).toBe(site.slug);
  await expect(page.getByLabel('Section heading', { exact: true })).toHaveValue('Keep this unsaved version');
  page.once('dialog', async dialog => { expect(dialog.message()).toContain('switch websites'); await dialog.accept(); });
  await page.getByRole('combobox', { name: 'Active website', exact: true }).selectOption(target.id);
  await expect(page).toHaveURL(/\/dashboard\/pages$/);
  await expect(page.getByText('No pages yet. Create your first one.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('arise_active_shop'))).toBe(target.slug);
  await page.getByRole('combobox', { name: 'Active website', exact: true }).selectOption(site.id);
  await page.getByRole('button', { name: 'New page', exact: true }).click();
  await page.getByLabel('Page title', { exact: true }).fill('About this workspace');
  await page.getByRole('button', { name: 'Create page', exact: true }).click();
  await page.getByRole('button', { name: 'Publish page', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Content published.');
  await expect(page.getByRole('region', { name: 'Live draft preview', exact: true }).getByRole('link', { name: 'About this workspace', exact: true })).toBeVisible();
  await page.screenshot({ path: '../../.gravitas/sessions/ui-walkthrough/editor-desktop.png' });
  await page.getByRole('button', { name: 'Unpublish content', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Content unpublished.');
  await expect(page.getByRole('region', { name: 'Live draft preview', exact: true }).getByRole('link', { name: 'About this workspace', exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Open navigation', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: '../../.gravitas/sessions/ui-walkthrough/editor-mobile.png' });
});

test('product editor saves and edits same-site image paths', async ({ page, baseURL }) => {
  const headers = await account(page, baseURL!, 'walkthrough-images');
  expect((await page.request.post('/api/v1/shops', { headers, data: { name: 'Image Store', slug: `images-${run}`, website_type: 'online_store' } })).status()).toBe(201);
  await page.goto('/dashboard/products');
  await page.getByRole('button', { name: 'Add New Product', exact: true }).click();
  await page.getByLabel('Product Name', { exact: false }).fill('Local image bottle');
  await page.getByLabel('Selling Price (BDT)', { exact: false }).fill('450.50');
  await page.getByLabel('Product Image URL', { exact: true }).fill('/themes/assets/bottle.jpg');
  await page.getByRole('button', { name: 'Save Product', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Local image bottle', exact: true })).toHaveAttribute('src', '/themes/assets/bottle.jpg');
  await page.getByRole('button', { name: 'Edit Local image bottle', exact: true }).click();
  await page.getByLabel('Product Name', { exact: false }).fill('Updated local image bottle');
  await page.getByRole('button', { name: 'Save Product', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Updated local image bottle', exact: true })).toHaveAttribute('src', '/themes/assets/bottle.jpg');
});
