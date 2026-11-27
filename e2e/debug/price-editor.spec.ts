import { expect } from '@playwright/test';
import { createState } from '../../src/core/state';
import { test } from '../helpers';

for (const { locale, price, sales, input, expected, increase, decrease } of [
  { locale: 'pl-PL', price: 'Cena za sztukę', sales: 'Sprzedaż', input: '12,50 zł',
    expected: ['12,50', '12,63', '15,16', '14,66', '15,66'], increase: 'Podnieś cenę o ', decrease: 'Obniż cenę o ' },
  { locale: 'en-US', price: 'Price each', sales: 'Sales', input: '$12.50',
    expected: ['12.50', '12.63', '15.16', '14.66', '15.66'], increase: 'Increase price by ', decrease: 'Decrease price by ' },
]) {
  test.describe(locale, () => {
    test.use({ locale });

    test('sets and adjusts the price per piece', async ({ page, isMobile }) => {
      await page.goto('/#debug');
      await page.waitForFunction(() => Boolean(window.__drk));
      await page.evaluate(save => window.__drk!.load(save), { ...createState(), goal: 1, total: 10 });
      if (isMobile) await page.locator('.dock').getByRole('button', { name: sales, exact: true }).click();

      const field = page.getByRole('textbox', { name: price });
      await field.fill(input);
      await field.press('Enter');
      await expect(field).toHaveValue(expected[0]);

      await page.getByRole('button', { name: increase + '1%', exact: true }).click();
      await expect(field).toHaveValue(expected[1]);
      await page.getByRole('button', { name: increase + '20%', exact: true }).click();
      await expect(field).toHaveValue(expected[2]);
      await page.getByRole('button', { name: decrease + (locale === 'pl-PL' ? '50 gr' : '50¢'), exact: true }).click();
      await expect(field).toHaveValue(expected[3]);
      await page.getByRole('button', { name: increase + (locale === 'pl-PL' ? '1 zł' : '$1'), exact: true }).click();
      await expect(field).toHaveValue(expected[4]);

      await field.fill('0');
      await field.press('Enter');
      await expect(field).toHaveAttribute('aria-invalid', 'true');
      await field.press('Escape');
      await expect(field).toHaveValue(expected[4]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  });
}
