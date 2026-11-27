import { describe, expect, it } from 'vitest';
import { BAL } from '../src/content/balance';
import { drawP, eff, opsCap, quantumDraw } from '../src/core/formulas';
import { createGame } from '../src/core/game';
import { migrate } from '../src/core/save';
import { validSave } from '../src/core/saveValidation';
import { createState, type GameState } from '../src/core/state';
import { qpRate, quantumUpgradeCost, quantumVisible } from '../src/systems/quantum';

/** A quiet game with plenty of compute and memory, no random events in the way. */
const lab = (over: Partial<GameState> = {}): GameState =>
  ({ ...createState(), mem: 200, rep: 300, ops: 1e6, brkT: 1e9, mevT: 1e9, ordT: 1e9, ...over });

/** A state that passes save validation: memory backed by reputation points, compute within the cap. */
const saveable = (over: Partial<GameState> = {}): GameState => ({ ...createState(), mem: 200, rep: 300, ops: 0, ...over });

describe('quantum computer', () => {
  it('costs more compute than early memory can hold', () => {
    expect(BAL.quantumCost).toBeGreaterThan(BAL.opsPerMemory * 10);
    const s = createState();
    expect(quantumVisible(s)).toBe(false);
    s.mem = Math.ceil((BAL.quantumCost * 0.5) / BAL.opsPerMemory);
    expect(quantumVisible(s)).toBe(true);
  });

  it('is bought once with compute and starts at level 1', () => {
    const g = createGame({ state: lab({ ops: BAL.quantumCost - 1 }), rng: () => 0.5 });
    expect(g.act('qbuy')).toBe(false);
    g.s.ops = BAL.quantumCost + 500;
    expect(g.act('qbuy')).toBe(true);
    expect(g.s).toMatchObject({ qOn: true, qLvl: 1, ops: 500 });
    g.s.ops = 1e6;
    expect(g.act('qbuy')).toBe(false);
  });

  it('makes quantum points over time, nothing before it is bought', () => {
    const g = createGame({ state: lab(), rng: () => 0.5 });
    for (let i = 0; i < 100; i++) g.tick(1);
    expect(g.s.qp).toBe(0);
    g.act('qbuy');
    for (let i = 0; i < 100; i++) g.tick(1);
    expect(g.s.qp).toBeCloseTo(100 * BAL.quantumQpPerSecond, 6);
  });

  it('upgrades with compute, raise the rate and stop at the maximum', () => {
    const g = createGame({ state: lab(), rng: () => 0.5 });
    expect(g.act('qup')).toBe(false); // not bought yet
    g.act('qbuy');
    const rate1 = qpRate(g.s);
    const cost = quantumUpgradeCost(g.s);
    expect(cost).toBe(BAL.quantumUpgradeBase);
    const ops = g.s.ops;
    expect(g.act('qup')).toBe(true);
    expect(g.s.qLvl).toBe(2);
    expect(g.s.ops).toBe(ops - cost);
    expect(qpRate(g.s)).toBeCloseTo(rate1 * 2, 9);
    expect(quantumUpgradeCost(g.s)).toBeGreaterThan(cost);
    while (g.s.qLvl < BAL.quantumMaxLevel) { g.s.ops = 1e7; expect(g.act('qup')).toBe(true); }
    g.s.ops = 1e9;
    expect(quantumUpgradeCost(g.s)).toBe(Infinity);
    expect(g.act('qup')).toBe(false);
    expect(g.s.qLvl).toBe(BAL.quantumMaxLevel);
  });

  it('needs the compute: a short purse buys nothing', () => {
    const g = createGame({ state: lab(), rng: () => 0.5 });
    g.act('qbuy');
    g.s.ops = quantumUpgradeCost(g.s) - 1;
    expect(g.act('qup')).toBe(false);
    expect(g.s.qLvl).toBe(1);
  });

  it('draws power from the shared supply, on top of the farms', () => {
    const g = createGame({ state: lab({ farmOn: true, farm: 2 }), rng: () => 0.5 });
    g.act('qbuy');
    expect(quantumDraw(g.s)).toBe(BAL.quantumDraw);
    expect(drawP(g.s)).toBe(2 * BAL.farmDraw + BAL.quantumDraw);
    expect(eff(g.s)).toBeCloseTo(40 / 50, 9); // garage supply 40, drawn 50
  });

  it('is slower than full speed when supply is short', () => {
    const s = lab({ farmOn: true, farm: 3 });
    const g = createGame({ state: s, rng: () => 0.5 });
    g.act('qbuy');
    expect(eff(s)).toBeLessThan(1);
    expect(qpRate(s)).toBeCloseTo(BAL.quantumQpPerSecond * eff(s), 9);
    s.panels = 20;
    expect(eff(s)).toBe(1);
    expect(qpRate(s)).toBeCloseTo(BAL.quantumQpPerSecond, 9);
  });

  it('keeps producing while away, within the offline cap', () => {
    const g = createGame({ state: lab(), rng: () => 0.5 });
    g.act('qbuy');
    g.catchUp(3600);
    expect(g.s.qp).toBeCloseTo(3600 * BAL.quantumQpPerSecond, 3);
    const before = g.s.qp;
    g.catchUp(100 * 3600);
    expect(g.s.qp - before).toBeCloseTo(BAL.offlineMaxSeconds * BAL.quantumQpPerSecond, 3);
  });

  it('runs in space too, at full rate', () => {
    const g = createGame({ state: lab({ ph: 2, drones: 1, fabs: 1 }), rng: () => 0.5 });
    g.act('qbuy');
    for (let i = 0; i < 50; i++) g.tick(1);
    expect(g.s.qp).toBeCloseTo(50 * BAL.quantumQpPerSecond, 6);
  });

  it('survives a save round trip', () => {
    const g = createGame({ state: saveable({ ops: 100000 }), rng: () => 0.5 });
    g.act('qbuy');
    g.act('qup');
    for (let i = 0; i < 30; i++) g.tick(1);
    const copy = migrate(JSON.parse(JSON.stringify(g.s)));
    expect(copy).toMatchObject({ qOn: true, qLvl: 2, qp: g.s.qp });
    expect(validSave(copy, createState())).toBe(true);
  });

  it('old saves without the fields load with the machine off', () => {
    const raw = JSON.parse(JSON.stringify(createState())) as Record<string, unknown>;
    delete raw.qOn; delete raw.qLvl; delete raw.qp;
    const s = migrate(raw);
    expect(s).toMatchObject({ qOn: false, qLvl: 0, qp: 0 });
    expect(validSave(s, createState())).toBe(true);
  });

  it('rejects impossible quantum state', () => {
    const base = () => saveable();
    for (const bad of [
      { qOn: true, qLvl: 0 }, { qOn: false, qLvl: 2 }, { qOn: true, qLvl: BAL.quantumMaxLevel + 1 },
      { qOn: true, qLvl: 1, qp: -1 }, { qOn: true, qLvl: 1, qp: NaN }, { qOn: false, qLvl: 0, qp: 5 }, { qOn: true, qLvl: 1.5 },
    ]) expect(validSave({ ...base(), ...bad }, createState()), JSON.stringify(bad)).toBe(false);
    expect(validSave({ ...base(), qOn: true, qLvl: 3, qp: 12 }, createState())).toBe(true);
  });

  it('opsCap with a lot of memory can hold the price', () => {
    expect(opsCap(lab())).toBeGreaterThanOrEqual(BAL.quantumCost);
  });
});
