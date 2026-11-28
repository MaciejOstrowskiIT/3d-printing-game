import { expect } from '@playwright/test';
import { BAL } from '../src/content/balance';
import { GOALS } from '../src/content/goals';
import { en } from '../src/content/i18n/en';
import { pl } from '../src/content/i18n/pl';
import { seededRng } from '../src/core/ctx';
import { expectHealthy, test } from './helpers';

const MAX_BATCH_SECONDS = 60;
// Six hours at pace 1, like the balance sim: BAL.pace stretches every flow rate, so the budget scales with it.
const MAX_GAME_HOURS = 6 * BAL.pace;
const MAX_GAME_TICKS = MAX_GAME_HOURS * 60 * 60 * 4;
const languages = [
  { lang: 'pl', locale: 'pl-PL', dict: pl, textIndex: 0 },
  { lang: 'en', locale: 'en-US', dict: en, textIndex: 1 },
] as const;

for (const { lang, locale, dict, textIndex } of languages) {
  test.describe(lang, () => {
    test.use({ locale });

    test('plays the game to the ending and starts a new production line', async ({ page }, testInfo) => {
      test.setTimeout(90_000);
      // Set the game RNG before its store is created and keep calendar modifiers repeatable.
      await page.addInitScript({ content: `Math.random = (${seededRng.toString()})(1);` });
      await page.clock.setFixedTime(new Date('2026-02-03T12:00:00Z'));
      await page.goto('/#debug');
      await page.waitForFunction(() => Boolean(window.__drk?.advanceBot));
      const advanceBot = (seconds: number) => page.evaluate(s => window.__drk!.advanceBot!(s), seconds);
      let checkpoint = await advanceBot(0);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await page.getByRole('button', { name: dict.setOpen, exact: true }).click();
      const settings = page.getByRole('dialog', { name: dict.setTitle });
      await settings.getByRole('checkbox', { name: dict.setSound, exact: true }).uncheck();
      await settings.getByRole('button', { name: dict.sClose, exact: true }).click();
      await page.getByRole('button', { name: dict.tPlay, exact: true }).click();

      const endScreen = page.locator('.end');
      const goal = page.locator('.goal').getByRole('heading');
      const assertGoal = (index: number) =>
        expect(goal).toHaveText(index < GOALS.length ? GOALS[index].t[textIndex] : dict.goalEndT, { useInnerText: true });
      const capture = (name: string) => test.step(name, async () => {
        await expectHealthy(page);
        await page.screenshot({ path: testInfo.outputPath(`${lang}-${name}.png`), animations: 'disabled' });
      });

      await assertGoal(0);
      await capture('goal-00');
      let liftedOff = false;
      while (!checkpoint.end && checkpoint.tick < MAX_GAME_TICKS) {
        const previous = checkpoint;
        checkpoint = await advanceBot(Math.min(MAX_BATCH_SECONDS, (MAX_GAME_TICKS - previous.tick) / 4));
        const milestone: string[] = [];

        if (checkpoint.goal !== previous.goal) {
          await assertGoal(checkpoint.goal);
          // Goals completed in one tick share the same rendered frame.
          for (let index = previous.goal + 1; index <= checkpoint.goal; index++) {
            milestone.push(`goal-${String(index).padStart(2, '0')}`);
          }
        }
        if (checkpoint.phase !== previous.phase) {
          expect(checkpoint.phase).toBe(2);
          await expect(page.getByRole('heading', { name: dict.belt, exact: true })).toBeVisible();
          liftedOff = true;
          milestone.push('liftoff', 'phase-2');
        }
        if (checkpoint.end) {
          await expect(endScreen.getByRole('heading', { name: dict.endTitle, exact: true })).toBeVisible();
          milestone.push('ending');
        }
        if (milestone.length) await capture(milestone.join('-'));
      }

      expect(checkpoint.end, `Expected an ending within ${MAX_GAME_HOURS} hours, reached goal ${checkpoint.goal}`).toBe(true);
      expect(checkpoint.goal).toBe(GOALS.length);
      expect(liftedOff).toBe(true);

      await endScreen.getByRole('button', { name: dict.prBtn.split('{0}')[0] }).click();
      await endScreen.getByRole('button', { name: dict.prSure, exact: true }).click();
      await expect(endScreen).toBeHidden();
      await assertGoal(0);
      const { ph, meta } = await page.evaluate(() => window.__drk!.state());
      expect(ph).toBe(1);
      expect(meta.runs).toBe(1);
      expect(meta.patents).toBeGreaterThan(0);
      await capture('prestige-phase-1-goal-00');
    });
  });
}
