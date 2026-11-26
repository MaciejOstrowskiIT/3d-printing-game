import { describe, expect, it } from 'vitest';
import { GOALS } from '../src/content/goals';
import { playthrough } from './bot';

const LIFTOFF = GOALS.findIndex(g => g.t[1] === 'Leave Earth');

/** Pacing guard. If a change in balance.ts or in a system breaks pacing, this test catches it.
 *  Thresholds are for the bot, which plays faster than a human (a human takes roughly 2× longer). */
describe('balance: bot finishes the game', () => {
  for (const seed of [1, 7, 42]) {
    it(`seed ${seed}: ends in 50–150 min, liftoff in 25–75 min`, () => {
      let firstPrinter = 0;
      let twentyPrinters = 0;
      const r = playthrough(seed, undefined, undefined, undefined, (s, t) => {
        if (!firstPrinter && s.auto >= 1) firstPrinter = t / 60;
        if (!twentyPrinters && s.auto >= 20) twentyPrinters = t / 60;
      });
      // Keep manual play short and leave room to expand before the farm unlock.
      expect(firstPrinter).toBeGreaterThan(2 / 3);
      expect(firstPrinter).toBeLessThan(1.5);
      expect(twentyPrinters).toBeGreaterThan(8);
      expect(twentyPrinters).toBeLessThan(15);
      expect(r.ended).toBe(true);
      expect(r.minutes).toBeGreaterThan(50);
      expect(r.minutes).toBeLessThan(150);
      expect(r.goalMinutes[LIFTOFF]).toBeGreaterThan(25);
      expect(r.goalMinutes[LIFTOFF]).toBeLessThan(75);
      expect(r.ordersDone).toBeGreaterThan(5);
    }, 60_000);
  }
});
