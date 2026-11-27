import { expect } from '@playwright/test';
import { BAL } from '../../src/content/balance';
import { createState } from '../../src/core/state';
import { openNotifications, test } from '../helpers';

for (const { locale, accept, hint } of [
  { locale: 'pl-PL', accept: 'Przyjmij', hint: 'Nowe figurki trafiają najpierw do zamówienia' },
  { locale: 'en-US', accept: 'Accept', hint: 'New figurines go to the order first' },
]) {
  test.describe(locale, () => {
    test.use({ locale });

    test('keeps the special order card height when accepted', async ({ page }) => {
      const state = {
        ...createState(),
        goal: 3,
        ord: { n: 1250, got: 0, time: 90, left: 90, offer: BAL.orderOffer, acc: false, c: 6, pay: 25000 },
      };
      await page.goto('/#debug');
      await page.waitForFunction(() => Boolean(window.__drk));
      await page.evaluate(save => window.__drk!.load(save), state);

      await openNotifications(page);
      const card = page.locator('.order-card');
      const acceptButton = card.getByRole('button', { name: accept, exact: true });
      await expect(acceptButton).toBeVisible();
      const height = () => card.evaluate(element => element.getBoundingClientRect().height);
      const before = await height();

      await acceptButton.click();
      await expect(card.getByText(hint, { exact: false })).toBeVisible();
      await expect(acceptButton).toHaveCount(0);
      expect(await height()).toBe(before);
    });
  });
}
