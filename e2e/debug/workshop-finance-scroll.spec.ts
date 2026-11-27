import { expect } from '@playwright/test';
import { createState } from '../../src/core/state';
import { bookCash, PERIOD_SECONDS } from '../../src/systems/workshopStats';
import { expectHealthy, test } from '../helpers';

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`rolls the live finance chart with motion set to ${reducedMotion}`, async ({ page, isMobile }) => {
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
    if (isMobile) {
      await page.getByRole('tab', { name: 'Sales', exact: true }).tap();
      await page.getByRole('button', { name: /^Workshop results/ }).tap();
    }

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
