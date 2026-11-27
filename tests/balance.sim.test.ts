import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BAL, setPace } from '../src/content/balance';
import { GOALS } from '../src/content/goals';
import { NODE } from '../src/content/tree';
import type { GameState } from '../src/core/state';
import { playthrough } from './bot';

const LIFTOFF = GOALS.findIndex(g => g.t[1] === 'Leave Earth');

/** Pacing guard. If a change in balance.ts or in a system breaks pacing, this test catches it.
 *  Thresholds are for the bot, which plays faster than a human (a human takes roughly 2× longer).
 *  Minutes are written for pace 1 and multiplied by BAL.pace, so changing the knob keeps the test meaningful. */
describe('balance: bot finishes the game', () => {
  beforeAll(() => setPace(BAL.pace));
  afterAll(() => setPace(1));
  const P = () => BAL.pace;
  for (const seed of [1, 7, 42]) {
    it(`seed ${seed}: ends in 50–150 min × pace, liftoff in 25–75 min × pace`, () => {
      let firstPrinter = 0;
      let twentyPrinters = 0;
      const r = playthrough(seed, 6 * P(), Math.max(0.25, Math.min(1, P() / 10)), undefined, (s, t) => {
        if (!firstPrinter && s.auto >= 1) firstPrinter = t / 60;
        if (!twentyPrinters && s.auto >= 20) twentyPrinters = t / 60;
      });
      // Keep manual play short and leave room to expand before the farm unlock.
      expect(firstPrinter).toBeGreaterThan(P() * 2 / 3);
      expect(firstPrinter).toBeLessThan(P() * 1.5);
      expect(twentyPrinters).toBeGreaterThan(P() * 8);
      expect(twentyPrinters).toBeLessThan(P() * 15);
      expect(r.ended).toBe(true);
      expect(r.minutes).toBeGreaterThan(P() * 50);
      expect(r.minutes).toBeLessThan(P() * 150);
      expect(r.goalMinutes[LIFTOFF]).toBeGreaterThan(P() * 25);
      expect(r.goalMinutes[LIFTOFF]).toBeLessThan(P() * 75);
      expect(r.ordersDone).toBeGreaterThan(5);
    }, 300_000);
  }
});

/** The quantum branch is optional and strong: a bot that uses it must stay in the same range and may only be a little faster. */
describe('balance: bot that uses the quantum computer', () => {
  for (const seed of [1, 7]) {
    it(`seed ${seed}: same range, not far ahead of the plain bot, spends QP`, () => {
      const plain = playthrough(seed);
      let last: GameState | undefined;
      const r = playthrough(seed, undefined, undefined, undefined, s => { last = s; }, undefined, { quantum: true });
      expect(r.ended).toBe(true);
      expect(r.minutes).toBeGreaterThan(50);
      expect(r.minutes).toBeLessThan(150);
      expect(r.goalMinutes[LIFTOFF]).toBeGreaterThan(25);
      expect(r.goalMinutes[LIFTOFF]).toBeLessThan(75);
      expect(r.minutes).toBeGreaterThan(plain.minutes * 0.85);
      expect(r.minutes).toBeLessThanOrEqual(plain.minutes * 1.02);
      expect(last!.qOn).toBe(true);
      expect(last!.done.some(id => NODE[id]?.qp)).toBe(true);
    }, 60_000);
  }
});

/** A realistic line is a challenge: much longer than a normal one, but still finishable. */
describe('balance: realistic line', () => {
  it('the bot needs about 3x longer than on a normal line, 4 to 8 hours', () => {
    const normal = playthrough(1);
    const r = playthrough(1, 12, 0.5, undefined, undefined, { slow: BAL.realisticSlow });
    expect(r.ended).toBe(true);
    expect(r.minutes).toBeGreaterThan(240);
    expect(r.minutes).toBeLessThan(480);
    expect(r.minutes).toBeGreaterThan(normal.minutes * 2.8);
  }, 120_000);
});
