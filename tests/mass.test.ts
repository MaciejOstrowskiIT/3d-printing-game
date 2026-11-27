import { describe, expect, it } from 'vitest';
import { massText } from '../src/core/units';

const big = (n: number) => `${n / 1e3} K`;
const en = (g: number) => massText(g, 'en', big);

describe('massText', () => {
  it('uses grams, kilograms and tonnes by size', () => {
    expect(en(0)).toBe('0 g');
    expect(en(850)).toBe('850 g');
    expect(en(999.9)).toBe('999 g');
    expect(en(1000)).toBe('1 kg');
    expect(en(10000)).toBe('10 kg');
    expect(en(12500)).toBe('12.5 kg');
    expect(en(250000)).toBe('250 kg');
    expect(en(1e6)).toBe('1 t');
    expect(en(1.5e6)).toBe('1.5 t');
    expect(en(42e6)).toBe('42 t');
    expect(en(5e9)).toBe('5 K t');
    expect(en(-5)).toBe('0 g');
  });

  it('uses the Polish decimal comma', () => {
    expect(massText(12500, 'pl', big)).toBe('12,5 kg');
    expect(massText(1.5e6, 'pl', big)).toBe('1,5 t');
  });
});
