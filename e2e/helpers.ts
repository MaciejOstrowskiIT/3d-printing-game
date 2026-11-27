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

export async function expectHealthy(page: Page) {
  const errors = errorsByPage.get(page);
  if (!errors) throw new Error('Use the test fixture from e2e/helpers to capture browser errors.');
  const text = await page.locator('body').innerText();
  expect(errors, 'Browser errors since the page was created').toEqual([]);
  expect(text, 'Visible game text should contain no invalid values').not.toMatch(/NaN|undefined|Infinity|\[object/);
}
