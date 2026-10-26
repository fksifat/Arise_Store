const assert=require('node:assert/strict');
const {chromium}=require('../../../apps/web/node_modules/playwright');
(async()=>{
const browser=await chromium.launch();
try{
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:3000/login');await page.getByRole('button',{name:'Demo Merchant',exact:true}).click();await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.waitForURL('**/dashboard');await page.getByRole('heading',{name:'Store overview',exact:true}).waitFor();
const reports=[];
for(const width of [1440,390]){
 await page.setViewportSize({width,height:width===1440?1000:844});
 for(const route of ['','orders','products','categories','themes','domains','subscription','settings']){
  await page.goto('http://localhost:3000/dashboard'+(route?'/'+route:''));
  await page.getByRole('heading',{level:1}).waitFor();
  await page.getByRole('status').filter({hasText:'Loading your store…'}).waitFor({state:'hidden'});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  const mainTop=await page.locator('#merchant-content').evaluate(el=>el.getBoundingClientRect().top);
  assert(!overflow,`${route} overflows at ${width}`);if(width===390)assert(mainTop<=65);
  assert.equal(await page.locator('#merchant-content').getByRole('alert').count(),0,`${route} has an error`);
  await page.screenshot({path:`.gravitas/sessions/dashboard/after-${route||'overview'}-${width}.png`,fullPage:true});
  reports.push({route:route||'overview',width,overflow,mainTop});
 }
}
assert.deepEqual(errors,[]);console.log(JSON.stringify({reports,errors}));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
