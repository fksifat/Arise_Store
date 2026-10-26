import { test, expect } from '@playwright/test';
import { storefrontThemes, themeCategories } from '../src/lib/storefront-themes';
const runId = process.env.E2E_RUN_ID || Date.now().toString();

test('related previews switch between designs without carrying an open bag or preview notice', async ({page}) => {
  await page.goto('/themes/fashion-noir');
  await page.getByRole('button',{name:'Add to Bag',exact:true}).first().click();
  await page.getByRole('button',{name:'Proceed to Checkout',exact:true}).click();
  await expect(page.locator('.sf-preview-notice')).toContainText('This is a theme preview.');
  await page.getByRole('navigation',{name:'Fashion themes',exact:true}).getByRole('link',{name:'Fashion Runway',exact:true}).click();
  await expect(page).toHaveURL(/\/themes\/fashion-runway$/);
  await expect(page.locator('.sf-hero h1')).toHaveText('Wear what moves you.');
  await expect(page.locator('.sf-preview-notice')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Use this theme →',exact:true})).toHaveAttribute('href','/register?theme=fashion-runway');
  await page.getByRole('navigation',{name:'Fashion themes',exact:true}).getByRole('link',{name:'Fashion Noir',exact:true}).click();
  await page.getByRole('button',{name:'Open cart',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Your Shopping Bag',exact:true}).getByRole('heading',{name:/The Everyday Shirt/})).toBeVisible();
});

test('all theme demos support mobile browsing, quick view and honest preview checkout', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  for (const preset of storefrontThemes) await test.step(preset.name, async () => {
    await page.setViewportSize({width:390,height:844});
    const response = await page.goto(`/themes/${preset.key}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('.sf-hero h1')).toHaveText(preset.title);
    await expect(page.getByRole('link',{name:'Use this theme →',exact:true})).toHaveAttribute('href',`/register?theme=${preset.key}`);
    const related = page.getByRole('navigation',{name:`${preset.category} themes`,exact:true});
    await expect(related.getByRole('link')).toHaveCount(3);
    await expect(related.getByRole('link',{name:preset.name,exact:true})).toHaveAttribute('aria-current','page');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.getByRole('button',{name:'Open menu',exact:true}).click();
    await expect(page.getByRole('navigation',{name:'Mobile navigation'})).toBeVisible();
    await page.getByRole('button',{name:'Close menu',exact:true}).click();
    const first = page.locator('.sf-product-card').first();
    await first.getByRole('button',{name:/^View /}).first().click();
    const dialog = page.locator('.sf-quick-dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('combobox').selectOption({index:1});
    await expect(dialog.locator('.sf-price strong')).toContainText('৳');
    await dialog.getByRole('button',{name:'Add to Bag',exact:true}).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('heading',{name:'Your Shopping Bag',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Proceed to Checkout',exact:true}).click();
    await expect(page.getByText('This is a theme preview. Apply it to your store to accept real orders.',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Dismiss preview notice',exact:true}).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.getByRole('link',{name:'Use this theme →',exact:true}).click();
    await expect(page.getByText(`Starting with ${preset.name}. You can change it anytime.`,{exact:true})).toBeVisible();
  });
  expect(errors).toEqual([]);
});

test('gallery applies all themes without publishing drafts or losing custom branding, then every theme checks out', async ({ page, baseURL }) => {
  test.setTimeout(150000);
  const origin = new URL(baseURL!).origin;
  const headers = {Origin:origin};
  const post = async (path: string, data: any, extra: Record<string,string> = {}) => {
    const response = await page.request.post(`/api/v1${path}`,{headers:{...headers,...extra},data});
    expect(response.ok(),await response.text()).toBe(true);return response.json();
  };
  await post('/auth/register',{name:'Theme Merchant',email:`e2e-${runId}-themes@example.com`,password:'Browser-test-password-123'});
  const shop = await post('/shops',{name:'The Theme Store',slug:`themes-${runId}`});
  const category = await post(`/shops/${shop.id}/categories`,{name:'Our collection'});
  const product = await post(`/shops/${shop.id}/products`,{name:'Everyday Essentials',price_minor:125000,stock_quantity:0,category_ids:[category.id],variants:[{title:'Classic',price_minor:125000,stock_quantity:20},{title:'Signature',price_minor:150000,stock_quantity:20}]});
  const current = await (await page.request.get(`/api/v1/shops/${shop.id}/theme-settings`)).json();
  const customSettings = {...current.settings,brand:{...current.settings.brand,primary_color:'#ffffff'},hero:{...current.settings.hero,subtitle:'A merchant-authored line, carried between themes.'}};
  expect((await page.request.put(`/api/v1/shops/${shop.id}/theme-settings`,{headers,data:{theme_key:'fashion-modern',settings_json:customSettings}})).ok()).toBe(true);
  await page.goto('/dashboard/themes');
  await expect(page.locator('article[data-theme-key]')).toHaveCount(storefrontThemes.length);
  for (const category of themeCategories) {
    await page.getByRole('group',{name:'Theme categories',exact:true}).getByRole('button',{name:category,exact:true}).click();
    await expect(page.getByRole('heading',{name:`${category} themes`,exact:true})).toBeVisible();
    await expect(page.locator('article[data-theme-key]')).toHaveCount(3);
    expect(await page.locator('article[data-theme-key]').evaluateAll(cards=>cards.map(card=>card.getAttribute('data-theme-key')))).toEqual(expect.arrayContaining(storefrontThemes.filter(theme=>theme.category===category).map(theme=>theme.key)));
  }
  await page.getByRole('group',{name:'Theme categories',exact:true}).getByRole('button',{name:'All themes',exact:true}).click();
  await page.getByRole('button',{name:'Browse Electronics themes',exact:true}).click();
  await expect(page.locator('article[data-theme-key]')).toHaveCount(3);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.screenshot({path:'../../.gravitas/sessions/theme-segments/segment-gallery-mobile.png',fullPage:true});
  await page.getByRole('group',{name:'Theme categories',exact:true}).getByRole('button',{name:'All themes',exact:true}).click();
  for (const preset of [...storefrontThemes.slice(1),storefrontThemes[0]]) await test.step(`Apply ${preset.name}`, async () => {
    await page.locator(`article[data-theme-key="${preset.key}"]`).getByRole('button',{name:'Apply theme',exact:true}).click();
    await expect(page.getByRole('status')).toContainText(`${preset.name} is now applied`);
    const setting = await (await page.request.get(`/api/v1/shops/${shop.id}/theme-settings`)).json();
    expect(setting.theme_key).toBe(preset.key);
    expect(setting.settings.brand.primary_color).toBe('#ffffff');
    expect(setting.settings.hero.subtitle).toBe(customSettings.hero.subtitle);
    expect(setting.settings.hero.title).toBe(preset.title);
    expect(setting.settings.hero.image_url).toBe(preset.image);
    const savedShop = await (await page.request.get(`/api/v1/shops/${shop.id}`)).json();
    expect(savedShop.status).toBe('draft');
    const savedProduct = await (await page.request.get(`/api/v1/shops/${shop.id}/products/${product.id}`)).json();
    expect(savedProduct.variants[0].stock_quantity).toBe(20);
  });
  await post(`/shops/${shop.id}/publish`,{});
  for (const preset of storefrontThemes) await test.step(`Checkout ${preset.name}`, async () => {
    expect((await page.request.put(`/api/v1/shops/${shop.id}/theme-settings`,{headers,data:{theme_key:preset.key,settings_json:JSON.parse((await (await page.request.get(`/api/v1/themes/${preset.key}`)).json()).configuration_schema)}})).ok()).toBe(true);
    await page.setViewportSize({width:390,height:844});
    await page.goto(`/store/${shop.slug}`);
    await expect(page.locator('.sf-hero h1')).toHaveText(preset.title);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    const card = page.locator('.sf-product-card').first();
    await card.getByRole('combobox').selectOption(product.variants.find((variant: any) => variant.title === 'Signature').id);
    await expect(card.locator('.sf-price strong')).toHaveText('৳1,500');
    await card.getByRole('button',{name:'Add to Bag',exact:true}).click();
    await page.getByRole('button',{name:'Proceed to Checkout',exact:true}).click();
    await page.getByPlaceholder('e.g. Tanvir Ahmed').fill('Theme Customer');
    await page.getByPlaceholder('e.g. 01712345678').fill('01712345678');
    await page.getByPlaceholder('House number, Road, Area, Thana, District').fill('House 10, Dhaka');
    await page.getByRole('button',{name:/Confirm Order/}).click();
    await expect(page.getByText('Thank you for your order!',{exact:true})).toBeVisible();
    await expect(page.getByRole('link',{name:'Track this order',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Continue Shopping',exact:true}).click();
  });
  const orders = await (await page.request.get(`/api/v1/shops/${shop.id}/orders`)).json();
  expect(orders).toHaveLength(storefrontThemes.length);
  for (const order of orders) expect(order.subtotal_minor).toBe(150000);
});
