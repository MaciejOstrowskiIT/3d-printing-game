import { PERIOD_COUNT, expenses, income, type CashPeriod } from '../systems/workshopStats';

export interface Sparkline { income: string; spend: string }

/** Turns the finished finance periods (the last few minutes) into two SVG polylines, income and spending, on a shared
 *  scale in a width x height box (y grows down). The running period is left out so the line does not dip at its end.
 *  Returns null until there are two finished periods with any money in them. */
export function sparkline(periods: readonly CashPeriod[], current: number, width: number, height: number): Sparkline | null {
  const first = Math.max(0, current - PERIOD_COUNT + 1);
  const span = current - first;
  if (span < 2) return null;
  const byIndex = new Map(periods.map(p => [p.index, p]));
  const rows = Array.from({ length: span }, (_, i) => {
    const p = byIndex.get(first + i);
    return p ? { in: income(p), out: expenses(p) } : { in: 0, out: 0 };
  });
  const top = Math.max(...rows.map(r => Math.max(r.in, r.out)));
  if (!(top > 0)) return null;
  const pad = 1, h = height - 2 * pad;
  const line = (pick: (r: { in: number; out: number }) => number) => rows
    .map((r, i) => `${round((i * width) / (rows.length - 1))},${round(pad + h - (h * Math.max(0, pick(r))) / top)}`)
    .join(' ');
  return { income: line(r => r.in), spend: line(r => r.out) };
}

const round = (n: number) => Math.round(n * 10) / 10;
