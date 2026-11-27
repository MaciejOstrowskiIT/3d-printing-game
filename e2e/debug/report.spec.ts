import { expect } from '@playwright/test';
import { expectHealthy, test } from '../helpers';

test('bug report form opens in preview mode, sends nothing and enforces the cooldown', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', r => { if (r.method() === 'POST') requests.push(r.url()); });
  await page.goto('/#debug');
  await page.waitForFunction(() => Boolean(window.__drk));
  await page.getByRole('button', { name: 'Report a bug' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/Preview: reports are not sent/)).toBeVisible();
  const send = dialog.getByRole('button', { name: 'Send' });
  await expect(send).toBeDisabled();
  await dialog.getByRole('textbox').fill('The counter shows NaN after printing');
  await send.click();
  await expect(dialog.getByText('Thank you, report sent!')).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Next report in \d+ s/ })).toBeDisabled();
  expect(requests).toEqual([]);
  await expectHealthy(page);
});
