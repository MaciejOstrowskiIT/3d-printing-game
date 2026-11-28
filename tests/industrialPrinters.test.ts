import { describe, expect, it } from 'vitest';
import { BAL } from '../src/content/balance';
import { MODEL, MODELS } from '../src/content/models';
import { FDM, PRINTER_TYPE, typeOf } from '../src/content/printerTypes';
import type { Ctx } from '../src/core/ctx';
import { drawP, eff, gpu, supply, typeCost, typeDraw, typeSpeed } from '../src/core/formulas';
import { createGame } from '../src/core/game';
import { migrate, serialize } from '../src/core/save';
import { createState, type GameState } from '../src/core/state';
import { breakdownsSystem, repair, technicianMul } from '../src/systems/breakdowns';
import { fleetFilamentPerSecond, rateOn } from '../src/systems/fleet';
import { piecesInStock } from '../src/systems/inventory';
import { printerTypesSystem, typeMissing } from '../src/systems/printerTypes';
import v7 from './fixtures/saves/v7.json';

const IND = PRINTER_TYPE.industrial;
const RESIN = PRINTER_TYPE.resin;
const ctx: Ctx = { rng: () => 0.5, offline: false, emit: () => {} };

/** A workshop past the industrial unlock with power, the garden statue design, money and PETG in stock. */
function workshop(extra: Partial<GameState> = {}) {
  const game = createGame();
  Object.assign(game.s, {
    total: IND.unlockAt, zl: 1e8, goal: 10, fil: 1e5, auto: 3, farmOn: true,
    mdls: ['fig', 'gardenStatue'], materialStock: { petg: 1e6 }, ...extra,
  } satisfies Partial<GameState>);
  return game;
}
/** The same workshop with the technician hired and `n` industrial printers. */
function staffed(n = 1) {
  const game = workshop();
  expect(game.act('tech:industrial')).toBe(true);
  for (let i = 0; i < n; i++) expect(game.act('printer:industrial')).toBe(true);
  return game;
}

describe('industrial printer type', () => {
  it('is expensive, fast, prints large models only and needs power and a technician', () => {
    expect(IND.cost).toBeGreaterThan(RESIN.cost * 10);
    expect(IND.speed).toBeGreaterThan(1);
    expect(IND.power).toBeGreaterThan(0);
    expect(IND.technician).toBeGreaterThan(0);
    expect(IND.cure).toBe(0);
    const models = MODELS.filter(m => typeOf(m) === IND);
    expect(models.map(m => m.id)).toEqual(['gardenStatue', 'giantDragon']);
    // Large only: every industrial model is wider than any FDM or resin model, which the minimum width enforces.
    const widest = (m: typeof MODELS[number]) => Math.max(...m.shape);
    const smallTypes = MODELS.filter(m => typeOf(m) !== IND);
    for (const m of models) {
      expect(widest(m)).toBeGreaterThanOrEqual(IND.minWidth);
      expect(widest(m)).toBeGreaterThan(Math.max(...smallTypes.map(widest)));
    }
    expect(IND.minWidth).toBeGreaterThan(Math.max(...MODELS.filter(m => typeOf(m) === FDM && m.design === 0).map(widest)));
  });

  it('needs a design, then power, then a technician before the first printer', () => {
    const game = workshop({ mdls: ['fig'], farmOn: false });
    const s = game.s;
    expect(typeMissing(s, IND)).toBe('design');
    expect(game.act('printer:industrial')).toBe(false);
    s.mdls = ['fig', 'gardenStatue'];
    expect(typeMissing(s, IND)).toBe('power');
    expect(game.act('printer:industrial')).toBe(false);
    s.farmOn = true;
    expect(typeMissing(s, IND)).toBe('technician');
    expect(game.act('printer:industrial')).toBe(false);
    s.total = IND.unlockAt - 1;
    expect(game.act('tech:industrial')).toBe(false); // not unlocked yet
    s.total = IND.unlockAt;
    const zl = s.zl;
    expect(game.act('tech:industrial')).toBe(true);
    expect(s.zl).toBe(zl - IND.technician);
    expect(s.techs).toEqual(['industrial']);
    expect(game.act('tech:industrial')).toBe(false); // one per type
    expect(game.act('tech:resin')).toBe(false); // resin needs none
    expect(game.act('tech:nope')).toBe(false);
    expect(typeMissing(s, IND)).toBeNull();
    const first = typeCost(s, IND);
    expect(game.act('printer:industrial')).toBe(true);
    expect(s.printers.industrial).toBe(1);
    expect(s.fleet.gardenStatue).toBe(1);
    expect(typeCost(s, IND)).toBeCloseTo(first * IND.costGrowth);
  });

  it('a hired technician makes breakdowns rarer, the one already scheduled too', () => {
    const s = workshop().s;
    expect(technicianMul(s)).toBe(1);
    s.brkT = 100;
    const game = createGame({ state: s });
    game.act('tech:industrial');
    expect(technicianMul(game.s)).toBeCloseTo(BAL.technicianBreakdown);
    expect(game.s.brkT).toBeCloseTo(100 / BAL.technicianBreakdown);
    // After a repair the next breakdown is scheduled further out than without the technician.
    const plain = workshop().s;
    for (const st of [plain, game.s]) { st.brk = 0.3; repair(st, ctx); }
    expect(game.s.brkT).toBeCloseTo(plain.brkT / BAL.technicianBreakdown);
    // And a breakdown that is due still happens: the technician makes them rarer, not impossible.
    game.s.brkT = 0;
    breakdownsSystem(game.s, 0.1, { ...ctx, rng: () => 0.2 });
    expect(game.s.brk).toBeGreaterThan(0);
  });

  it('prints large models from PETG at its own speed, next to an untouched FDM line', () => {
    const game = staffed(2);
    const s = game.s;
    expect(typeSpeed(s, IND)).toBeCloseTo(IND.speed);
    expect(rateOn(s, 'gardenStatue')).toBeCloseTo(2 * IND.speed);
    const grams = fleetFilamentPerSecond(s, IND);
    expect(grams).toBeCloseTo(2 * IND.speed * gpu(s, MODEL.gardenStatue));
    const fil = s.fil, total = s.total;
    printerTypesSystem(s, 1, ctx);
    expect(s.fil).toBe(fil); // FDM filament untouched
    expect(s.materialStock.petg).toBeCloseTo(1e6 - grams);
    // No post-processing: a finished statue goes straight to stock.
    for (let t = 1; t < MODEL.gardenStatue.seconds / (2 * IND.speed); t++) printerTypesSystem(s, 1, ctx);
    expect(piecesInStock(s, 'gardenStatue')).toBe(1);
    expect(s.total).toBeCloseTo(total + MODEL.gardenStatue.seconds);
    expect(s.curing).toEqual([]);
  });

  it('draws power with the farms and slows down when supply runs short', () => {
    const game = staffed(4);
    const s = game.s;
    expect(typeDraw(s)).toBe(4 * IND.power);
    expect(drawP(s)).toBe(4 * IND.power);
    expect(eff(s)).toBe(1); // the garage supply covers four printers
    s.farm = 3; // farms and printers now draw more than the garage gives
    expect(drawP(s)).toBe(3 * BAL.farmDraw + 4 * IND.power);
    expect(eff(s)).toBeCloseTo(supply(s) / drawP(s));
    expect(typeSpeed(s, IND)).toBeCloseTo(IND.speed * eff(s));
    expect(typeSpeed(s, RESIN)).toBeCloseTo(RESIN.speed); // resin draws no power
  });
});

describe('industrial saves', () => {
  it('saves from before printer types (v7) and from before industrial load with defaults', () => {
    const old = migrate(structuredClone(v7));
    expect(old.printers).toEqual({});
    expect(old.curing).toEqual([]);
    expect(old.techs).toEqual([]);
    const raw = JSON.parse(serialize(createState())) as Record<string, unknown>;
    delete raw.techs;
    expect(migrate(raw).techs).toEqual([]);
  });

  it('a workshop with industrial printers and a technician survives a save and load', () => {
    const game = staffed(2);
    for (let t = 0; t < 20; t++) printerTypesSystem(game.s, 1, ctx);
    const loaded = migrate(JSON.parse(serialize(game.s)));
    expect(loaded.techs).toEqual(['industrial']);
    expect(loaded.printers).toEqual({ industrial: 2 });
    expect(loaded.fleet).toEqual({ gardenStatue: 2 });
  });

  const valid = () => {
    const game = staffed(1);
    for (let t = 0; t < 5; t++) printerTypesSystem(game.s, 1, ctx);
    return JSON.parse(serialize(game.s)) as GameState;
  };
  it.each<[string, (s: GameState) => void]>([
    ['technicians not an array', s => { (s as unknown as Record<string, unknown>).techs = { industrial: true }; }],
    ['unknown technician', s => { s.techs = ['industrial', 'laser']; }],
    ['technician for a type that needs none', s => { s.techs = ['industrial', 'resin']; }],
    ['the same technician twice', s => { s.techs = ['industrial', 'industrial']; }],
    ['industrial printers without a technician', s => { s.techs = []; }],
    ['more industrial printers allocated than owned', s => { s.fleet = { gardenStatue: 2 }; }],
  ])('rejects %s', (_, corrupt) => {
    const raw = valid();
    expect(() => migrate(raw)).not.toThrow();
    corrupt(raw);
    expect(() => migrate(raw)).toThrow();
  });
});
