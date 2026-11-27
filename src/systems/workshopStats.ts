import { MODEL } from '../content/models';
import type { GameState } from '../core/state';

export const PERIOD_SECONDS = 30;
export const PERIOD_COUNT = 10;
export const CASH_KINDS = ['sales', 'orders', 'bonus', 'filament', 'equipment', 'other'] as const;
type CashKind = typeof CASH_KINDS[number];

interface ModelSales {
  pieces: number;
  revenue: number;
  cost?: number | null;
  stocked?: number;
  shipped?: number;
}
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

// The live counter is transient. Saved finance periods do not have second-by-second data.
const latestIncome = new WeakMap<GameState, { second: number; amount: number }>();

// Running total of money earned since the state was loaded; the HUD turns its growth into "+$12.50" floats.
const incomeTotal = new WeakMap<GameState, number>();
export const incomeSinceLoad = (s: GameState): number => incomeTotal.get(s) ?? 0;

export function currentSecondIncome(s: GameState): number {
  const entry = latestIncome.get(s);
  return entry?.second === Math.floor(s.financeTime) ? entry.amount : 0;
}

export function clearCurrentIncome(s: GameState) {
  latestIncome.delete(s);
}

function currentPeriod(s: GameState) {
  const index = periodIndex(s);
  let period = s.finance.at(-1);
  if (period?.index !== index) {
    s.finance = s.finance.filter(p => p.index > index - PERIOD_COUNT);
    period = newPeriod(index);
    s.finance.push(period);
  }
  return period;
}

function modelActivity(s: GameState, id: string) {
  return currentPeriod(s).models[id] ??= { pieces: 0, revenue: 0 };
}

export function recordStockOutput(s: GameState, id: string, pieces: number) {
  const activity = modelActivity(s, id);
  activity.stocked = (activity.stocked ?? 0) + pieces;
}

export function recordStockShipment(s: GameState, id: string, pieces: number) {
  const activity = modelActivity(s, id);
  activity.shipped = (activity.shipped ?? 0) + pieces;
}

export function stockGrowth(s: GameState, id: string) {
  const activity = s.finance.find(p => p.index === periodIndex(s) - 1)?.models[id];
  const stocked = activity?.stocked ?? 0;
  const sold = activity?.pieces ?? 0;
  if (stocked < Math.max(1, 1.1 * (sold + (activity?.shipped ?? 0)) + 1e-9)) return null;
  return { stocked: stocked * 60 / PERIOD_SECONDS, sold: sold * 60 / PERIOD_SECONDS };
}

export function bookCash(s: GameState, kind: CashKind, amount: number, sale?: { modelId: string; pieces: number; cost?: number | null }) {
  const incoming = kind === 'sales' || kind === 'orders' || kind === 'bonus';
  s.zl += incoming ? amount : -amount;
  if (!amount || s.ph !== 1) return;
  if (incoming) {
    incomeTotal.set(s, incomeSinceLoad(s) + amount);
    latestIncome.set(s, { second: Math.floor(s.financeTime), amount: currentSecondIncome(s) + amount });
  }
  currentPeriod(s).cash[kind] += amount;
  if (sale) {
    const model = modelActivity(s, sale.modelId);
    model.cost = sale.cost != null && (!model.pieces || model.cost != null) ? (model.cost ?? 0) + sale.cost : null;
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
      Number.isSafeInteger(m.pieces) && m.pieces >= 0 && nonNegative(m.revenue) &&
      (m.cost == null || nonNegative(m.cost)) &&
      [m.stocked, m.shipped].every(n => n === undefined || (Number.isSafeInteger(n) && n >= 0)))) return false;
  }
  return true;
}
