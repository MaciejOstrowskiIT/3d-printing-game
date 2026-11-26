import { describe, expect, it } from 'vitest';
import { BAL } from '../src/content/balance';
import { DEFAULT_MODEL, MODEL, MODELS } from '../src/content/models';
import type { Ctx, GameEvent } from '../src/core/ctx';
import { clickPower, demand, gpu, modelDemand } from '../src/core/formulas';
import { createGame } from '../src/core/game';
import { migrate } from '../src/core/save';
import { createState, type GameState } from '../src/core/state';
import { buyDesign, printManual, selectModel, validModelState } from '../src/systems/models';

const ctx = () => { const events: GameEvent[] = []; const c: Ctx = { rng: () => 0.5, offline: false, emit: e => events.push(e) }; return { c, events }; };
const rich = (): GameState => ({ ...createState(), total: 1e7, zl: 1e7, fil: 1e6, goal: 5 });

/** Every entry in content/models.ts must pass these, so adding a model is safe without touching code. */
describe('model registry', () => {
  it('has unique ids and a free default model first', () => {
    expect(new Set(MODELS.map(m => m.id)).size).toBe(MODELS.length);
    expect(DEFAULT_MODEL).toBe(MODELS[0]);
    expect(DEFAULT_MODEL.design).toBe(0);
    expect(DEFAULT_MODEL.unlockAt).toBe(0);
    expect(createState().mdl).toBe(DEFAULT_MODEL.id);
  });

  it.each(MODELS.map(m => [m.id, m] as const))('%s has sane numbers, texts and shape', (_, m) => {
    for (const v of [m.seconds, m.value, m.market, m.material]) expect(v).toBeGreaterThan(0);
    expect(m.seconds).toBeLessThanOrEqual(3600);
    expect(m.design).toBeGreaterThanOrEqual(0);
    expect(m.unlockAt).toBeGreaterThanOrEqual(0);
    for (const pair of [m.name, m.desc]) { expect(pair).toHaveLength(2); pair.forEach(x => expect(x.trim()).not.toBe('')); }
    // The printer close-up has room for 15 layers on a 188 px build plate.
    expect(m.shape.length).toBeGreaterThanOrEqual(2);
    expect(m.shape.length).toBeLessThanOrEqual(15);
    m.shape.forEach(w => { expect(w).toBeGreaterThanOrEqual(10); expect(w).toBeLessThanOrEqual(188); });
    expect(modelDemand(m)).toBeGreaterThan(0);
  });

  it('designs unlock in list order (the Models card teases the next one)', () => {
    for (let i = 1; i < MODELS.length; i++) expect(MODELS[i].unlockAt).toBeGreaterThanOrEqual(MODELS[i - 1].unlockAt);
  });
});

describe('models', () => {
  it('designs are bought once they show up', () => {
    const s = { ...createState(), zl: 1e6 };
    const bust = MODEL.bust;
    expect(buyDesign(s, ctx().c, 'bust')).toBe(false); // not visible yet
    s.total = bust.unlockAt;
    expect(buyDesign(s, ctx().c, 'bust')).toBe(true);
    expect(s.zl).toBe(1e6 - bust.design);
    expect(buyDesign(s, ctx().c, 'bust')).toBe(false); // already owned
    expect(buyDesign(s, ctx().c, 'nope')).toBe(false);
  });

  it('switching models rescales the price and changes demand and filament use', () => {
    const s = rich();
    expect(selectModel(s, ctx().c, 'bust')).toBe(false); // not owned
    buyDesign(s, ctx().c, 'bust');
    const price = s.price, dem = demand(s), g = gpu(s);
    expect(selectModel(s, ctx().c, 'bust')).toBe(true);
    const b = MODEL.bust;
    expect(s.price).toBeCloseTo(price * b.value, 2);
    expect(gpu(s)).toBeCloseTo(g * b.material);
    // Same demand formula, new price: the model factor and the price elasticity together.
    const expected = dem * modelDemand(b) * (price / s.price) ** BAL.demandElasticity;
    expect(demand(s)).toBeCloseTo(expected, 3);
  });

  it('a click is one figurine of work; on a bigger model it advances the piece', () => {
    const s = { ...createState(), fil: 1000 };
    const { c, events } = ctx();
    printManual(s, c);
    expect(s.total).toBe(1);
    expect(s.fil).toBe(1000 - s.g);
    s.mdls = ['fig', 'bust']; s.mdl = 'bust';
    printManual(s, c);
    expect(s.total).toBe(1);
    expect(s.mp).toBeCloseTo(1);
    expect(events.filter(e => e.type === 'printed').map(e => (e as { share: number }).share)).toEqual([1, 0.2]);
  });

  it('click tools add work per click; fractions carry over', () => {
    const g = createGame({ state: { ...createState(), zl: 1e4, fil: 1e4, goal: 1 } });
    expect(g.act('tool')).toBe(true);
    expect(g.act('tool')).toBe(true);
    expect(g.s.clk).toBe(2);
    expect(clickPower(g.s)).toBeCloseTo(1.5);
    g.act('print'); g.act('print');
    expect(g.s.total).toBe(3);
  });

  it('actions go through the game', () => {
    const g = createGame({ state: rich() });
    expect(g.act('stl:keychain')).toBe(true);
    expect(g.act('mdl:keychain')).toBe(true);
    expect(g.s.mdl).toBe('keychain');
    expect(g.act('mdl:keychain')).toBe(false);
  });

  it('validates model fields from saves', () => {
    const s = rich();
    expect(validModelState(s)).toBe(true);
    expect(validModelState({ ...s, mdl: 'nope' })).toBe(false);
    expect(validModelState({ ...s, mdl: 'helmet' })).toBe(false); // not owned
    expect(validModelState({ ...s, mdls: [] , mdl: 'fig' })).toBe(false);
    expect(validModelState({ ...s, mdls: ['fig', 'fig'] })).toBe(false);
    expect(validModelState({ ...s, clk: BAL.clickMaxLevel + 1 })).toBe(false);
    expect(validModelState({ ...s, mp: -1 })).toBe(false);
  });

  it('old saves load with the figurine selected', () => {
    const old = JSON.parse(JSON.stringify(createState())) as Record<string, unknown>;
    delete old.mdl; delete old.mdls; delete old.clk; delete old.mp;
    const s = migrate(old);
    expect(s.mdl).toBe('fig');
    expect(s.mdls).toEqual(['fig']);
    expect(validModelState(s)).toBe(true);
  });
});
