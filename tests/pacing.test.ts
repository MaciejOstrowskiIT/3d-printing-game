import { describe, expect, it } from 'vitest';
import { createState } from '../src/core/state';
import { deadZones, goalIndexAt, incomeWindows, purchaseCounters, purchaseGaps } from './pacing';

describe('pacing report helpers', () => {
  it('finds the gaps between purchases up to the cut-off, including the stretch before the first and after the last', () => {
    const goal = goalIndexAt([1, 5]);
    expect(purchaseGaps([2, 2.5, 7, 20], 10, goal)).toEqual([
      { from: 0, to: 2, len: 2, goal: 0 },
      { from: 2, to: 2.5, len: 0.5, goal: 1 },
      { from: 2.5, to: 7, len: 4.5, goal: 1 },
      { from: 7, to: 10, len: 3, goal: 2 },
    ]);
  });

  it('flags only gaps longer than the threshold as dead zones', () => {
    const gaps = purchaseGaps([2, 2.5, 7], 10, () => 0);
    expect(deadZones(gaps, 3).map(g => g.from)).toEqual([2.5]);
  });

  it('tells which goal is in progress at a minute', () => {
    const at = goalIndexAt([0.5, 2]);
    expect([0, 0.5, 1, 2, 9].map(at)).toEqual([0, 1, 1, 2, 2]);
  });

  it('averages money per second over fixed windows', () => {
    const samples: [number, number][] = Array.from({ length: 41 }, (_, i) => [i, i * 60]);
    // 1 money per second throughout, in two complete 20-minute windows.
    expect(incomeWindows(samples, 20).map(v => Math.round(v * 100) / 100)).toEqual([1, 1]);
  });

  it('counts a bought printer or node as a purchase, but not a spool', () => {
    const s = createState();
    const before = purchaseCounters(s);
    s.fil += 1000; s.zl -= 60;
    expect(purchaseCounters(s)).toEqual(before);
    s.auto++;
    expect(purchaseCounters(s).some((n, i) => n > before[i])).toBe(true);
  });
});
