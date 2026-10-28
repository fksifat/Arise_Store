import { test, expect, type Page } from '@playwright/test';
const run = process.env.E2E_RUN_ID || Date.now().toString();
const email = `e2e-${run}-setup@example.com`;
const password = 'Setup-test-password-123';

async function submitAuth(page: Page, action: 'login' | 'register') {
  const submit = async () => {
    const response = page.waitForResponse(response=>new URL(response.url()).pathname===`/api/v1/auth/${action}` && response.request().method()==='POST', {timeout:15000});
    await page.getByRole('button', {name:action==='login'?'Sign In':'Create account',exact:true}).click();
    return response;
  };
  let response = await submit();
  if (response.status()===429) {
    await page.waitForTimeout(Number(response.headers()['retry-after'] || '60') * 1000);
    response = await submit();
  }
  expect(response.ok(), await response.text()).toBe(true);
}


test('account first, resumable setup across browser sessions and safe creation retry', async ({ page, browser, baseURL }) => {
  test.setTimeout(180000);
  await page.goto('/register?theme=fashion-noir');
  await expect(page.locator('form input:not([type=checkbox])')).toHaveCount(4);
  await expect(page.getByRole('radio')).toHaveCount(0);
  await page.getByLabel('Your Full Name', {exact:true}).fill('Setup Owner');
  await page.getByLabel('Email Address', {exact:true}).fill(email);
  await page.getByLabel('Password', {exact:true}).fill(password);
  await page.getByLabel('Confirm Password', {exact:true}).fill('Different-password-123');
  await page.getByRole('checkbox', {name:/I agree to Arise/}).check();
  await page.getByRole('button', {name:'Create account',exact:true}).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('Passwords do not match.');
  await page.getByLabel('Confirm Password', {exact:true}).fill(password);
  await submitAuth(page, 'register');
  await expect(page).toHaveURL(/\/setup/);
  await expect(page.getByRole('radio', {name:'Online store',exact:true})).toBeChecked();
  expect(await (await page.request.get('/api/v1/shops')).json()).toEqual([]);
  await page.getByRole('button', {name:'Continue',exact:true}).click();
  await page.getByLabel('Website URL name', {exact:true}).fill(`setup-${run}`);
  await page.getByLabel('Website name', {exact:true}).fill('বাংলা দোকান');
  await expect(page.getByLabel('Website URL name', {exact:true})).toHaveValue(`setup-${run}`);
  await expect(page.getByRole('status')).toHaveText('All changes saved');
  await page.close();

  const fresh = await browser.newContext({baseURL});
  try {
    const resumed = await fresh.newPage();
    await resumed.goto('/login');
    await expect(resumed.locator('form input:not([type=checkbox])')).toHaveCount(2);
    await resumed.getByLabel('Email Address').fill(email);
    await resumed.getByLabel('Password', {exact:true}).fill(password);
    await submitAuth(resumed, 'login');
    await expect(resumed.getByRole('heading', {name:'Give your website a name.'})).toBeVisible();
    await expect(resumed.getByLabel('Website name', {exact:true})).toHaveValue('বাংলা দোকান');
    await expect(resumed.getByLabel('Website URL name', {exact:true})).toHaveValue(`setup-${run}`);
    await resumed.getByRole('button', {name:'Continue',exact:true}).click();
    await expect(resumed.getByRole('radio', {name:'Fashion Noir',exact:true})).toBeChecked();
    await resumed.getByRole('button', {name:'Continue',exact:true}).click();
    await resumed.getByRole('button', {name:'Save and sign out',exact:true}).click();
    await expect(resumed).toHaveURL(/\/login$/);
    await resumed.getByLabel('Email Address').fill(email);
    await resumed.getByLabel('Password', {exact:true}).fill(password);
    await submitAuth(resumed, 'login');
    await expect(resumed.getByRole('heading', {name:'Ready for your next chapter?'})).toBeVisible();
    await resumed.route('**/api/v1/shops',route=>route.fulfill({status:400,json:{detail:'This URL is already taken'}}),{times:1});
    await resumed.getByRole('button', {name:'Create website',exact:true}).click();
    await expect(resumed.locator('main').getByRole('alert')).toContainText('already taken');
    await resumed.reload();
    await expect(resumed.getByRole('heading', {name:'Ready for your next chapter?'})).toBeVisible();
    await resumed.getByRole('button', {name:'Back',exact:true}).click();
    await resumed.getByRole('button', {name:'Back',exact:true}).click();
    await resumed.getByLabel('Website URL name',{exact:true}).fill(`setup-${run}`);
    await resumed.getByRole('button', {name:'Continue',exact:true}).click();
    await resumed.getByRole('button', {name:'Continue',exact:true}).click();
    await resumed.getByRole('button', {name:'Create website',exact:true}).click();
    await expect(resumed).toHaveURL(/\/dashboard$/);
    expect(await (await resumed.request.get('/api/v1/setup')).json()).toBeNull();
    expect((await (await resumed.request.get('/api/v1/shops')).json()).length).toBe(1);
    expect((await fresh.cookies()).find(cookie=>cookie.name==='arise_session')?.httpOnly).toBe(true);
    await resumed.reload();
    await expect(resumed.getByRole('heading', {name:'Store overview',exact:true})).toBeVisible();

    await resumed.goto('/setup?new=1');
    await expect(resumed.getByRole('heading',{name:'Store limit reached',exact:true})).toBeVisible();
    const extra=await resumed.request.post('/api/v1/shops',{headers:{Origin:new URL(baseURL!).origin},data:{name:'Second store',slug:`setup-second-${run}`}});
    expect(extra.status()).toBe(409);
    expect((await extra.json()).detail.code).toBe('store_limit_reached');
    expect((await (await resumed.request.get('/api/v1/shops')).json()).length).toBe(1);
    await resumed.getByRole('link',{name:'View Store Portfolio',exact:true}).click();
    await expect(resumed.getByRole('heading',{name:'Store Portfolio',exact:true})).toBeVisible();
    await expect(resumed.getByRole('button',{name:'Create another store',exact:true})).toBeDisabled();
  } finally { await fresh.close(); }
});

test('setup requires a signed-in account', async ({page})=>{
  await page.goto('/setup');
  await expect(page).toHaveURL(/\/login$/);
});
