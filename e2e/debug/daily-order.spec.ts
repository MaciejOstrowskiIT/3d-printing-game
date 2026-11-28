import { expect } from '@playwright/test';
import { BAL } from '../../src/content/balance';
import { createState } from '../../src/core/state';
import { openNotifications, test } from '../helpers';

const languages = [
  {
    locale: 'pl-PL',
    ship: /^Wyślij \(/,
    streak: 'dzień serii:',
    limit: 'To jedyne zamówienie na dziś.',
    log: 'Dziennik warsztatu',
    shipped: /Zamówienie dnia wysłane: .+\. Dzień serii: 1\./,
  },
  {
    locale: 'en-US',
    ship: /^Ship \(/,
    streak: 'streak day',
    limit: 'This is today’s only order.',
    log: 'Workshop log',
    shipped: /Order of the day shipped: .+\. Streak day 1\./,
  },
];

for (const { locale, ship, streak, limit, log, shipped } of languages) {
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

      await openNotifications(page);
      const shipButton = page.getByRole('button', { name: ship });
      await expect(page.getByText(limit, { exact: false })).toBeVisible();
      await expect(page.getByText(`${streak} 1`, { exact: true })).toBeVisible();
      await shipButton.click();
      // A shipped order is no longer an open notification: its card leaves the panel and the log confirms the streak.
      await expect(shipButton).toHaveCount(0);
      await expect(page.getByRole('region', { name: log, exact: true })).toContainText(shipped);

      expect(await page.evaluate(today => window.__drk!.act(`day:${today}`), day)).toBe(false);
      await expect(shipButton).toHaveCount(0);

      expect(await page.evaluate(tomorrow => window.__drk!.act(`day:${tomorrow}`), day + 1)).toBe(true);
      await expect(page.getByText(`${streak} 2`, { exact: true })).toBeVisible();
      await expect(shipButton).toBeEnabled();
    });
  });
}
