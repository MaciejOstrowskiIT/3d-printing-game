import { describe, expect, it } from 'vitest';
import { BAL } from '../src/content/balance';
import { clickPower, rateBase } from '../src/core/formulas';
import { createGame } from '../src/core/game';
import { createState } from '../src/core/state';

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
