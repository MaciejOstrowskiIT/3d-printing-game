import { describe, expect, it } from 'vitest';
import { BAL } from '../src/content/balance';
import { MODEL } from '../src/content/models';
import { clickPower, printSeconds, rate1 } from '../src/core/formulas';
import { createGame } from '../src/core/game';
import { nextPatentAt, patentsFor } from '../src/core/prestige';
import { migrate } from '../src/core/save';
import { createState, type GameState } from '../src/core/state';

/** A shop in space with enough figurines for a few patents. */
const inSpace = (over: Partial<GameState> = {}): GameState => ({ ...createState(), ph: 2, total: 5e8, ...over });

describe('realistic mode', () => {
  it('is chosen when starting a new line and keeps meta progress', () => {
    const g = createGame({ state: inSpace({ meta: { ...createState().meta, patents: 3, runs: 1 } }) });
    const gain = patentsFor(g.s);
    expect(g.act('prestigeR')).toBe(true);
    expect(g.s.slow).toBe(BAL.realisticSlow);
    expect(g.s.meta.patents).toBe(3 + gain);
    expect(g.s.meta.runs).toBe(2);

    const n = createGame({ state: inSpace() });
    n.act('prestige');
    expect(n.s.slow).toBe(1);
  });

  it('slows printers and clicks, not the space phase', () => {
    const normal = { ...createState(), auto: 10 };
    const real = { ...normal, slow: BAL.realisticSlow };
    expect(rate1(real)).toBeCloseTo(rate1(normal) / BAL.realisticSlow);
    expect(clickPower(real)).toBeCloseTo(clickPower(normal) / BAL.realisticSlow);
    expect(printSeconds(real, MODEL.fig)).toBe(BAL.realisticSlow);
    expect(printSeconds(normal, MODEL.bust)).toBe(MODEL.bust.seconds);
  });

  it('ten clicks print one figurine on a realistic line', () => {
    const g = createGame({ state: { ...createState(), fil: 1000, slow: BAL.realisticSlow } });
    for (let i = 0; i < 9; i++) g.act('print');
    expect(g.s.total).toBe(0);
    g.act('print');
    expect(g.s.total).toBe(1);
  });

  it('pays more patents for the same progress', () => {
    const normal = inSpace(), real = inSpace({ slow: BAL.realisticSlow });
    expect(patentsFor(real)).toBe(patentsFor(normal) * BAL.realisticPatentMult);
    expect(nextPatentAt(real)).toBe(nextPatentAt(normal));
  });

  it('allows longer offline progress', () => {
    const run = (slow: number) => {
      const g = createGame({ state: { ...createState(), auto: 1, fil: 1e9, slow, brkT: 1e9 } });
      g.catchUp(30 * 3600);
      return g.s.total;
    };
    const normal = run(1), real = run(BAL.realisticSlow);
    expect(normal).toBeCloseTo(BAL.offlineMaxSeconds, -2);
    expect(real).toBeCloseTo(BAL.realisticOfflineMax / BAL.realisticSlow, -2);
  });

  it('saves: old ones load as normal lines; other speeds are rejected', () => {
    const old = JSON.parse(JSON.stringify(createState())) as Record<string, unknown>;
    delete old.slow;
    expect(migrate(old).slow).toBe(1);
    expect(() => migrate(JSON.parse(JSON.stringify({ ...createState(), slow: 3 })))).toThrow();
    expect(migrate(JSON.parse(JSON.stringify({ ...createState(), slow: BAL.realisticSlow }))).slow).toBe(BAL.realisticSlow);
  });
});
