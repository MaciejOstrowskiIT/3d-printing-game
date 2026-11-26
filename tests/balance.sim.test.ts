import { describe, expect, it } from 'vitest';
import { GOALS } from '../src/content/goals';
import { playthrough } from './bot';

const LIFTOFF = GOALS.findIndex(g => g.t[1] === 'Leave Earth');

/** Pacing guard. If a change in balance.ts or in a system breaks pacing, this test catches it.
 *  Thresholds are for the bot, which plays faster than a human (a human takes roughly 2× longer). */
describe('balance: bot finishes the game', () => {
  for (const seed of [1, 7, 42]) {
    it(`seed ${seed}: ends in 50–150 min, liftoff in 25–75 min`, () => {
      const r = playthrough(seed);
      expect(r.ended).toBe(true);
      expect(r.minutes).toBeGreaterThan(50);
      expect(r.minutes).toBeLessThan(150);
      expect(r.goalMinutes[LIFTOFF]).toBeGreaterThan(25);
      expect(r.goalMinutes[LIFTOFF]).toBeLessThan(75);
      expect(r.ordersDone).toBeGreaterThan(5);
    }, 60_000);
  }
});
