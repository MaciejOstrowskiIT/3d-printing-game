import { expect, test as base, type Page } from '@playwright/test';

const errorsByPage = new WeakMap<Page, string[]>();

// Register listeners before navigation so startup errors are included.
export const test = base.extend({
  page: async ({ page }, use) => {
    const errors: string[] = [];
    errorsByPage.set(page, errors);
    page.on('console', message => {
      if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
    });
    page.on('pageerror', error => errors.push(`pageerror: ${error.stack ?? error.message}`));
    await use(page);
  },
});

/** Opens the HUD notification panel (hover on desktop, tap on a phone). Orders, messages and breakdowns live there. */
export async function openNotifications(page: Page) {
  await page.locator('.chip.notif:visible').click();
  await expect(page.locator('.hud-pop.pop-notif')).toBeVisible();
}

/** Opens the HUD funds panel (hover on desktop, tap on a phone): the finance chart lives there. */
export async function openFundsPanel(page: Page) {
  await page.locator('.chips .chip.has-pop').first().click();
  await expect(page.locator('.hud-pop.pop-funds')).toBeVisible();
}

export async function expectHealthy(page: Page) {
  const errors = errorsByPage.get(page);
  if (!errors) throw new Error('Use the test fixture from e2e/helpers to capture browser errors.');
  const text = await page.locator('body').innerText();
  expect(errors, 'Browser errors since the page was created').toEqual([]);
  expect(text, 'Visible game text should contain no invalid values').not.toMatch(/NaN|undefined|Infinity|\[object/);
}
