import { MODEL } from '../content/models';
import type { GameState } from '../core/state';

export const PERIOD_SECONDS = 30;
export const PERIOD_COUNT = 10;
export const CASH_KINDS = ['sales', 'orders', 'bonus', 'filament', 'equipment', 'other'] as const;
type CashKind = typeof CASH_KINDS[number];

interface ModelSales { pieces: number; revenue: number }
export interface CashPeriod {
  index: number;
  cash: Record<CashKind, number>;
  models: Record<string, ModelSales>;
}

export const periodIndex = (s: GameState) => Math.floor(s.financeTime / PERIOD_SECONDS);
export const newPeriod = (index: number): CashPeriod => ({
  index, cash: { sales: 0, orders: 0, bonus: 0, filament: 0, equipment: 0, other: 0 }, models: {},
});
export const income = ({ cash }: CashPeriod) => cash.sales + cash.orders + cash.bonus;
export const expenses = ({ cash }: CashPeriod) => cash.filament + cash.equipment + cash.other;

export function bookCash(s: GameState, kind: CashKind, amount: number, sale?: { modelId: string; pieces: number }) {
  s.zl += kind === 'filament' || kind === 'equipment' || kind === 'other' ? -amount : amount;
  if (!amount || s.ph !== 1) return;

  const index = periodIndex(s);
  let period = s.finance.at(-1);
  if (period?.index !== index) {
    s.finance = s.finance.filter(p => p.index > index - PERIOD_COUNT);
    period = newPeriod(index);
    s.finance.push(period);
  }
  period.cash[kind] += amount;
  if (sale) {
    const model = period.models[sale.modelId] ??= { pieces: 0, revenue: 0 };
    model.pieces += sale.pieces;
    model.revenue += amount;
  }
}

export function validWorkshopStats(s: GameState) {
  if (s.financeTime < 0 || !Array.isArray(s.finance) || s.finance.length > PERIOD_COUNT) return false;
  const record = (x: unknown) => !!x && typeof x === 'object' && !Array.isArray(x);
  const nonNegative = (n: number) => Number.isFinite(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER;
  let previous = -1;
  for (const p of s.finance) {
    if (!record(p) || !Number.isSafeInteger(p.index) || p.index <= previous || p.index > periodIndex(s) ||
        !record(p.cash) || !CASH_KINDS.every(kind => nonNegative(p.cash[kind])) || !record(p.models)) return false;
    previous = p.index;
    if (!Object.entries(p.models).every(([id, m]) => Object.hasOwn(MODEL, id) && record(m) &&
      Number.isSafeInteger(m.pieces) && m.pieces > 0 && nonNegative(m.revenue))) return false;
  }
  return true;
}
