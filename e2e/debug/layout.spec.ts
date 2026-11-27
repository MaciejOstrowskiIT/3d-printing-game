import { expect, type Page } from '@playwright/test';
import research from '../../promo/states/research.json' with { type: 'json' };
import { createState } from '../../src/core/state';
import { newPeriod, PERIOD_SECONDS } from '../../src/systems/workshopStats';
import { test } from '../helpers';

/** Loads the research save with enough total output for every material to be unlocked, on the Workshop tab. */
async function openWorkshop(page: Page) {
  await page.goto('/#debug');
  await page.waitForFunction(() => Boolean(window.__drk));
  await page.evaluate(save => { window.__drk!.load(JSON.stringify({ ...save, total: Math.max(save.total, 5e6), tab: 'w' })); }, research);
  await expect(page.locator('.materials')).toBeVisible();
}

const rect = (page: Page, selector: string) => page.locator(selector).first().evaluate(e => {
  const r = e.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
});

test('Workshop and Research share one frame: width, HUD and tab buttons stay put', async ({ page }, info) => {
  test.skip(info.project.use.isMobile === true, 'the desktop HUD tabs are hidden on phones');
  await openWorkshop(page);
  const frame = async () => ({ hud: await rect(page, '.hud'), content: await rect(page, '.content').then(({ x, width }) => ({ x, width })), tabW: await rect(page, '.tabW'), tabR: await rect(page, '.tabR') });
  const workshop = await frame();
  await page.locator('.tabR').click();
  await expect(page.locator('.workshop-layout')).toHaveCount(0);
  expect(await frame()).toEqual(workshop);
  await page.locator('.tabW').click();
  expect(await frame()).toEqual(workshop);
});

test('switching material does not resize the Materials card or its buttons', async ({ page }, info) => {
  await openWorkshop(page);
  if (info.project.use.isMobile) await page.locator('.dock .tab').first().click();
  const card = page.locator('.materials');
  const snapshot = () => card.evaluate(c => ({ height: Math.round(c.getBoundingClientRect().height), buttons: [...c.querySelectorAll('.material-actions button')].map(b => Math.round(b.getBoundingClientRect().width)) }));
  const before = await snapshot();
  for (let i = 0; i < 3; i++) {
    await card.locator('.material-actions button[aria-pressed="false"]').first().click();
    expect(await snapshot()).toEqual(before);
  }
});

for (const { locale, sales, fast, growth } of [
  { locale: 'pl-PL', sales: 'Sprzedaż', fast: 'Wszystko schodzi od ręki', growth: 'Zapas rośnie' },
  { locale: 'en-US', sales: 'Sales', fast: 'Everything sells instantly', growth: 'Stock is growing' },
]) {
  test.describe(locale, () => {
    test.use({ locale });

    test('sales advice does not resize the Sales card', async ({ page, isMobile }) => {
      if (isMobile) await page.setViewportSize({ width: 320, height: 844 });
      await page.goto('/#debug');
      await page.waitForFunction(() => Boolean(window.__drk));
      const state = { ...createState(), goal: 1, total: 35, financeTime: PERIOD_SECONDS };
      const period = newPeriod(0);
      period.models.fig = { pieces: 4, revenue: 24, stocked: 18 };
      const card = page.locator('.workshop-sales');
      const advice = card.locator('.sales-flow');
      const load = async (save: typeof state) => {
        await page.evaluate(save => window.__drk!.load(save), save);
        if (isMobile) await page.locator('.dock').getByRole('button', { name: sales, exact: true }).click();
      };

      await load(state);
      await expect(advice).toBeEmpty();
      await expect(card).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const { height } = await rect(page, '.workshop-sales');

      await load({ ...state, sold: 20 });
      await expect(advice).toContainText(fast);
      expect((await rect(page, '.workshop-sales')).height).toBe(height);

      await load({ ...state, sold: 20, inv: 15, finance: [period] });
      await expect(advice).toContainText(growth);
      expect((await rect(page, '.workshop-sales')).height).toBe(height);
    });
  });
}
