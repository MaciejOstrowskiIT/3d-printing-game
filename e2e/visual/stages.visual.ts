import { expect } from '@playwright/test';
import { seededRng } from '../../src/core/ctx';
import { loadStage, type Stage } from '../fixtures';
import { expectHealthy, test } from '../helpers';

// Opt-in visual baseline: one screenshot per promo stage save and project (desktop, phone).
// Run with `npm run e2e:visual`; see README "Visual regression" for updating the committed baselines.
const stages: Stage[] = ['garage', 'workshop', 'factory', 'research', 'space'];
const FIXED_TIME = new Date('2026-02-03T12:00:00Z');

test.describe.configure({ mode: 'parallel' });

for (const stage of stages) {
  test(`${stage} matches the baseline`, async ({ page }) => {
    // Same random numbers and the same wall clock on every run (dates, the order of the day, countdowns).
    await page.addInitScript({ content: `Math.random = (${seededRng.toString()})(1);` });
    await page.clock.setFixedTime(FIXED_TIME);
    // The game asks the host for the time (HEAD with ?_clock=); answer without a Date header so it never syncs.
    await page.route(url => url.searchParams.has('_clock'), route => route.fulfill({ status: 200, body: '' }));

    await page.goto('/#debug');
    await expect(page.locator('.title-screen')).toBeVisible();
    await page.waitForFunction(() => Boolean(window.__drk?.advanceBot));
    // Stop the real-time loop before loading, so the save is shown exactly as committed (no ticks in between).
    await page.evaluate(() => { window.__drk!.advanceBot!(0); });
    await loadStage(page, stage);
    await expect(page.locator('.app')).toBeVisible();
    await expect(page.locator('#boot')).toHaveCount(0);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    });
    await expectHealthy(page);

    await expect(page).toHaveScreenshot(`${stage}.png`);
  });
}
