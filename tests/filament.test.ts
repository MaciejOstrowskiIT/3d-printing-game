import { describe, expect, it } from 'vitest';
import { BAL } from '../src/content/balance';
import { gpu, rate1 } from '../src/core/formulas';
import { createGame } from '../src/core/game';
import { createState, type GameState } from '../src/core/state';
import { filamentRunway, stockedAlternative } from '../src/systems/filament';

/** A shop with printers, no breakdowns or random events, and PETG unlocked. */
const shop = (over: Partial<GameState> = {}): GameState =>
  ({ ...createState(), auto: 10, goal: 6, total: 5000, zl: 0, brkT: 1e9, mevT: 1e9, ordT: 1e9, msgT: -1e9, ...over });
const logs = (s: GameState, k: string) => s.log.filter(l => l.k === k).length;

describe('running out of filament', () => {
  it('warns once before the spool runs out', () => {
    const base = shop();
    const g = createGame({ state: shop({ fil: gpu(base) * rate1(base) * (BAL.filamentWarnSeconds + 5) }) });
    expect(filamentRunway(g.s)).toBeGreaterThan(BAL.filamentWarnSeconds);
    for (let i = 0; i < 10; i++) g.tick(1);
    expect(logs(g.s, 'lowFil')).toBe(1);
    expect(g.s.lowFil).toBe(true);
    for (let i = 0; i < 5; i++) g.tick(1);
    expect(logs(g.s, 'lowFil')).toBe(1);
  });

  it('no warning while filament auto-buy is on', () => {
    const g = createGame({ state: shop({ fil: 100, done: ['dysza', 'autobuy'], amOn: { autobuy: true } }) });
    for (let i = 0; i < 5; i++) g.tick(1);
    expect(logs(g.s, 'lowFil')).toBe(0);
  });

  it('when empty, points to a material in stock once', () => {
    const g = createGame({ state: shop({ fil: 0, materialStock: { petg: 2000 } }) });
    expect(stockedAlternative(g.s)).toBe('petg');
    for (let i = 0; i < 5; i++) g.tick(1);
    expect(logs(g.s, 'matHintM')).toBe(1);
    expect(g.s.materialId).toBe('pla');
  });

  it('switches by itself when the player asked for it', () => {
    const g = createGame({ state: shop({ fil: 0, materialStock: { petg: 2000 } }) });
    expect(g.act('automat')).toBe(true);
    g.tick(1);
    expect(g.s.materialId).toBe('petg');
    expect(g.s.fil).toBe(2000);
    expect(g.s.materialStock.pla).toBe(0);
    expect(logs(g.s, 'matAuto')).toBe(1);
  });

  it('ignores scraps of another material', () => {
    const s = shop({ fil: 0, materialStock: { petg: 1 } });
    expect(stockedAlternative(s)).toBeNull();
  });

  it('the away report says how long printers stood idle', () => {
    const g = createGame({ state: shop({ fil: 2000 }) });
    const report = g.catchUp(3600);
    expect(report?.idle).toBeGreaterThan(3000);
    const fed = createGame({ state: shop({ fil: 1e9 }) });
    expect(fed.catchUp(3600)?.idle).toBeUndefined();
  });
});
