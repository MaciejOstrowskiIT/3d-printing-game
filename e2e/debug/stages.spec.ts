import { expect } from '@playwright/test';
import { createState } from '../../src/core/state';
import { loadStage, type Stage } from '../fixtures';
import { expectHealthy, test } from '../helpers';

const stageHeadings: Record<Stage, string> = {
  garage: 'Investments',
  workshop: 'Production line',
  factory: 'Production line',
  research: 'Computer',
  space: 'Asteroid belt',
};

for (const [stage, heading] of Object.entries(stageHeadings)) {
  test(`renders the ${stage} save`, async ({ page }) => {
    await page.goto('/#debug');
    await loadStage(page, stage as Stage);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expectHealthy(page);
  });
}

test('dispatches actions, steps time and renders the new state', async ({ page }) => {
  await page.goto('/#debug');
  await page.waitForFunction(() => Boolean(window.__drk));
  const result = await page.evaluate(save => {
    const debug = window.__drk!;
    debug.load(save);
    const printed = debug.act('print');
    debug.step(1.125);
    const snapshot = debug.state();
    snapshot.total = -1;
    const { play, total } = debug.state();
    return { printed, play, total };
  }, createState());

  expect(result).toEqual({ printed: true, play: 1.125, total: 1 });
  await expect(page.locator('.count .num')).toHaveText('1');
  await expectHealthy(page);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
});

test('requires the debug fragment in the QA build', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__drk)).toBeUndefined();
});
