import { test, expect } from '@playwright/test';
import { storefrontThemes, themeCategories } from '../src/lib/storefront-themes';

const samples = {
  'fashion-house': { name: 'Fashion sample shop', slug: 'fashion-house', description: 'A stocked fashion shop.', theme: { theme_key: 'fashion-modern' } },
  'gadget-zone': { name: 'Gadget sample shop', slug: 'gadget-zone', description: 'A stocked electronics shop.', theme: { theme_key: 'tech-cosmetics' } },
};

test('Themes and Live Demos navigate to separate design and store sections', async ({ page }) => {
  await page.route('**/api/v1/public/store', route => {
    const slug = route.request().headers()['x-shop-slug'] as keyof typeof samples;
    return route.fulfill({ json: samples[slug] });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation', exact: true });
  const themes = page.locator('#themes');
  const demos = page.locator('#demo');
  await nav.getByRole('link', { name: 'Themes', exact: true }).click();
  await expect(page).toHaveURL(/#themes$/);
  await expect(themes.getByRole('heading', { name: 'Find your website’s look.' })).toBeInViewport();
  await themes.getByRole('group',{name:'Website types',exact:true}).getByRole('button',{name:'Online store',exact:true}).click();
  for (const category of themeCategories) {
    await themes.getByRole('group',{name:'Browse themes by category',exact:true}).getByRole('button',{name:category,exact:true}).click();
    await expect(themes.locator('a[href^="/themes/"]')).toHaveCount(3);
    const hrefs = await themes.locator('a[href^="/themes/"]').evaluateAll(links=>links.map(link=>link.getAttribute('href')));
    expect(hrefs).toEqual(storefrontThemes.filter(theme=>theme.category===category).map(theme=>`/themes/${theme.key}`));
  }
  await themes.getByRole('group',{name:'Browse themes by category',exact:true}).getByRole('button',{name:'Fashion',exact:true}).click();
  await expect(themes.locator('a[href^="/store/"]')).toHaveCount(0);
  const themeScroll = await page.evaluate(() => scrollY);
  await nav.getByRole('link', { name: 'Live Demos', exact: true }).click();
  await expect(page).toHaveURL(/#demo$/);
  await expect(demos.getByRole('heading', { name: 'Visit a live example.' })).toBeInViewport();
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(themeScroll + 500);
  await expect(demos.locator('a[href="/store/fashion-house"]')).toBeVisible();
  await expect(demos.locator('a[href="/store/gadget-zone"]')).toBeVisible();
  await expect(demos.locator('a[href^="/themes/"]')).toHaveCount(0);
  await themes.locator('a[href^="/themes/"]').first().click();
  await expect(page).toHaveURL(/\/themes\/fashion-modern$/);
  await expect(page.locator('.sf-hero h1')).toBeVisible();
});

test('unavailable demos show an empty state without dead store links', async ({ page }) => {
  await page.route('**/api/v1/public/store', route => route.fulfill({ status: 503, json: { detail: 'Unavailable' } }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#demo');
  const demos = page.locator('#demo');
  await expect(demos.getByRole('status')).toHaveText('Live demo stores are currently unavailable.Explore the theme previews');
  await expect(demos.locator('a[href^="/store/"]')).toHaveCount(0);
  await demos.getByRole('link', { name: 'Explore the theme previews' }).click();
  await expect(page).toHaveURL(/#themes$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('only available sample stores are offered when one demo is missing', async ({ page }) => {
  await page.route('**/api/v1/public/store', route => route.request().headers()['x-shop-slug'] === 'fashion-house'
    ? route.fulfill({ json: samples['fashion-house'] })
    : route.fulfill({ status: 404, json: { detail: 'Not found' } }));
  await page.goto('/#demo');
  await expect(page.locator('#demo a[href^="/store/"]')).toHaveCount(1);
  await expect(page.locator('#demo a[href="/store/fashion-house"]')).toBeVisible();
});
