import { describe, expect, it } from 'vitest';
import { BAL } from '../src/content/balance';
import { createGame } from '../src/core/game';
import { migrate } from '../src/core/save';
import { createState, type GameState } from '../src/core/state';
import { offlineBonusReady, validOfflineBonus } from '../src/systems/offlineBonus';

/** A running shop: printers, filament and buyers, no breakdowns or random events in the way. */
const shop = (over: Partial<GameState> = {}): GameState =>
  ({ ...createState(), auto: 10, fil: 1e7, goal: 6, dem: 3, brkT: 1e9, mevT: 1e9, ordT: 1e9, ...over });

describe('double offline earnings', () => {
  it('offers what the shop earned while away, once', () => {
    const g = createGame({ state: shop(), rng: () => 0.5 });
    const zl = g.s.zl;
    g.catchUp(3600);
    const earned = g.s.zl - zl;
    expect(earned).toBeGreaterThan(0);
    expect(offlineBonusReady(g.s)).toBe(true);
    expect(g.s.offB).toBeGreaterThan(earned * 0.95);
    expect(g.s.offB).toBeLessThan(earned * 1.05);

    const before = g.s.zl, bonus = g.s.offB;
    expect(g.act('offx2')).toBe(true);
    expect(g.s.zl).toBe(before + bonus);
    expect(g.act('offx2')).toBe(false);
    expect(offlineBonusReady(g.s)).toBe(false);
  });

  it('short absences get no offer', () => {
    const g = createGame({ state: shop() });
    g.catchUp(BAL.offlineBonusMinSeconds - 1);
    expect(offlineBonusReady(g.s)).toBe(false);
  });

  it('the offer expires after ten minutes of play, not while away', () => {
    const g = createGame({ state: shop() });
    g.catchUp(600);
    g.catchUp(600); // another absence adds up and does not run the timer down
    expect(g.s.offBT).toBe(BAL.offlineBonusClaimSeconds);
    for (let t = 0; t < BAL.offlineBonusClaimSeconds; t++) g.tick(1);
    expect(offlineBonusReady(g.s)).toBe(false);
    expect(g.s.offB).toBe(0);
  });

  it('in space it doubles figurines instead of money', () => {
    const g = createGame({ state: shop({ ph: 2, drones: 20, fabs: 5 }) });
    g.catchUp(3600);
    expect(g.s.offBi).toBeGreaterThan(0);
    {
      expect(g.s.offB).toBe(0);
      const inv = g.s.inv, bonus = g.s.offBi;
      g.act('offx2');
      expect(g.s.inv).toBe(inv + bonus);
    }
  });

  it('save validation rejects tampered bonuses', () => {
    const ok = { ...createState(), offB: 500, offBT: 300 };
    expect(validOfflineBonus(ok)).toBe(true);
    expect(validOfflineBonus({ ...ok, offB: -1 })).toBe(false);
    expect(validOfflineBonus({ ...ok, offBT: BAL.offlineBonusClaimSeconds + 1 })).toBe(false);
    expect(() => migrate(JSON.parse(JSON.stringify({ ...ok, offB: -1e9 })))).toThrow();
    expect(migrate(JSON.parse(JSON.stringify(ok))).offB).toBe(500);
  });
});
