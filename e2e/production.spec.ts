import { expect } from '@playwright/test';
import { test } from './helpers';

test('excludes the debug hook from the release build', async ({ page }) => {
  const response = await page.goto('/#debug');
  expect(await response?.text()).not.toContain('__drk');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__drk)).toBeUndefined();
});
