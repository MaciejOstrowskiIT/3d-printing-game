import { describe, expect, it } from 'vitest';
import { MATERIAL } from '../src/content/materials';
import { createGame } from '../src/core/game';
import { demand, spoolPrice } from '../src/core/formulas';
import { exportSave, importSave, migrate } from '../src/core/save';
import { materialStock } from '../src/systems/materials';

describe('print materials', () => {
  it('keeps historical filament as PLA and unlocks materials with progress', () => {
    const game = createGame({ state: migrate({ fil: 321, total: 149 }) });
    expect(game.s.materialId).toBe('pla');
    expect(game.act('material:petg')).toBe(false);
    game.s.total = 150;
    expect(game.act('material:petg')).toBe(true);
    expect(game.s.fil).toBe(0);
    expect(materialStock(game.s, 'pla')).toBe(321);
  });

  it('charges the material price and keeps stock separate through a save round trip', () => {
    const game = createGame();
    Object.assign(game.s, { zl: 1000, total: 150, fil: 350 });
    const pla = spoolPrice(game.s);
    game.act('material:petg');
    expect(spoolPrice(game.s)).toBeCloseTo(pla * 1.2);
    expect(game.act('spool')).toBe(true);
    expect(game.s.zl).toBeCloseTo(1000 - pla * 1.2);
    expect(game.act('print')).toBe(true);
    const remaining = game.s.fil;
    expect(remaining).toBeLessThan(1000);
    const save = importSave(exportSave(game.s))!;
    const resumed = createGame({ state: save });
    resumed.act('material:pla');
    expect(resumed.s.fil).toBe(350);
    resumed.act('material:petg');
    expect(resumed.s.fil).toBe(remaining);
  });

  it('buys an unlocked material directly without changing the active spool', () => {
    const game = createGame();
    Object.assign(game.s, { zl: 1000, total: 150, fil: 350, spoolG: 5000, warn: true });
    const price = spoolPrice(game.s, MATERIAL.petg);
    expect(game.act('spool:resin')).toBe(false);
    expect(game.act('spool:unknown')).toBe(false);
    expect(game.s.zl).toBe(1000);

    expect(game.act('spool:petg')).toBe(true);
    expect(game.s.zl).toBeCloseTo(1000 - price);
    expect(game.s.materialId).toBe('pla');
    expect(game.s.fil).toBe(350);
    expect(game.s.warn).toBe(true);
    expect(game.s.finance[0].cash.filament).toBe(price);
    const resumed = createGame({ state: importSave(exportSave(game.s))! });
    expect(materialStock(resumed.s, 'petg')).toBe(5000);
    expect(resumed.act('material:petg')).toBe(true);
    expect(resumed.s.fil).toBe(5000);
  });

  it('bonuses apply only to matching models', () => {
    const game = createGame();
    game.s.total = 1500;
    const figurineDemand = demand(game.s);
    game.act('material:resin');
    expect(demand(game.s)).toBe(figurineDemand);
    game.s.mdl = 'bust';
    const resinDemand = demand(game.s);
    game.act('material:pla');
    expect(resinDemand).toBeGreaterThan(demand(game.s));
  });

  it('keeps a pending PLA clearance from delivering another material after a switch', () => {
    const game = createGame();
    Object.assign(game.s, { total: 150, zl: 1000, mev: { id: 'clearance', offer: 10, cost: 150 } });
    game.act('material:petg');
    expect(game.act('mevyes')).toBe(true);
    expect(game.s.fil).toBe(0);
    expect(materialStock(game.s, 'pla')).toBe(6000);
  });

  it('rejects invalid material ids and negative reserves', () => {
    const game = createGame();
    expect(importSave(exportSave({ ...game.s, materialId: 'unknown' }))).toBeNull();
    expect(importSave(exportSave({ ...game.s, total: 150, materialStock: { petg: -1 } }))).toBeNull();
  });
});
