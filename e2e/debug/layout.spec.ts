import { expect, type Page } from '@playwright/test';
import research from '../../promo/states/research.json' with { type: 'json' };
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
