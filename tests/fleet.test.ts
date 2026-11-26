import { describe, expect, it } from 'vitest';
import { BAL } from '../src/content/balance';
import { MODEL } from '../src/content/models';
import { createGame } from '../src/core/game';
import { gpu } from '../src/core/formulas';
import { exportSave, importSave } from '../src/core/save';
import { fleetFilamentPerSecond } from '../src/systems/fleet';
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
    expect(game.act('fleet-model:keychain')).toBe(true);
    expect(game.act('fleet-count:2')).toBe(true);
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
    game.act('fleet-model:keychain');
    game.act('fleet-count:2');
    productionSystem(game.s, 1, ctx);
    expect(piecesInStock(game.s, 'fig')).toBe(2 + BAL.farmPrinters);
    expect(piecesInStock(game.s, 'keychain')).toBe(4);
    game.act('print');
    expect(piecesInStock(game.s, 'fig')).toBe(3 + BAL.farmPrinters);
    expect(piecesInStock(game.s, 'keychain')).toBe(4);
  });

  it('preserves the two allocations when swapping the main model and reloading', () => {
    const game = workshop();
    game.act('fleet-model:keychain');
    expect(game.act('fleet-count:4')).toBe(false);
    expect(game.act('fleet-model:unknown')).toBe(false);
    game.act('mdl:keychain');
    const saved = importSave(exportSave(game.s))!;
    expect(saved.mdl).toBe('keychain');
    expect(saved.fleetModel).toBe('fig');
    expect(saved.fleetPrinters).toBe(3);
    expect(importSave(exportSave({ ...saved, fleetPrinters: 4 }))).toBeNull();
  });

  it('prints both models during offline progress even with a limited shared supply', () => {
    const game = workshop();
    game.act('fleet-model:keychain');
    game.act('fleet-count:2');
    game.s.fil = fleetFilamentPerSecond(game.s) / 2;
    game.catchUp(1);
    expect(game.s.modelStock.fig.printed).toBe(1);
    expect(game.s.modelStock.keychain.printed).toBe(2);
    expect(game.s.fil).toBeCloseTo(0);
  });
});
