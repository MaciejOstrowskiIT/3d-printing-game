import { describe, expect, it } from 'vitest';
import { seededRng } from '../src/core/ctx';
import { demand, rate1 } from '../src/core/formulas';
import { createGame } from '../src/core/game';
import { canPrestige, patentsFor } from '../src/core/prestige';
import { createState } from '../src/core/state';
import { playthrough } from './bot';

const newGame = () => createGame({ rng: seededRng(5) });

describe('prestige', () => {
  it('pays out few patents at liftoff and many more at the end', () => {
    const s = createState();
    s.total = 4e6;
    const atLiftoff = patentsFor(s);
    s.total = 2e12;
    const atEnd = patentsFor(s);
    expect(atLiftoff).toBeGreaterThanOrEqual(2);
    expect(atLiftoff).toBeLessThanOrEqual(8);
    expect(atEnd).toBeGreaterThan(25);
    expect(atEnd).toBeLessThan(60);
  });

  it('is only possible after liftoff', () => {
    const g = newGame();
    g.s.total = 1e9;
    expect(canPrestige(g.s)).toBe(false);
    expect(g.act('prestige')).toBe(false);
    g.s.ph = 2;
    expect(canPrestige(g.s)).toBe(true);
  });

  it('starts a fresh line but keeps patents, achievements and colours', () => {
    const g = newGame();
    Object.assign(g.s, { ph: 2, total: 1e9, auto: 80, zl: 5e5, col: 3, colorsUsed: 15 });
    g.s.ach.push('first', 'liftoff');
    const gain = patentsFor(g.s);
    expect(g.act('prestige')).toBe(true);
    expect(g.s.ph).toBe(1);
    expect(g.s.total).toBe(0);
    expect(g.s.auto).toBe(0);
    expect(g.s.meta.patents).toBe(gain);
    expect(g.s.meta.runs).toBe(1);
    expect(g.s.ach).toEqual(['first', 'liftoff']);
    expect(g.s.col).toBe(3);
  });

  it('patents take effect immediately', () => {
    const g = newGame();
    g.s.auto = 10; g.s.brkT = 1e9; g.s.meta.patents = 10;
    const rate = rate1(g.s), dem = demand(g.s), zl = g.s.zl, fil = g.s.g;
    expect(g.act('pat:speed')).toBe(true);
    expect(g.act('pat:brand')).toBe(true);
    expect(g.act('pat:start')).toBe(true);
    expect(g.act('pat:nozzle')).toBe(true);
    expect(rate1(g.s)).toBeCloseTo(rate * 1.15);
    expect(demand(g.s)).toBeCloseTo(dem * 1.15);
    expect(g.s.zl).toBe(zl + 500);
    expect(g.s.g).toBeCloseTo(fil * 0.94);
    expect(g.s.meta.patents).toBe(10 - 1 - 1 - 1 - 2);
  });

  it('kept automation is unlocked at the start of a new line', () => {
    const g = newGame();
    Object.assign(g.s, { ph: 2, total: 1e9 });
    g.s.meta.pat.keep = 2;
    g.act('prestige');
    expect(g.s.done).toEqual(expect.arrayContaining(['kamera', 'autobuy', 'autocena', 'automkt']));
    expect(g.s.amOn.autobuy).toBe(true);
  });

  it('a second line with a typical set of patents is clearly faster', () => {
    const first = playthrough(1);
    // About what the first finished line pays (~35 patents).
    const second = playthrough(1, 6, 0.25, { pat: { start: 2, speed: 3, brand: 3, compute: 2, keep: 1, investor: 2 } });
    expect(second.ended).toBe(true);
    expect(second.minutes).toBeLessThan(first.minutes * 0.85);
  }, 60_000);
});
