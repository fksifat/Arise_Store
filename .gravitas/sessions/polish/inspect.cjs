const {chromium}=require('../../../apps/web/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch();const findings=[];const errors=[];
 const scan=async(page,label,path,width)=>{
  await page.setViewportSize({width,height:width===1440?1000:844});
  await page.goto('http://localhost:3000'+path,{waitUntil:'domcontentloaded'});
  await page.getByRole('heading').first().waitFor({timeout:15000});
  await page.getByText(/^(Loading storefront\.\.\.|Loading your store…|Loading your theme library…|Loading platform data…)$/).waitFor({state:'hidden',timeout:15000});
  const data=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,unlabeledButtons:[...document.querySelectorAll('button')].filter(el=>el.getClientRects().length&&!el.textContent.trim()&&!el.getAttribute('aria-label')&&!el.getAttribute('aria-labelledby')&&!el.title).length,unlabeledInputs:[...document.querySelectorAll('input,textarea,select')].filter(el=>el.getClientRects().length&&!['hidden','submit','button'].includes(el.type)&&!el.labels?.length&&!el.getAttribute('aria-label')&&!el.getAttribute('aria-labelledby')).map(el=>el.placeholder||el.type),brokenAnchors:[...document.querySelectorAll('a[href^="#"]')].map(el=>el.getAttribute('href')).filter(href=>href.length>1&&!document.getElementById(href.slice(1)))}));
  findings.push({label,path,width,...data});await page.screenshot({path:`.gravitas/sessions/polish/after-${label}-${width}.png`,fullPage:true});
 };
 const guest=await browser.newPage();guest.on('pageerror',e=>errors.push(e.message));
 for(const width of [1440,390])for(const [label,path] of [['home','/'],['login','/login'],['register','/register'],['fashion-store','/store/fashion-house'],['tech-store','/store/gadget-zone'],['tracking','/store/fashion-house/track'],...['fashion-modern','general-store','tech-cosmetics','home-living','beauty-studio','sport-performance'].map(key=>[key,'/themes/'+key])])await scan(guest,label,path,width);
 await guest.goto('http://localhost:3000/themes/tech-cosmetics');await guest.getByRole('button',{name:'Add to Bag',exact:true}).first().click();await guest.keyboard.press('Escape');findings.push({label:'cart-escape',stayedOpen:await guest.getByRole('heading',{name:'Your Shopping Bag',exact:true}).isVisible()});
 for(const account of [{button:'Demo Merchant',path:'/dashboard'},{button:'Platform Admin',path:'/admin'}]){
  const context=await browser.newContext();const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:3000/login');await page.getByRole('button',{name:account.button,exact:true}).click();await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.waitForURL('**'+account.path);
  for(const width of [1440,390])for(const route of account.path==='/admin'?['admin']:['dashboard','dashboard/orders','dashboard/products','dashboard/categories','dashboard/themes','dashboard/domains','dashboard/subscription','dashboard/settings','dashboard/customers','dashboard/reports'])await scan(page,route.replaceAll('/','-'),'/'+route,width);
  await context.close();
 }
 require('node:fs').writeFileSync('.gravitas/sessions/polish/inspection-after.json',JSON.stringify({findings,errors},null,2));
 await browser.close();
 const problems=findings.filter(row=>row.overflow||row.unlabeledButtons||row.unlabeledInputs?.length||row.brokenAnchors?.length||row.stayedOpen);
 if(errors.length||problems.length)throw new Error(JSON.stringify({errors,problems}));
 console.log('PASS: '+findings.length+' desktop/mobile page and cart checks; no JavaScript errors, page overflow, unnamed controls, broken section anchors or failed Escape dismissal.');
})().catch(e=>{console.error(e);process.exitCode=1;});
