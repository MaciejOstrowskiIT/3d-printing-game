import { expect } from '@playwright/test';
import { createState } from '../../src/core/state';
import { bookCash, PERIOD_SECONDS } from '../../src/systems/workshopStats';
import { expectHealthy, openFundsPanel, test } from '../helpers';

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`rolls the live finance chart with motion set to ${reducedMotion}`, async ({ page }) => {
    const state = { ...createState(), total: 50, goal: 2 };
    bookCash(state, 'sales', 100);
    state.financeTime = 8 * PERIOD_SECONDS;
    bookCash(state, 'equipment', 20);
    state.financeTime = 10 * PERIOD_SECONDS - 10;

    await page.emulateMedia({ reducedMotion });
    await page.clock.install();
    await page.goto('/#debug');
    await page.waitForFunction(() => Boolean(window.__drk));
    await page.evaluate(save => window.__drk!.load(save), state);
    await openFundsPanel(page);

    const chart = page.getByRole('group', { name: 'Income and spending in 30-second intervals' });
    const sample = chart.getByRole('button', { name: /^About 30s ago/ });
    await sample.click();
    await expect(sample).toHaveAttribute('aria-pressed', 'true');
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));

    const readPosition = () => chart.evaluate(plot => {
      const marker = plot.querySelector<HTMLElement>('button[aria-pressed="true"] .stats-marker.stats-out')!;
      const guide = plot.querySelector('.stats-crosshair')!;
      return { x: Number(guide.getAttribute('x1')), y: parseFloat(marker.style.top) };
    });
    const before = await readPosition();

    await page.evaluate(() => window.__drk!.step(11));
    await expect(chart.getByRole('button', { name: /^About 60s ago/ })).toHaveAttribute('aria-pressed', 'true');

    if (reducedMotion === 'no-preference') {
      expect(await readPosition()).toEqual(before);
      await page.clock.runFor(180);
      const during = await readPosition();
      expect(during.x).toBeLessThan(before.x);
      expect(during.x).toBeGreaterThan(before.x - 100);
      expect(during.y).toBeLessThan(before.y);
      expect(during.y).toBeGreaterThan(9.375);
      await page.clock.runFor(300);
    }

    expect(await readPosition()).toEqual({ x: before.x - 100, y: 9.375 });
    await expectHealthy(page);
  });
}

test('continues the live line when a new period starts empty', async ({ page }) => {
  const state = { ...createState(), total: 50, goal: 2, financeTime: 8 * PERIOD_SECONDS };
  bookCash(state, 'sales', 80);
  bookCash(state, 'equipment', 20);
  state.financeTime += PERIOD_SECONDS;
  bookCash(state, 'sales', 80);
  bookCash(state, 'equipment', 20);
  state.financeTime = 10 * PERIOD_SECONDS - 3;

  await page.clock.install();
  await page.goto('/#debug');
  await page.waitForFunction(() => Boolean(window.__drk));
  await page.evaluate(save => window.__drk!.load(save), state);
  await openFundsPanel(page);

  const chart = page.getByRole('group', { name: 'Income and spending in 30-second intervals' });
  const live = chart.getByRole('button', { name: /^Now\./ });
  await expect(live).toHaveAccessibleName('Now. Income $80.00. Spending $20.00.');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 500));

  const lineEndHeights = () => chart.locator('svg > .stats-line').evaluateAll(lines => lines.map(line => {
    const path = line as SVGPathElement;
    return 100 * path.getPointAtLength(path.getTotalLength()).y / path.ownerSVGElement!.viewBox.baseVal.height;
  }));
  const before = await lineEndHeights();
  expect(before).toHaveLength(2);

  await page.evaluate(() => window.__drk!.step(3));
  await expect(live).toHaveAccessibleName('Now. Income $0.00. Spending $0.00.');
  await page.clock.runFor(450);
  const atRollover = await lineEndHeights();
  for (const [i, y] of atRollover.entries()) expect(Math.abs(y - before[i])).toBeLessThan(8);

  await page.evaluate(() => window.__drk!.step(14));
  const halfway = await lineEndHeights();
  for (const [i, y] of halfway.entries()) {
    expect(y).toBeGreaterThan(atRollover[i]);
    expect(y).toBeLessThan(90);
  }
  await expectHealthy(page);
});
