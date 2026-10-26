const assert = require('node:assert/strict');
const { chromium } = require('../../../apps/web/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[]; page.on('pageerror', error=>errors.push(error.message));
    await page.goto('http://localhost:3000');
    await page.locator('#demo a[href="/store/gadget-zone"]').waitFor();
    await page.getByRole('navigation').getByRole('link',{name:'Themes',exact:true}).click();
    const themesY=await page.evaluate(()=>scrollY);
    assert.equal(await page.locator('#themes a[href^="/themes/"]').count(),6);
    await page.screenshot({path:'.gravitas/sessions/distinct-demos/themes.png'});
    await page.getByRole('navigation').getByRole('link',{name:'Live Demos',exact:true}).click();
    assert(await page.evaluate(()=>scrollY)>themesY+500);
    assert.equal(await page.locator('#demo a[href^="/store/"]').count(),2);
    await page.screenshot({path:'.gravitas/sessions/distinct-demos/demos.png'});
    for(const slug of ['fashion-house','gadget-zone']){
      await page.goto('http://localhost:3000/store/'+slug);
      await page.locator('.sf-product-card').first().waitFor();
      assert(await page.locator('.sf-product-card').count()>0);
      await page.getByRole('button',{name:'Open cart',exact:true}).waitFor();
    }
    await page.setViewportSize({width:390,height:844});
    await page.goto('http://localhost:3000/#demo');
    await page.locator('#demo a[href="/store/gadget-zone"]').waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);
    console.log('PASS: distinct gallery/demo navigation, six previews, two available stocked demo stores, mobile overflow check and zero page JavaScript errors.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
