// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { sameValue } from '../src/ui/store';
import { blinkAt, easeInOut, headAt } from '../src/ui/scene/roomMotion';
import { frameGate } from '../src/ui/frameCap';

describe('useS result equality', () => {
  it('treats fresh objects and arrays with the same values as unchanged', () => {
    expect(sameValue({ a: 1, b: 'x', c: [1, 2], d: { e: true } }, { a: 1, b: 'x', c: [1, 2], d: { e: true } })).toBe(true);
    expect(sameValue(null, null)).toBe(true);
    expect(sameValue(NaN, NaN)).toBe(true);
    expect(sameValue({ run: Infinity }, { run: Infinity })).toBe(true);
  });

  it('sees any changed value, key or length', () => {
    expect(sameValue({ a: 1 }, { a: 2 })).toBe(false);
    expect(sameValue({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(sameValue([1, 2], [1, 2, 3])).toBe(false);
    expect(sameValue({ a: [1] }, { a: [2] })).toBe(false);
    expect(sameValue(null, { a: 1 })).toBe(false);
    expect(sameValue([], {})).toBe(false);
  });

  it('counts a nested object that is the same reference as changed (it may be state mutated in place)', () => {
    const live = { pieces: 1 };
    expect(sameValue({ live }, { live })).toBe(false);
    // The very same top-level value is unchanged, as before.
    expect(sameValue(live, live)).toBe(true);
  });
});

describe('Room motion', () => {
  it('follows CSS ease-in-out', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 4);
    // cubic-bezier(.42,0,.58,1) at x = .25 is about .129.
    expect(easeInOut(0.25)).toBeCloseTo(0.129, 2);
  });

  it('moves the print head there and back like the old alternate keyframes', () => {
    expect(headAt(0)).toBe(0);
    expect(headAt(1.1)).toBeCloseTo(1, 5);
    expect(headAt(2.2)).toBeCloseTo(0, 5);
    expect(headAt(0.55)).toBeCloseTo(headAt(1.65), 5);
  });

  it('blinks in the four steps of the old steps(2) keyframes', () => {
    expect([0.2, 0.6, 1.0, 1.4, 1.8].map(blinkAt)).toEqual(['1', '0.625', '0.25', '0.625', '1']);
  });

  it('lets one frame through per time slot', () => {
    const gate = frameGate();
    expect(gate(0)).toBe(true);
    expect(gate(16)).toBe(false);
    expect(gate(51)).toBe(true);
    expect(gate(60)).toBe(false);
  });
});
