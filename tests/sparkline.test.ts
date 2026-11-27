import { describe, expect, it } from 'vitest';
import { PERIOD_COUNT, newPeriod, type CashPeriod } from '../src/systems/workshopStats';
import { sparkline } from '../src/ui/sparkline';

const period = (index: number, sales: number, filament = 0): CashPeriod => {
  const p = newPeriod(index);
  p.cash.sales = sales;
  p.cash.filament = filament;
  return p;
};
const points = (line: string) => line.split(' ').map(xy => xy.split(',').map(Number));

describe('funds sparkline', () => {
  it('needs two finished periods with money', () => {
    expect(sparkline([], 0, 36, 12)).toBeNull();
    expect(sparkline([period(0, 5)], 1, 36, 12)).toBeNull();
    expect(sparkline([period(0, 0), period(1, 0)], 2, 36, 12)).toBeNull();
    expect(sparkline([period(0, 5), period(1, 5)], 2, 36, 12)).not.toBeNull();
  });

  it('spans the box, leaves out the running period and fills gaps with zero', () => {
    const line = sparkline([period(0, 10, 5), period(2, 0, 0), period(3, 999)], 3, 36, 12)!;
    const inc = points(line.income), out = points(line.spend);
    expect(inc).toHaveLength(3);
    expect(inc[0][0]).toBe(0);
    expect(inc[2][0]).toBe(36);
    expect(inc[0][1]).toBe(1);          // peak touches the top padding
    expect(inc[1][1]).toBe(11);         // missing period 1 is zero, at the bottom
    expect(out[0][1]).toBe(6);          // half of the peak, shared scale
    for (const [, y] of [...inc, ...out]) { expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(12); }
  });

  it('keeps only the last periods that fit the window', () => {
    const periods = Array.from({ length: PERIOD_COUNT }, (_, i) => period(20 + i, i + 1));
    const line = sparkline(periods, 20 + PERIOD_COUNT - 1, 36, 12)!;
    expect(points(line.income)).toHaveLength(PERIOD_COUNT - 1);
  });
});
