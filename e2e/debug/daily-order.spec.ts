import { expect } from '@playwright/test';
import { BAL } from '../../src/content/balance';
import { createState } from '../../src/core/state';
import { test } from '../helpers';

const languages = [
  {
    locale: 'pl-PL',
    ship: /^Wyślij \(/,
    streak: 'dzień serii:',
    limit: 'To jedyne zamówienie na dziś.',
    next: 'Kolejne zamówienie będzie dostępne jutro.',
  },
  {
    locale: 'en-US',
    ship: /^Ship \(/,
    streak: 'streak day',
    limit: 'This is today’s only order.',
    next: 'The next order is available tomorrow.',
  },
];

for (const { locale, ship, streak, limit, next } of languages) {
  test.describe(locale, () => {
    test.use({ locale });

    test('explains when the next daily order is available', async ({ page }) => {
      const state = { ...createState(), goal: BAL.dailyFromGoal, inv: 1e6 };
      await page.goto('/#debug');
      await page.waitForFunction(() => Boolean(window.__drk));
      const day = await page.evaluate(save => {
        const debug = window.__drk!;
        const now = new Date();
        const today = Math.floor((now.getTime() - now.getTimezoneOffset() * 60_000) / 86_400_000);
        debug.load(save);
        debug.act(`day:${today}`);
        return today;
      }, state);

      const shipButton = page.getByRole('button', { name: ship });
      await expect(page.getByText(limit, { exact: false })).toBeVisible();
      await expect(page.getByText(`${streak} 1`, { exact: true })).toBeVisible();
      await shipButton.click();
      await expect(page.getByText(next, { exact: false })).toBeVisible();
      await expect(page.getByText(`${streak} 1`, { exact: true })).toBeVisible();

      expect(await page.evaluate(today => window.__drk!.act(`day:${today}`), day)).toBe(false);
      await expect(shipButton).toHaveCount(0);

      expect(await page.evaluate(tomorrow => window.__drk!.act(`day:${tomorrow}`), day + 1)).toBe(true);
      await expect(page.getByText(`${streak} 2`, { exact: true })).toBeVisible();
      await expect(shipButton).toBeEnabled();
    });
  });
}
