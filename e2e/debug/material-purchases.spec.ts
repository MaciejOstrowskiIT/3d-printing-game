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

test('keeps Buy and Use the same size with a visible outline in dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/#debug');
  await page.waitForFunction(() => Boolean(window.__drk));
  // The disabled Buy button includes a second line with the missing amount.
  await page.evaluate(save => window.__drk!.load(save), { ...createState(), goal: 1, total: 150 });

  const panel = page.locator('section.materials');
  const petg = panel.getByRole('group', { name: 'PETG', exact: true });
  const buy = petg.getByRole('button', { name: /^Kup/ });
  const use = petg.getByRole('button', { name: 'Użyj', exact: true });
  await expect(buy).toBeDisabled();
  await expect(use).toBeEnabled();
  const size = (element: Element) => ({ width: element.clientWidth, height: element.clientHeight });
  expect(await use.evaluate(size)).toEqual(await buy.evaluate(size));
  const outline = await use.evaluate(element => getComputedStyle(element).borderTopColor);
  const cardBorder = await panel.evaluate(element => getComputedStyle(element).borderTopColor);
  expect(outline).not.toBe(cardBorder);
});

test('switches filament by selecting a row in the HUD', async ({ page, isMobile }) => {
  await page.goto('/#debug');
  await page.waitForFunction(() => Boolean(window.__drk));
  await page.evaluate(save => window.__drk!.load(save), {
    ...createState(), goal: 1, total: 150, materialStock: { petg: 2500 },
  });

  const chip = page.locator('.hud').getByRole('button', { name: /^Filament/ });
  if (isMobile) await chip.tap();
  else await chip.hover();
  const menu = page.getByRole('dialog', { name: 'Filament według rodzajów' });
  const petg = menu.getByRole('button', { name: /^PETG/ });
  const pla = menu.getByRole('button', { name: /^PLA/ });
  await expect(pla).toHaveAttribute('aria-pressed', 'true');
  if (isMobile) await petg.tap();
  else await petg.click();
  await expect(petg).toHaveAttribute('aria-pressed', 'true');
  await expect(pla).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => window.__drk!.state().materialId)).toBe('petg');
});
