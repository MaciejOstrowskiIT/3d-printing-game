import { describe, expect, it } from 'vitest';
import { COUNT_MS, GAIN_GAP_MS, countValue, gainQueue, takeGain } from '../src/ui/gainFloats';

describe('money floats', () => {
  it('shows the first gain at once and merges gains inside the gap', () => {
    const q = gainQueue();
    expect(takeGain(q, 1000, 5)).toBe(5);
    expect(takeGain(q, 1100, 2)).toBe(0);
    expect(takeGain(q, 1200, 3)).toBe(0);
    expect(takeGain(q, 1000 + GAIN_GAP_MS, 1)).toBe(6);
    expect(q.pending).toBe(0);
  });

  it('flushes held-back income on a later call without new income', () => {
    const q = gainQueue();
    takeGain(q, 0, 1);
    takeGain(q, 50, 4);
    expect(takeGain(q, GAIN_GAP_MS - 1, 0)).toBe(0);
    expect(takeGain(q, GAIN_GAP_MS, 0)).toBe(4);
    expect(takeGain(q, 10 * GAIN_GAP_MS, 0)).toBe(0);
  });

  it('caps the rate at one float per gap however often sales pay', () => {
    const q = gainQueue();
    let floats = 0, total = 0;
    for (let ms = 0; ms < 2000; ms += 16) { const g = takeGain(q, ms, 0.5); if (g) { floats++; total += g; } }
    expect(floats).toBeLessThanOrEqual(Math.ceil(2000 / GAIN_GAP_MS));
    expect(total + q.pending).toBeCloseTo(0.5 * Math.ceil(2000 / 16));
  });

  it('ignores spending and zero', () => {
    const q = gainQueue();
    expect(takeGain(q, 0, -10)).toBe(0);
    expect(takeGain(q, 0, 0)).toBe(0);
  });
});

describe('counters', () => {
  it('ease from the old value to the new one and land exactly on it', () => {
    expect(countValue(0, 100, 0)).toBe(0);
    const mid = countValue(0, 100, COUNT_MS / 2);
    expect(mid).toBeGreaterThan(50);
    expect(mid).toBeLessThan(100);
    expect(countValue(0, 100, COUNT_MS)).toBe(100);
    expect(countValue(100, 40, COUNT_MS * 2)).toBe(40);
  });
});
