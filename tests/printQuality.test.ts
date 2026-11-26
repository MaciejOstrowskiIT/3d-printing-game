import { describe, expect, it } from 'vitest';
import { BAL } from '../src/content/balance';
import { createGame } from '../src/core/game';
import { exportSave, importSave } from '../src/core/save';
import { clickPower, rate1 } from '../src/core/formulas';
import { make } from '../src/systems/production';
import { salesSystem } from '../src/systems/sales';

const ctx = { rng: () => 0.5, offline: false, emit: () => {} };
const workshop = () => {
  const game = createGame();
  Object.assign(game.s, { goal: BAL.qualityUnlockGoal, auto: 3, zl: 1000 });
  return game;
};

describe('print problems and quality', () => {
  it('reveals the quality controls only after the required progress', () => {
    const game = createGame();
    expect(game.act('precision')).toBe(false);
    expect(game.act('calibrate')).toBe(false);
  });

  it('slows manual and automatic printing in precision mode', () => {
    const game = workshop();
    const speed = rate1(game.s), click = clickPower(game.s);
    expect(game.act('precision')).toBe(true);
    expect(rate1(game.s)).toBeCloseTo(speed * BAL.precisionSpeed);
    expect(clickPower(game.s)).toBeCloseTo(click * BAL.precisionSpeed);
  });

  it('pays the quality premium only on stock printed in that mode, even after toggling it off', () => {
    const game = workshop();
    make(game.s, ctx, 10);
    game.act('precision');
    make(game.s, ctx, 10);
    game.act('precision');
    expect(game.s.stockPremium).toBeCloseTo(BAL.precisionPremium / 2);
    const save = importSave(exportSave(game.s))!;
    expect(save.stockPremium).toBeCloseTo(BAL.precisionPremium / 2);
    salesSystem(save, 100);
    expect(save.zl).toBeCloseTo(1000 + 20 * save.price * (1 + BAL.precisionPremium / 2));
    expect(save.stockPremium).toBe(0);
  });

  it.each([
    ['calibrate', 0.2, 1, BAL.bedCalibrationCost],
    ['calibrate', 0.8, 5, BAL.bedCalibrationCost],
    ['dryer', 0.95, 6, BAL.filamentDryerCost],
  ] as const)('%s prevents the matching print problem', (action, rng, cause, cost) => {
    const game = createGame({ rng: () => rng, state: { ...workshop().s, brkT: 0 } });
    const control = createGame({ rng: () => rng, state: { ...game.s } });
    control.tick(0.1);
    expect(control.s.brkC).toBe(cause);
    expect(control.s.brk).toBeGreaterThan(0);
    expect(game.act(action)).toBe(true);
    expect(game.act(action)).toBe(false);
    expect(game.s.zl).toBe(1000 - cost);
    game.tick(0.1);
    expect(game.s.brk).toBe(0);
    expect(game.s.brkT).toBeGreaterThan(0);
  });
});
