import { expect } from '@playwright/test';
import { createState } from '../../src/core/state';
import { test } from '../helpers';

test.use({ locale: 'pl-PL' });

test('buys a material from its row and keeps it in reserve until selected', async ({ page }) => {
  await page.goto('/#debug');
  await page.waitForFunction(() => Boolean(window.__drk));
  await page.evaluate(save => window.__drk!.load(save), { ...createState(), goal: 1, total: 150, zl: 1000 });

  const panel = page.locator('section.materials');
  const petg = panel.getByRole('group', { name: 'PETG', exact: true });
  await expect(panel.getByText(/\/kg · Popyt na bieżący model \+48%/)).toBeVisible();
  await expect(panel.getByText(/Trwałość|w zapasie/)).toHaveCount(0);
  await petg.getByRole('button', { name: /^Kup/ }).click();
  expect(await page.evaluate(() => {
    const state = window.__drk!.state();
    return { active: state.materialId, reserve: state.materialStock.petg };
  })).toEqual({ active: 'pla', reserve: 1000 });
  await petg.getByRole('button', { name: 'Użyj', exact: true }).click();
  await expect(petg.getByRole('button', { name: 'W druku', exact: true })).toBeDisabled();
});
