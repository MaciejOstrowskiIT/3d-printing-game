import { describe, expect, it } from 'vitest';
import { MATERIAL } from '../src/content/materials';
import { MODEL, MODELS } from '../src/content/models';
import { EXTRA_PRINTER_TYPES, FDM, PRINTER_TYPE, PRINTER_TYPES, typeOf } from '../src/content/printerTypes';
import type { Ctx } from '../src/core/ctx';
import { demand, gpu, modelDemand, typeCost, typeSpeed, unitCost } from '../src/core/formulas';
import { createGame } from '../src/core/game';
import { migrate, serialize } from '../src/core/save';
import { createState, type GameState } from '../src/core/state';
import { fleetFilamentPerSecond, idlePrinters, rateOn, splitUnlocked } from '../src/systems/fleet';
import { piecesInStock, stockPrice } from '../src/systems/inventory';
import { bestModel, selectModel } from '../src/systems/models';
import { printerTypesSystem } from '../src/systems/printerTypes';
import { productionSystem } from '../src/systems/production';

const RESIN = PRINTER_TYPE.resin;
const ctx: Ctx = { rng: () => 0.5, offline: false, emit: () => {} };

/** A workshop past the resin unlock with the miniature design, money and both feedstocks. */
function workshop() {
  const game = createGame();
  Object.assign(game.s, {
    total: RESIN.unlockAt, zl: 1e6, goal: 5, fil: 1e5, auto: 3,
    mdls: ['fig', 'miniature'], materialStock: { resin: 1e5 },
  } satisfies Partial<GameState>);
  return game;
}

/** Every entry in content/printerTypes.ts must pass these, so adding a type is safe without touching code. */
describe('printer type registry', () => {
  it('starts with FDM and has unique ids', () => {
    expect(PRINTER_TYPES[0]).toBe(FDM);
    expect(FDM.id).toBe('fdm');
    expect(new Set(PRINTER_TYPES.map(t => t.id)).size).toBe(PRINTER_TYPES.length);
  });

  it.each(EXTRA_PRINTER_TYPES.map(t => [t.id, t] as const))('%s has sane numbers, texts, feedstock and models', (_, type) => {
    for (const v of [type.detail, type.speed, type.cost, type.buildWidth]) expect(v).toBeGreaterThan(0);
    expect(type.costGrowth).toBeGreaterThanOrEqual(1);
    expect(type.cure).toBeGreaterThanOrEqual(0);
    expect(type.buildWidth).toBeLessThanOrEqual(188);
    expect(type.minWidth).toBeGreaterThanOrEqual(0);
    expect(type.minWidth).toBeLessThan(type.buildWidth);
    for (const v of [type.power, type.technician]) { expect(Number.isFinite(v)).toBe(true); expect(v).toBeGreaterThanOrEqual(0); }
    for (const pair of [type.name, type.tag, type.desc, type.plate]) { expect(pair).toHaveLength(2); pair.forEach(x => expect(x.trim()).not.toBe('')); }
    const feed = MATERIAL[type.material];
    expect(feed, 'feedstock must be a material').toBeDefined();
    expect(type.unlockAt).toBeGreaterThanOrEqual(feed.unlockAt);
    const models = MODELS.filter(m => m.printerType === type.id);
    expect(models.length).toBeGreaterThan(0);
    for (const m of models) expect(m.unlockAt).toBeGreaterThanOrEqual(type.unlockAt);
  });

  it('every model names a known type and its shape fits that build volume', () => {
    for (const m of MODELS) {
      if (m.printerType !== undefined) expect(PRINTER_TYPE[m.printerType], m.id).toBeDefined();
      expect(Math.max(...m.shape), m.id).toBeLessThanOrEqual(typeOf(m).buildWidth);
      expect(Math.max(...m.shape), m.id).toBeGreaterThanOrEqual(typeOf(m).minWidth);
    }
    // Something has to make the free default model and the starting printers.
    expect(MODELS.filter(m => m.design === 0).every(m => typeOf(m) === FDM)).toBe(true);
  });

  it('resin is small, slow, detailed and needs post-processing', () => {
    expect(RESIN.buildWidth).toBeLessThan(Math.max(...MODELS.filter(m => typeOf(m) === FDM).flatMap(m => m.shape)));
    expect(RESIN.speed).toBeLessThan(1);
    expect(RESIN.detail).toBeGreaterThan(1.5);
    expect(RESIN.cure).toBeGreaterThan(0);
    expect(RESIN.material).toBe('resin');
  });
});

describe('resin printers', () => {
  it('need the unlock and a resin design; the price grows with each printer', () => {
    const game = workshop();
    game.s.mdls = ['fig'];
    expect(game.act('printer:resin')).toBe(false); // no resin design
    game.s.mdls = ['fig', 'miniature'];
    game.s.total = RESIN.unlockAt - 1;
    expect(game.act('printer:resin')).toBe(false); // not unlocked yet
    game.s.total = RESIN.unlockAt;
    expect(game.act('printer:fdm')).toBe(false);
    expect(game.act('printer:nope')).toBe(false);
    const first = typeCost(game.s, RESIN);
    expect(game.act('printer:resin')).toBe(true);
    expect(game.s.zl).toBeCloseTo(1e6 - first);
    expect(game.s.printers.resin).toBe(1);
    expect(game.s.fleet.miniature).toBe(1); // a new printer starts on a resin model
    expect(typeCost(game.s, RESIN)).toBeCloseTo(first * RESIN.costGrowth);
    game.s.zl = 0;
    expect(game.act('printer:resin')).toBe(false);
  });

  it('print resin models from resin at their own speed, next to an untouched FDM line', () => {
    const game = workshop();
    game.act('printer:resin');
    game.act('printer:resin');
    const s = game.s;
    expect(rateOn(s, 'miniature')).toBeCloseTo(2 * typeSpeed(s, RESIN));
    expect(typeSpeed(s, RESIN)).toBeCloseTo(RESIN.speed); // a fresh workshop prints at base speed
    // FDM filament use ignores the resin printers.
    const fdmGrams = fleetFilamentPerSecond(s);
    const resinGrams = fleetFilamentPerSecond(s, RESIN);
    expect(resinGrams).toBeCloseTo(rateOn(s, 'miniature') * gpu(s, MODEL.miniature));
    productionSystem(s, 1, ctx);
    printerTypesSystem(s, 1, ctx);
    expect(s.fil).toBeCloseTo(1e5 - fdmGrams);
    expect(s.materialStock.resin).toBeCloseTo(1e5 - resinGrams);
  });

  it('finished pieces count at once but reach stock only after the wash and cure', () => {
    const game = workshop();
    const s = game.s;
    s.auto = 0; // keep the FDM line out of the totals
    game.act('printer:resin');
    game.act('printer:resin');
    const seconds = MODEL.miniature.seconds / (2 * RESIN.speed);
    for (let t = 0; t < seconds; t += 0.5) printerTypesSystem(s, 0.5, ctx);
    expect(s.total).toBeCloseTo(RESIN.unlockAt + MODEL.miniature.seconds);
    expect(s.modelStock.miniature.printed).toBe(1);
    expect(piecesInStock(s, 'miniature')).toBe(0);
    expect(s.curing).toHaveLength(1);
    s.materialStock.resin = 0; // nothing new gets printed meanwhile
    for (let t = 0; t < RESIN.cure - 1; t++) printerTypesSystem(s, 1, ctx);
    expect(piecesInStock(s, 'miniature')).toBe(0);
    printerTypesSystem(s, 1, ctx);
    expect(piecesInStock(s, 'miniature')).toBe(1);
    expect(s.inv).toBeCloseTo(MODEL.miniature.seconds);
    expect(s.curing).toEqual([]);
  });

  it('cured pieces fill an accepted order', () => {
    const game = workshop();
    const s = game.s;
    s.auto = 0;
    game.act('printer:resin');
    s.ord = { n: 6, got: 0, time: 1000, left: 1000, offer: 0, acc: true, c: 0, pay: 1 };
    for (let t = 0; t < 12; t++) printerTypesSystem(s, 1, ctx);
    expect(s.ord?.got).toBe(0);
    for (let t = 0; t < RESIN.cure; t++) printerTypesSystem(s, 1, ctx);
    expect(s.ord).toBeNull(); // completed
  });

  it('stop without resin while the FDM line keeps printing', () => {
    const game = workshop();
    const s = game.s;
    game.act('printer:resin');
    s.materialStock = {};
    const total = s.total;
    printerTypesSystem(s, 10, ctx);
    expect(s.total).toBe(total);
    productionSystem(s, 1, ctx);
    expect(s.total).toBeGreaterThan(total);
  });

  it('sell for the detail multiplier, on their own market and resin cost', () => {
    const s = workshop().s;
    const m = MODEL.miniature;
    expect(stockPrice(s, 'miniature')).toBeCloseTo(s.price * m.value * RESIN.detail);
    expect(modelDemand(m)).toBeCloseTo((m.value * RESIN.detail) ** 1.6 * m.market * m.seconds);
    expect(demand(s, m)).toBeGreaterThan(0);
    // Resin cost per piece follows the resin price, whatever filament the FDM line uses.
    const before = unitCost(s, m);
    s.materialId = 'petg';
    expect(unitCost(s, m)).toBeCloseTo(before);
  });
});

describe('resin allocation (the production line pools)', () => {
  it('splits the resin pool between resin models, independent of the FDM split', () => {
    const game = workshop();
    const s = game.s;
    s.auto = 0;
    s.mdls = ['fig', 'miniature', 'pendant'];
    s.total = MODEL.pendant.unlockAt;
    expect(splitUnlocked(s)).toBe(false); // one FDM design, no FDM printers to split
    game.act('printer:resin');
    game.act('printer:resin');
    game.act('printer:resin');
    expect(s.fleet).toEqual({ miniature: 3 });
    expect(game.act('fleet:pendant:1')).toBe(false); // no idle resin printer
    expect(game.act('fleet:miniature:1')).toBe(true);
    expect(idlePrinters(s, RESIN)).toBe(2);
    expect(game.act('fleet:pendant:2')).toBe(true);
    expect(game.act('fleet:pendant:3')).toBe(false);
    expect(rateOn(s, 'pendant')).toBeCloseTo(2 * typeSpeed(s, RESIN));
    expect(game.act('fleet:miniature:0')).toBe(true);
    expect(s.fleet).toEqual({ pendant: 2 });
    expect(rateOn(s, 'miniature')).toBe(0);
  });

  it('resin models never become the FDM main model', () => {
    const s = workshop().s;
    expect(selectModel(s, ctx, 'miniature')).toBe(false);
    expect(bestModel(s)).toBe('fig');
    expect(s.mdl).toBe('fig');
  });
});

describe('resin saves', () => {
  it('old saves load with no printers and an empty queue', () => {
    const raw = JSON.parse(serialize(createState())) as Record<string, unknown>;
    delete raw.printers;
    delete raw.curing;
    const s = migrate(raw);
    expect(s.printers).toEqual({});
    expect(s.curing).toEqual([]);
  });

  it('a workshop with resin printers and pieces in the wash survives a save and load', () => {
    const game = workshop();
    game.act('printer:resin');
    for (let t = 0; t < 20; t++) printerTypesSystem(game.s, 1, ctx);
    expect(game.s.curing.length).toBeGreaterThan(0);
    const loaded = migrate(JSON.parse(serialize(game.s)));
    expect(loaded.printers).toEqual({ resin: 1 });
    expect(loaded.fleet).toEqual({ miniature: 1 });
    expect(loaded.curing).toEqual(game.s.curing);
  });

  const valid = () => {
    const game = workshop();
    game.act('printer:resin');
    for (let t = 0; t < 20; t++) printerTypesSystem(game.s, 1, ctx);
    return JSON.parse(serialize(game.s)) as GameState;
  };
  it.each<[string, (s: GameState) => void]>([
    ['unknown printer type', s => { s.printers = { laser: 1 }; }],
    ['FDM in the printer pools', s => { s.printers = { fdm: 1, resin: 1 }; }],
    ['negative printers', s => { s.printers = { resin: -1 }; }],
    ['pools not an object', s => { (s as unknown as Record<string, unknown>).printers = [1]; }],
    ['more resin printers allocated than owned', s => { s.fleet = { miniature: 2 }; }],
    ['resin model as the FDM main', s => { s.mdl = 'miniature'; s.fleet = {}; }],
    ['queue not an array', s => { (s as unknown as Record<string, unknown>).curing = {}; }],
    ['FDM model in the wash', s => { s.curing = [{ id: 'fig', w: 1, t: 1, p: 0, c: null }]; }],
    ['unowned model in the wash', s => { s.curing = [{ id: 'pendant', w: 10, t: 1, p: 0, c: null }]; }],
    ['wash longer than the cure', s => { s.curing = [{ id: 'miniature', w: 6, t: RESIN.cure + 5, p: 0, c: null }]; }],
    ['empty batch', s => { s.curing = [{ id: 'miniature', w: 0, t: 1, p: 0, c: null }]; }],
    ['bad premium', s => { s.curing = [{ id: 'miniature', w: 6, t: 1, p: 5, c: null }]; }],
    ['bad cost', s => { s.curing = [{ id: 'miniature', w: 6, t: 1, p: 0, c: -1 }]; }],
  ])('rejects %s', (_, corrupt) => {
    const raw = valid();
    expect(() => migrate(raw)).not.toThrow();
    corrupt(raw);
    expect(() => migrate(raw)).toThrow();
  });
});
