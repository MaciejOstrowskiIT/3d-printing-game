import { expect, test } from '@playwright/test';

test('shows and dismisses the first onboarding hint across reloads', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByText('Hold Print a figurine to start production.')).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss hint' }).click();
  await expect(page.getByRole('button', { name: 'Dismiss hint' })).toHaveCount(0);

  await page.reload();
  await page.getByRole('button', { name: /^(Play|Continue)$/ }).click();
  await expect(page.getByRole('button', { name: 'Dismiss hint' })).toHaveCount(0);
});
