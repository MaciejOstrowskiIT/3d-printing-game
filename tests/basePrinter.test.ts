import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BAL, setPace } from '../src/content/balance';
import { clickPower, rateBase } from '../src/core/formulas';
import { createGame } from '../src/core/game';
import { createState } from '../src/core/state';
import { printProgress } from '../src/systems/fleet';

describe('garage printer', () => {
  it('prints on its own from the start, with no extra printers and no clicks', () => {
    const g = createGame();
    expect(g.s.auto).toBe(0);
    expect(rateBase(g.s)).toBeCloseTo(BAL.basePrinters * g.s.spd);
    g.tick(10);
    expect(g.s.total).toBeGreaterThan(0);
  });

  it('clicking speeds printing up on top of the automatic output', () => {
    const idle = createGame();
    const clicked = createGame();
    for (let i = 0; i < 5; i++) clicked.act('print');
    idle.tick(5); clicked.tick(5);
    expect(clicked.s.total).toBeGreaterThan(idle.s.total);
    expect(clicked.s.total - idle.s.total).toBeCloseTo(5 * clickPower(createState()));
  });

  it('extra printers add to the garage printer', () => {
    const one = { ...createState(), auto: 0 }, three = { ...createState(), auto: 2 };
    expect(rateBase(three)).toBeCloseTo(rateBase(one) * (BAL.basePrinters + 2) / BAL.basePrinters);
  });

  it('does not print without filament', () => {
    const g = createGame({ state: { ...createState(), fil: 0 } });
    g.tick(10);
    expect(g.s.total).toBe(0);
  });
});

describe('print progress bar', () => {
  // Written for the shipped pace: at pace 1 the garage printer already finishes a piece every second.
  beforeAll(() => setPace(BAL.pace));
  afterAll(() => setPace(1));

  it('shows early while one piece takes a few seconds, then hides once printing is fast', () => {
    const slow = createGame({ state: { ...createState(), fil: 1000 } });
    expect(printProgress(slow.s)).toBe(0);
    slow.act('print');
    expect(printProgress(slow.s)).toBeGreaterThan(0);
    const fast = createGame({ state: { ...createState(), auto: 50, fil: 1000 } });
    expect(printProgress(fast.s)).toBeNull();
  });

  it('is hidden in space', () => {
    expect(printProgress({ ...createState(), ph: 2 })).toBeNull();
  });
});
