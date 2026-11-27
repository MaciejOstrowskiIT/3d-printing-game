import { expect, type Locator } from '@playwright/test';
import { createState } from '../src/core/state';
import { expectHealthy, test } from './helpers';

test('starts a fresh workshop, prints and switches game tabs', async ({ page, isMobile }) => {
  const nav = page.locator(isMobile ? '.dock' : '.hud');
  const print = isMobile
    ? nav.getByRole('button', { name: 'Faster', exact: true })
    : page.getByRole('button', { name: /^Speed up printing/ });
  const printed = page.locator('.count .num');
  const press = (control: Locator) => isMobile ? control.tap() : control.click();
  const production = page.getByRole('heading', { name: 'Investments', exact: true });
  // Desktop: tabs in the HUD. Phone: a navigation bar (with Print in the middle) that marks the current view.
  const view = (name: string | RegExp) => nav.getByRole(isMobile ? 'button' : 'tab', { name, exact: typeof name === 'string' });
  const expectCurrent = (control: Locator) => isMobile
    ? expect(control).toHaveAttribute('aria-current', 'page')
    : expect(control).toHaveAttribute('aria-selected', 'true');

  await page.goto('/');
  const play = page.getByRole('button', { name: 'Play', exact: true });
  await expect(play).toBeVisible();
  await expectHealthy(page);
  await play.click();
  await press(print);
  await expect(printed).toHaveText(/^[1-9]\d*$/);

  // The title only offers New game after there is progress to replace.
  await page.reload();
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByRole('button', { name: 'Sure? Your progress will be lost' }).click();
  await expect(printed).toHaveText('0');

  await press(print);
  await expect(printed).toHaveText(/^[1-9]\d*$/);
  await expectHealthy(page);

  // Research unlocks later. Reach it via the normal save import UI.
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await settings.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(settings).toBeHidden();
  const save = page.getByRole('dialog', { name: 'Saved game' });
  await save.getByRole('textbox', { name: 'Load a save' }).fill(JSON.stringify({ ...createState(), goal: 5 }));
  await save.getByRole('button', { name: 'Load', exact: true }).click();
  await save.getByRole('button', { name: 'This replaces your current game. Click again' }).click();
  await expect(save.getByRole('status')).toHaveText('Save loaded.');
  await save.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(production).toBeVisible();
  await expectHealthy(page);

  if (isMobile) {
    const sales = view('Sales');
    await press(sales);
    await expectCurrent(sales);
    await expect(page.getByRole('heading', { name: 'Sales', exact: true })).toBeVisible();
    await expectHealthy(page);
  }

  const research = view(/^Research/);
  await press(research);
  await expectCurrent(research);
  await expect(page.getByRole('heading', { name: 'Computer', exact: true })).toBeVisible();
  await expectHealthy(page);

  const workshop = view(isMobile ? /^Production/ : /^Workshop/);
  await press(workshop);
  await expectCurrent(workshop);
  await expect(production).toBeVisible();
  await expectHealthy(page);
});
