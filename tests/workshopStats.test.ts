import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core/game';
import { autoCost, spoolPrice } from '../src/core/formulas';
import { exportSave, importSave } from '../src/core/save';
import { putPieces } from '../src/systems/inventory';
import { salesSystem } from '../src/systems/sales';
import { expenses, income, PERIOD_COUNT, PERIOD_SECONDS } from '../src/systems/workshopStats';

describe('workshop cash flow', () => {
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

  it('rejects improperly formed records and starts old saves with no history', () => {
    const g = createGame();
    expect(importSave(JSON.stringify({ total: 20, done: [], zl: 30 }))?.finance).toEqual([]);
    expect(importSave(JSON.stringify({ ...g.s, finance: [null] }))).toBeNull();
  });
});
