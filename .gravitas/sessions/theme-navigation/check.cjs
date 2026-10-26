const assert = require('node:assert/strict');
const { chromium } = require('../../../apps/web/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://localhost:3000');
    const nav = page.getByRole('navigation');
    await nav.getByRole('link', { name: 'Themes', exact: true }).click();
    await page.waitForFunction(() => scrollY > 0);
    assert.equal(new URL(page.url()).hash, '#themes');
    const gallery = page.locator('#themes');
    assert.equal(await gallery.count(), 1);
    assert.equal(await gallery.locator('a[href^="/themes/"]').count(), 6);
    const galleryBounds = await gallery.boundingBox();
    const navBounds = await nav.boundingBox();
    assert(galleryBounds.y >= navBounds.y + navBounds.height, 'Gallery heading must clear the sticky navbar');
    assert(galleryBounds.y < 150, 'Gallery should scroll into view');
    await page.screenshot({path:'.gravitas/sessions/theme-navigation/themes-link.png'});
    await gallery.getByRole('link').first().click();
    await page.locator('.sf-hero h1').waitFor();
    assert.match(page.url(), /\/themes\/fashion-modern$/);
    await page.goto('http://localhost:3000');
    await nav.getByRole('link', {name:'Live Demos', exact:true}).click();
    assert.equal(new URL(page.url()).hash, '#demo');
    assert(await page.evaluate(() => scrollY > 0));
    assert.deepEqual(errors, []);
    console.log('PASS: Themes scrolls to six previews below navbar; preview opens; Live Demos still works; no page JavaScript errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
