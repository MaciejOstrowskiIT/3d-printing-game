import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core/game';
import { autoCost, spoolPrice, unitCost } from '../src/core/formulas';
import { exportSave, importSave } from '../src/core/save';
import { createState } from '../src/core/state';
import { putPieces } from '../src/systems/inventory';
import { salesSystem } from '../src/systems/sales';
import { bookCash, currentSecondIncome, expenses, income, PERIOD_COUNT, PERIOD_SECONDS, stockGrowth } from '../src/systems/workshopStats';

describe('workshop cash flow', () => {
  it('counts actual receipts in the current second without subtracting purchases', () => {
    // No filament, so the garage printer stays idle and only the booked cash counts.
    const g = createGame({ state: { ...createState(), fil: 0 } });
    g.tick(0.25);
    bookCash(g.s, 'sales', 8);
    g.tick(0.25);
    bookCash(g.s, 'orders', 20);
    bookCash(g.s, 'bonus', 2);
    bookCash(g.s, 'equipment', 5);
    expect(currentSecondIncome(g.s)).toBe(30);
    expect(currentSecondIncome(importSave(exportSave(g.s))!)).toBe(0);

    g.tick(0.5);
    expect(currentSecondIncome(g.s)).toBe(0);
    bookCash(g.s, 'sales', 4);
    expect(currentSecondIncome(g.s)).toBe(4);
    expect(income(g.s.finance[0])).toBe(34);
  });

  it('keeps offline sales in finance history without showing them as live income', () => {
    const g = createGame();
    putPieces(g.s, 'fig', 4, 0);
    g.catchUp(1);
    expect(income(g.s.finance[0])).toBeGreaterThan(0);
    expect(currentSecondIncome(g.s)).toBe(0);
  });
  it('keeps sale receipts by model separate from purchases in the same period', () => {
    const g = createGame();
    g.s.mdls.push('keychain');
    putPieces(g.s, 'fig', 2, 0);
    putPieces(g.s, 'keychain', 4, 0);
    salesSystem(g.s, 100);
    const openingBalance = g.s.zl;
    const [spool, printer] = [spoolPrice(g.s), autoCost(g.s)];
    g.s.zl += spool + printer;
    expect(g.act('spool')).toBe(true);
    expect(g.act('auto')).toBe(true);
    expect(g.s.zl).toBeCloseTo(openingBalance);

    const period = importSave(exportSave(g.s))!.finance[0];
    expect(income(period)).toBeCloseTo(openingBalance);
    expect(expenses(period)).toBeCloseTo(spool + printer);
    expect(period.models.fig.pieces).toBe(2);
    expect(period.models.keychain.pieces).toBe(4);
    expect(period.cash.equipment).toBe(printer);
    expect(period.cash.filament).toBe(spool);
  });

  it('uses simulated time, including offline sales, and bounds saved history', () => {
    const g = createGame();
    for (let i = 0; i <= PERIOD_COUNT; i++) {
      putPieces(g.s, 'fig', 1, 0);
      g.catchUp(PERIOD_SECONDS);
    }
    expect(g.s.financeTime).toBe((PERIOD_COUNT + 1) * PERIOD_SECONDS);
    expect(g.s.finance).toHaveLength(PERIOD_COUNT);
    expect(g.s.finance[0].index).toBe(1);
    expect(g.s.finance.at(-1)?.models.fig.pieces).toBe(1);
  });

  it('values prints at the filament quote before sale, including partial work and later price changes', () => {
    const g = createGame();
    g.s.mdls.push('bust');
    g.act('mdl:bust');
    const initial = unitCost(g.s);
    g.act('print');
    g.s.spool *= 2;
    for (let i = 0; i < 4; i++) g.act('print');
    const resumed = importSave(exportSave(g.s))!;
    resumed.spool *= 2;
    salesSystem(resumed, 100);
    expect(resumed.finance[0].models.bust.cost).toBeCloseTo(initial * 9);
    expect(resumed.finance[0].models.bust.pieces).toBe(1);
  });

  it('leaves old inventory unpriced and records known costs after it sells', () => {
    const g = createGame();
    putPieces(g.s, 'fig', 1, 0);
    g.act('print');
    salesSystem(g.s, 0.25);
    expect(g.s.finance[0].models.fig.cost).toBeNull();
    g.s.financeTime = PERIOD_SECONDS;
    salesSystem(g.s, 0.25);
    expect(g.s.finance[1].models.fig.cost).toBeCloseTo(unitCost(g.s));
  });

  it('shows growth only after a completed period and accounts for shipments', () => {
    const g = createGame();
    for (let i = 0; i < 5; i++) g.act('print');
    salesSystem(g.s, 0.5);
    expect(stockGrowth(g.s, 'fig')).toBeNull();
    g.s.financeTime = PERIOD_SECONDS;
    expect(stockGrowth(g.s, 'fig')).toEqual({ stocked: 10, sold: 4 });
    g.s.finance[0].models.fig.shipped = 3;
    expect(stockGrowth(g.s, 'fig')).toBeNull();
  });

  it('rejects improperly formed records and starts old saves with no history', () => {
    const g = createGame();
    expect(importSave(JSON.stringify({ total: 20, done: [], zl: 30 }))?.finance).toEqual([]);
    expect(importSave(JSON.stringify({ ...g.s, finance: [null] }))).toBeNull();
  });
});
