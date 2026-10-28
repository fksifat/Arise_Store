import { test, expect } from '@playwright/test';
const run = process.env.E2E_RUN_ID || Date.now().toString();

test('account forms have aligned controls, complete placeholders and mobile bounds', async ({page})=>{
  for(const [width,height] of [[320,900],[390,844],[768,1024],[1440,1000],[844,390]]){
    await page.setViewportSize({width,height});
    for(const path of ['/login','/register']){
      await page.goto(path);
      await expect(page.getByLabel('Email Address',{exact:true})).toBeEnabled();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await expect(page.getByRole('link',{name:'Privacy notice (opens in a new tab)',exact:true})).toBeVisible();
      if(path==='/register')await expect(page.getByRole('checkbox',{name:/I agree to Arise/})).not.toBeChecked();
      await expect(page.getByRole('link',{name:'Back to Home',exact:true})).toHaveAttribute('href','/');
      const panel=(await page.locator('.auth-panel').boundingBox())!;
      const brand=(await page.locator('.auth-panel > .auth-brand').boundingBox())!;
      const back=(await page.locator('.auth-back').boundingBox())!;
      expect(Math.abs(brand.x+brand.width/2-panel.x-panel.width/2)).toBeLessThan(2);
      expect(Math.abs(back.x-panel.x)).toBeLessThan(2);
      const fields = page.locator('.auth-field');
      await expect(fields).toHaveCount(path==='/login'?2:4);
      for(const field of await fields.all()){
        const input = field.locator('input'), icon = field.locator('.auth-input > svg');
        await expect(input).toHaveAttribute('placeholder', /\S/);
        const i=(await input.boundingBox())!, s=(await icon.boundingBox())!;
        expect(i.height).toBeGreaterThanOrEqual(44);
        expect(i.x).toBeGreaterThanOrEqual(s.x+s.width+8);
        expect(Math.abs(i.y+i.height/2-s.y-s.height/2)).toBeLessThan(3);
        const reveal=field.getByRole('button');
        if(await reveal.count())expect(i.x+i.width).toBeLessThanOrEqual((await reveal.boundingBox())!.x-6);
      }
      if(path==='/login'){
        await expect(page.getByRole('checkbox',{name:'Remember me for 7 days'})).not.toBeChecked();
        await expect(page.getByRole('button',{name:'Forgot password?',exact:true})).toBeDisabled();
        await expect(page.locator('.auth-switch')).toContainText("Don't have an account?");
      }
      await expect(page.getByText('Coming soon',{exact:true})).toHaveCount(0);
      await expect(page.getByText('Use this only on a private device.',{exact:true})).toHaveCount(0);
      await page.getByLabel('Email Address',{exact:true}).focus();
      expect(await page.locator('.auth-input').filter({has:page.getByLabel('Email Address',{exact:true})}).evaluate(el=>getComputedStyle(el).boxShadow)).not.toBe('none');
    }
  }
});

test('password controls are independent and policy drafts open without losing form input', async ({page,context})=>{
  await page.goto('/register');
  const password = page.getByLabel('Password',{exact:true});
  const strength = page.getByRole('meter',{name:'Password strength'});
  await expect(password).toHaveAttribute('minlength','8');
  await expect(page.getByLabel('Confirm Password',{exact:true})).toHaveAttribute('minlength','8');
  await expect(strength).toHaveCount(0);
  for(const [value,label] of [['short12','Weak'],['Ab1!test','Fair'],['Ab1!password','Good'],['Ab1!long-password','Strong']]){
    await password.fill(value);
    await expect(strength).toHaveAttribute('aria-valuetext',label);
  }
  await password.clear();
  await expect(strength).toHaveCount(0);
  await expect(page.getByText(/Use at least \d+ characters/)).toHaveCount(0);
  await page.getByLabel('Your Full Name',{exact:true}).fill('Policy Reader');
  await page.getByLabel('Password',{exact:true}).fill('Password-review-123');
  await page.getByLabel('Confirm Password',{exact:true}).fill('Mismatch-review-123');
  await expect(page.getByLabel('Confirm Password',{exact:true})).toHaveAttribute('aria-invalid','true');
  await expect(page.locator('#register-confirm-password-hint')).toHaveText('Passwords must match.');
  await page.getByRole('button',{name:'Show password',exact:true}).click();
  await expect(page.getByLabel('Password',{exact:true})).toHaveAttribute('type','text');
  await expect(page.getByLabel('Confirm Password',{exact:true})).toHaveAttribute('type','password');
  await page.getByRole('button',{name:'Show confirm password',exact:true}).click();
  await expect(page.getByLabel('Confirm Password',{exact:true})).toHaveAttribute('type','text');
  for(const title of ['Privacy notice','Terms of use']){
    const opened=context.waitForEvent('page');
    await page.getByRole('link',{name:new RegExp(title)}).click();
    const policy=await opened;
    await expect(policy.getByRole('heading',{name:title,exact:true})).toBeVisible();
    await expect(policy.getByRole('complementary',{name:'Draft policy notice'})).toContainText('Draft for review');
    await expect(policy.locator('meta[name=robots]')).toHaveAttribute('content',/noindex/);
    await policy.close();
    await expect(page.getByLabel('Your Full Name',{exact:true})).toHaveValue('Policy Reader');
    await expect(page.getByLabel('Password',{exact:true})).toHaveValue('Password-review-123');
  }
});

test('remembered login lasts seven days and signing out revokes it', async ({page,baseURL})=>{
  const email=`e2e-${run}-auth@example.com`, password='Remember-review-password-123';
  const headers={Origin:new URL(baseURL!).origin};
  const created=await page.request.post('/api/v1/auth/register',{headers,data:{name:'Remember Owner',email,password}});
  expect(created.status()).toBe(201);
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Email Address',{exact:true}).fill(email);
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('checkbox',{name:'Remember me for 7 days'}).check();
  const response=page.waitForResponse(r=>r.url().endsWith('/api/v1/auth/login')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Sign In',exact:true}).click();
  const login=await response;expect(login.status()).toBe(200);
  const {access_token:token}=await login.json();
  await expect(page).toHaveURL(/\/setup/);
  await expect(page.getByRole('status')).toHaveText('All changes saved');
  const cookie=(await page.context().cookies()).find(cookie=>cookie.name==='arise_session')!;
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.expires-Date.now()/1000).toBeGreaterThan(7*86400-30);
  expect(cookie.expires-Date.now()/1000).toBeLessThanOrEqual(7*86400+1);
  expect((await page.request.post('/api/v1/auth/logout',{headers})).status()).toBe(204);
  expect((await page.request.get('/api/v1/auth/me',{headers:{Authorization:`Bearer ${token}`}})).status()).toBe(401);
});
