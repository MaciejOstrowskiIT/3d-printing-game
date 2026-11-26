import { describe, expect, it } from 'vitest';
import { BAL } from '../src/content/balance';
import { rate1 } from '../src/core/formulas';
import { createGame } from '../src/core/game';
import { piecesInStock, putPieces, setStockPrice, stockPrice } from '../src/systems/inventory';
import { createState, type GameState } from '../src/core/state';
import { autoPrice } from '../src/systems/automation';
import { salesSystem } from '../src/systems/sales';


/** A workshop with 30 printers and plenty of filament; production is added by hand so the test controls it. */
function shop(over: Partial<GameState> = {}): GameState {
  return { ...createState(), auto: 30, fil: 1e9, goal: 8, dem: 10, ...over }; // demand ≈ 40/s at the start price
}

/** One second: printers make rate1 figurines, autoPrice adjusts, customers buy (10 ticks). */
function second(s: GameState) {
  s.inv += rate1(s);
  autoPrice(s);
  for (let i = 0; i < 10; i++) salesSystem(s, 0.1);
}

describe('dynamic pricing', () => {
  it('drains a big stock gradually instead of dumping it', () => {
    const s = shop({ inv: 20000 });
    const rate = rate1(s);
    let prev = s.price;
    for (let t = 0; t < 120; t++) {
      const before = s.inv;
      second(s);
      // price moves by at most autoPriceStep a second
      expect(Math.abs(s.price - prev)).toBeLessThanOrEqual(prev * BAL.autoPriceStep + 0.002);
      prev = s.price;
      // stock never falls faster than the drain cap allows (plus rounding of whole sales)
      expect(before + rate - s.inv).toBeLessThanOrEqual(rate * BAL.autoPriceMaxDrain + 2);
    }
    expect(s.inv).toBeGreaterThan(20000 - 120 * rate * (BAL.autoPriceMaxDrain - 1) - 200);
    expect(s.inv).toBeLessThan(20000);
  });

  it('settles on a steady price with stock near target, without oscillating', () => {
    const s = shop({ inv: 0, price: 20 });
    for (let t = 0; t < 600; t++) second(s);
    const prices: number[] = [];
    for (let t = 0; t < 120; t++) { second(s); prices.push(s.price); }
    const lo = Math.min(...prices), hi = Math.max(...prices);
    expect(hi / lo).toBeLessThan(1.05);
    expect(s.inv).toBeLessThan(rate1(s) * BAL.autoPriceStockSeconds * 3);
  });

  it('reprices and sells inactive stock while figurines are still in stock', () => {
    const s = shop({ auto: 0, dem: 1, mdls: ['fig', 'keychain'] });
    putPieces(s, 'fig', 500, 0);
    putPieces(s, 'keychain', 100, 0);
    setStockPrice(s, 'keychain', 80);

    autoPrice(s);
    expect(stockPrice(s, 'keychain')).toBeLessThan(80);
    for (let t = 0; t < 30; t++) {
      autoPrice(s);
      salesSystem(s, 1);
    }

    expect(piecesInStock(s, 'fig')).toBeGreaterThan(0);
    expect(piecesInStock(s, 'fig')).toBeLessThan(500);
    expect(piecesInStock(s, 'keychain')).toBeLessThan(100);
    expect(s.mdl).toBe('fig');
  });

  it('changes the selected sales price without switching production', () => {
    const g = createGame({ state: shop({ mdls: ['fig', 'keychain'] }) });
    setStockPrice(g.s, 'keychain', 4);
    const price = g.s.price;
    expect(g.act('price-down:keychain')).toBe(true);
    expect(stockPrice(g.s, 'keychain') * 0.5).toBeCloseTo(1.9);
    expect(g.s.price).toBe(price);
    expect(g.s.mdl).toBe('fig');
    expect(g.act('price-down:bust')).toBe(false);
  });

  it('never prices below cost + 30%', () => {
    const s = shop({ inv: 1e6, price: 0.5 });
    for (let t = 0; t < 30; t++) second(s);
    expect(s.price).toBeGreaterThan(0.5);
  });
});
