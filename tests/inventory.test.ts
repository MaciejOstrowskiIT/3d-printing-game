import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core/game';
import { exportSave, importSave, migrate } from '../src/core/save';
import { piecesInStock, stockPrice } from '../src/systems/inventory';
import { salesSystem } from '../src/systems/sales';

describe('model inventory', () => {
  function workshop() {
    const g = createGame();
    Object.assign(g.s, { mdls: ['fig', 'keychain', 'bust'], fil: 10_000 });
    return g;
  }

  it('stacks completed pieces and preserves partial work and prices when switching', () => {
    const g = workshop();
    g.act('print');
    g.act('mdl:bust');
    g.act('print');
    expect(piecesInStock(g.s, 'bust')).toBe(0);
    g.act('pplus');
    const bustPrice = g.s.price;
    g.act('mdl:keychain');
    g.act('print');
    expect(piecesInStock(g.s, 'keychain')).toBe(2);
    g.act('mdl:bust');
    expect(g.s.price).toBe(bustPrice);
    for (let i = 0; i < 4; i++) g.act('print');
    expect(g.s.modelStock.bust.printed).toBe(1);
    const saved = importSave(exportSave(g.s))!;
    expect(piecesInStock(saved, 'fig')).toBe(1);
    expect(piecesInStock(saved, 'keychain')).toBe(2);
    expect(piecesInStock(saved, 'bust')).toBe(1);
    expect(saved.inv).toBe(7);
  });

  it('sells each model at its own price, including inactive models', () => {
    const g = workshop();
    g.act('print');
    const figPrice = g.s.price;
    g.act('mdl:keychain');
    g.act('print');
    const keychainPrice = g.s.price;
    g.act('mdl:bust');
    expect(stockPrice(g.s, 'fig')).toBe(figPrice);
    salesSystem(g.s, 100);
    expect(g.s.inv).toBe(0);
    expect(g.s.sold).toBe(3);
    expect(g.s.zl).toBeCloseTo(figPrice + keychainPrice);
  });

  it('keeps legacy stock as figurines even when a different model was selected', () => {
    const s = migrate({ v: 5, inv: 9, mdl: 'bust', mdls: ['fig', 'bust'] });
    expect(piecesInStock(s, 'fig')).toBe(9);
    expect(piecesInStock(s, 'bust')).toBe(0);
  });

  it('returns the actual reserved model when an order fails', () => {
    const g = workshop();
    Object.assign(g.s, { goal: 3, ord: { n: 15, got: 0, time: 30, left: 0.1, offer: 0, acc: true, c: 0, pay: 100 } });
    g.act('mdl:keychain');
    g.act('print');
    g.act('mdl:fig');
    g.tick(0.1);
    expect(g.s.ord).toBeNull();
    expect(piecesInStock(g.s, 'keychain')).toBe(2);
    expect(piecesInStock(g.s, 'fig')).toBe(0);
  });
});
