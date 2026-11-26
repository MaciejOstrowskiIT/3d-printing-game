import { describe, expect, it } from 'vitest';
import { BAL } from '../src/content/balance';
import { MODEL } from '../src/content/models';
import { createGame } from '../src/core/game';
import { gpu } from '../src/core/formulas';
import { exportSave, importSave, migrate } from '../src/core/save';
import { fleetFilamentPerSecond, printersOn } from '../src/systems/fleet';
import { piecesInStock } from '../src/systems/inventory';
import { productionSystem } from '../src/systems/production';

const ctx = { rng: () => 0.5, offline: false, emit: () => {} };
function workshop() {
  const game = createGame();
  Object.assign(game.s, { auto: 4, mdls: ['fig', 'keychain'], fil: 1000 });
  return game;
}

describe('split automatic printers', () => {
  it('produces each model separately and consumes the right filament', () => {
    const game = workshop();
    expect(game.act('fleet:keychain:2')).toBe(true);
    const grams = 2 * gpu(game.s) + 2 * gpu(game.s, MODEL.keychain);
    expect(fleetFilamentPerSecond(game.s)).toBeCloseTo(grams);
    productionSystem(game.s, 1, ctx);
    expect(piecesInStock(game.s, 'fig')).toBe(2);
    expect(piecesInStock(game.s, 'keychain')).toBe(4);
    expect(game.s.fil).toBeCloseTo(1000 - grams);
    expect(game.s.total).toBe(4);
  });

  it('keeps farms and manual printing on the main model', () => {
    const game = workshop();
    game.s.farm = 1;
    game.s.panels = 20;
    game.s.fil = 10000;
    game.act('fleet:keychain:2');
    productionSystem(game.s, 1, ctx);
    expect(piecesInStock(game.s, 'fig')).toBe(2 + BAL.farmPrinters);
    expect(piecesInStock(game.s, 'keychain')).toBe(4);
    game.act('print');
    expect(piecesInStock(game.s, 'fig')).toBe(3 + BAL.farmPrinters);
    expect(piecesInStock(game.s, 'keychain')).toBe(4);
  });

  it('keeps every allocation when swapping the main model and reloading', () => {
    const game = workshop();
    expect(game.act('fleet:keychain:1')).toBe(true);
    expect(game.act('fleet:keychain:5')).toBe(false);
    expect(game.act('fleet:unknown:1')).toBe(false);
    expect(game.act('fleet:fig:1')).toBe(false);
    game.act('mdl:keychain');
    expect(printersOn(game.s, 'keychain')).toBe(1);
    expect(printersOn(game.s, 'fig')).toBe(3);
    const saved = importSave(exportSave(game.s))!;
    expect(saved.mdl).toBe('keychain');
    expect(saved.fleet).toEqual({ fig: 3 });
    expect(importSave(exportSave({ ...saved, fleet: { fig: 5 } }))).toBeNull();
    expect(importSave(exportSave({ ...saved, fleet: { keychain: 1 } }))).toBeNull();
  });

  it('allocates printers across more than two models', () => {
    const game = workshop();
    game.s.mdls.push('bust');
    game.s.fil = 1e6;
    expect(game.act('fleet:keychain:1')).toBe(true);
    expect(game.act('fleet:bust:2')).toBe(true);
    expect(game.act('fleet:bust:4')).toBe(false);
    expect(printersOn(game.s, 'fig')).toBe(1);
    productionSystem(game.s, 10, ctx);
    expect(game.s.modelStock.fig.printed).toBe(10);
    expect(game.s.modelStock.keychain.printed).toBe(20);
    expect(game.s.modelStock.bust.printed).toBe(4);
    expect(game.act('fleet:keychain:0')).toBe(true);
    expect(game.s.fleet).toEqual({ bust: 2 });
  });

  it('moves the whole main group when the new main had no dedicated printers', () => {
    const game = workshop();
    game.s.mdls.push('bust');
    game.act('fleet:keychain:1');
    game.act('mdl:bust');
    expect(printersOn(game.s, 'bust')).toBe(3);
    expect(printersOn(game.s, 'fig')).toBe(0);
    expect(game.s.fleet).toEqual({ keychain: 1 });
  });

  it('migrates a v6 two-group split', () => {
    const v6 = { ...createGame().s, v: 6, auto: 4, mdls: ['fig', 'keychain'], fleetModel: 'keychain', fleetPrinters: 3 } as Record<string, unknown>;
    delete v6.fleet;
    const s = migrate(v6);
    expect(s.fleet).toEqual({ keychain: 3 });
    expect('fleetModel' in s).toBe(false);
  });

  it('prints both models during offline progress even with a limited shared supply', () => {
    const game = workshop();
    game.act('fleet:keychain:2');
    game.s.fil = fleetFilamentPerSecond(game.s) / 2;
    game.catchUp(1);
    expect(game.s.modelStock.fig.printed).toBe(1);
    expect(game.s.modelStock.keychain.printed).toBe(2);
    expect(game.s.fil).toBeCloseTo(0);
  });
});
