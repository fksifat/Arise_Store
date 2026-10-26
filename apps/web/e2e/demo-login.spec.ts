import { test, expect } from '@playwright/test';

test.skip(process.env.E2E_DEMO_LOGIN !== 'true', 'Requires explicitly enabled local demo accounts');

for (const account of [
  { button: 'Demo Merchant', email: 'merchant@arisestore.com', path: '/dashboard' },
  { button: 'Platform Admin', email: 'admin@arisestore.com', path: '/admin' },
]) {
  test(`${account.button} quick fill signs into the correct dashboard`, async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: account.button, exact: true }).click();
    await expect(page.getByLabel('Email Address')).toHaveValue(account.email);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${account.path}$`));
    await expect(page.getByText('Incorrect email or password', { exact: true })).not.toBeVisible();
    const cookie = (await page.context().cookies()).find(cookie => cookie.name === 'arise_session');
    expect(cookie?.httpOnly).toBe(true);
  });
}
