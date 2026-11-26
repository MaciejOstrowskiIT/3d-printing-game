import { describe, expect, it } from 'vitest';
import { GOALS } from '../src/content/goals';
import { playthrough } from './bot';

const LIFTOFF = GOALS.findIndex(g => g.t[0] === 'Wyjdź poza Ziemię');

/** Strażnik tempa gry. Jeśli zmiana w balance.ts albo w systemach rozjedzie tempo, ten test to pokaże.
 *  Progi są dla bota, który gra sprawniej niż człowiek (człowiek: ok. 2× dłużej). */
describe('balans: bot przechodzi grę', () => {
  for (const seed of [1, 7, 42]) {
    it(`seed ${seed}: koniec w 50–150 min, lot w kosmos w 25–75 min`, () => {
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
