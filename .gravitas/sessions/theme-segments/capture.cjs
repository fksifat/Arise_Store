const {chromium}=require('../../../apps/web/node_modules/playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const catalog=JSON.parse(fs.readFileSync('services/api/app/theme_catalog.json','utf8'));
const base=process.env.THEME_PROBE_URL||'http://localhost:3001';
(async()=>{
 const browser=await chromium.launch();const results=[];const errors=[];
 try {
  const page=await browser.newPage();page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error' && /hydrat/i.test(message.text()))errors.push(message.text());});
  for(const theme of catalog){
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:width===1440?1200:844});
    const response=await page.goto(base+'/themes/'+theme.key);
    assert.equal(response.status(),200,theme.key);
    await page.locator('.sf-hero h1').waitFor();
    await page.getByRole('button',{name:'Open cart',exact:true}).click();
    await page.getByRole('dialog',{name:'Your Shopping Bag',exact:true}).waitFor({state:'visible'});
    await page.keyboard.press('Escape');
    await page.getByRole('dialog',{name:'Your Shopping Bag',exact:true}).waitFor({state:'hidden'});
    await page.evaluate(()=>document.activeElement instanceof HTMLElement && document.activeElement.blur());
    await page.locator('.sf img').evaluateAll(async images=>{await Promise.all(images.map(async image=>{image.loading='eager';await image.decode().catch(()=>{});}));});
    const data=await page.evaluate(()=>{
      const heading=document.querySelector('.sf-hero h1');const text=heading.firstChild;let orphanPunctuation=false;
      if(text?.textContent.endsWith('.')){const range=document.createRange();const end=text.textContent.length;range.setStart(text,end-2);range.setEnd(text,end-1);const before=range.getBoundingClientRect().top;range.setStart(text,end-1);range.setEnd(text,end);orphanPunctuation=Math.abs(before-range.getBoundingClientRect().top)>1;}
      return {overflow:document.documentElement.scrollWidth>innerWidth,orphanPunctuation,ctaBackground:getComputedStyle(document.querySelector('.sf-hero .sf-primary-link')).backgroundColor,brokenImages:[...document.querySelectorAll('.sf img')].filter(image=>!image.complete||!image.naturalWidth).map(image=>image.src),heroColumns:getComputedStyle(document.querySelector('.sf-hero')).gridTemplateColumns,heroDisplay:getComputedStyle(document.querySelector('.sf-hero')).display,productColumns:getComputedStyle(document.querySelector('.sf-product-grid')).gridTemplateColumns,titleFont:getComputedStyle(heading).fontFamily};
    });
    assert(!data.overflow,theme.key+' at '+width+' overflows');assert.equal(data.brokenImages.length,0,theme.key+' images');
    assert(!data.orphanPunctuation,theme.key+' at '+width+' leaves punctuation on its own line');
    if(theme.family!==theme.key){const rgb=[1,3,5].map(offset=>parseInt(theme.accent.slice(offset,offset+2),16));assert.equal(data.ctaBackground,`rgb(${rgb.join(', ')})`,theme.key+' must use its own accent');}
    assert.equal(await page.getByRole('navigation',{name:theme.category+' themes',exact:true}).getByRole('link').count(),3);
    if(width===1440){
      const box=await page.locator('.sf').boundingBox();
      const path=process.env.THEME_PROBE_CAPTURE==='false'?'.gravitas/sessions/theme-segments/'+theme.key+'-desktop.jpg':'apps/web/public'+theme.preview_image_url;
      await page.screenshot({path,type:'jpeg',quality:82,clip:{x:0,y:box.y,width,height:1000}});
    }else await page.screenshot({path:'.gravitas/sessions/theme-segments/'+theme.key+'-mobile.png'});
    results.push({key:theme.key,category:theme.category,width,...data});
   }
  }
  assert.equal(errors.length,0,JSON.stringify(errors));
  fs.writeFileSync('.gravitas/sessions/theme-segments/visual.json',JSON.stringify({results,errors},null,2));
  console.log('PASS: '+catalog.length+' previews at desktop/mobile sizes, matching local images and three related designs per preview; no overflow or JavaScript errors.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
