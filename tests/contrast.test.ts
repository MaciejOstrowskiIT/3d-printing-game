import { describe, expect, it } from 'vitest';
import css from '../src/styles/01-base.css?raw';

/** Colour tokens from 01-base.css, resolved for each theme (`light-dark(a,b)` → a in light, b in dark). */
const root = css.slice(css.indexOf(':root{'), css.indexOf('}', css.indexOf(':root{')));
const tokens = (theme: 0 | 1) => {
  const out: Record<string, string> = {};
  for (const [, name, value] of root.matchAll(/--([\w-]+):([^;]+?)(?=;|$)/g)) {
    const ld = value.match(/^light-dark\((#[0-9a-f]+),\s*(#[0-9a-f]+)\)$/i);
    if (ld) out[name] = ld[1 + theme];
    else if (/^#[0-9a-f]+$/i.test(value)) out[name] = value;
  }
  return out;
};

const rgb = (hex: string) => {
  const h = hex.slice(1);
  const full = h.length === 3 ? [...h].map(c => c + c).join('') : h;
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255);
};
const lum = (hex: string) => {
  const [r, g, b] = rgb(hex).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** WCAG 2 contrast ratio. */
const contrast = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Text colour → the surfaces it is drawn on. Body text needs 4.5:1 (WCAG 1.4.3, level AA). */
const PAIRS: [string, string[]][] = [
  ['ink', ['bg', 'card', 'sub', 'orS', 'accS', 'badS']],
  ['mute', ['bg', 'card', 'sub']],
  ['acc', ['card', 'sub', 'accS']],
  ['bad', ['card', 'sub', 'badS']],
  ['orT', ['card', 'sub', 'orS']],
];

describe('colour contrast of text tokens', () => {
  for (const [theme, name] of [[0, 'light'], [1, 'dark']] as const) {
    const tk = tokens(theme);
    for (const [fg, bgs] of PAIRS) for (const bg of bgs) {
      it(`${name}: --${fg} on --${bg} is at least 4.5:1`, () => {
        expect(tk[fg], `--${fg}`).toBeDefined();
        expect(tk[bg], `--${bg}`).toBeDefined();
        expect(contrast(tk[fg], tk[bg])).toBeGreaterThanOrEqual(4.5);
      });
    }
    it(`${name}: text on the orange buttons (also on hover) is at least 4.5:1`, () => {
      expect(contrast(tk.onOr, tk.or)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tk.onOr, tk.orD)).toBeGreaterThanOrEqual(4.5);
    });
  }
  it('the contrast formula matches known values', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });
});
