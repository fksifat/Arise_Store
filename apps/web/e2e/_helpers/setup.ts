import { expect, type Page } from '@playwright/test';

export async function finishSetup(page: Page, type: string, name: string, slug: string) {
  await expect(page).toHaveURL(/\/setup(?:\?|$)/);
  await page.getByRole('radio', { name: type, exact: true }).check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Website name', { exact: true }).fill(name);
  await page.getByLabel('Website URL name', { exact: true }).fill(slug);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Find a look that feels like you.' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Create website', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
