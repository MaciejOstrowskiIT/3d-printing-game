/** Mass from grams in the largest sensible unit: 850 g, 10 kg, 1.5 t (trailing zeros dropped, locale decimals).
 *  Above 1,000 t the count is abbreviated by `big` (for example 5 K t). Pure, so it can be tested without a browser. */
export function massText(g: number, lang: 'pl' | 'en', big: (n: number) => string): string {
  g = Math.max(0, g);
  const num = (n: number, d: number) => massFormat(lang, d).format(n);
  if (g < 1000) return num(Math.floor(g), 0) + ' g';
  if (g < 1e6) { const kg = g / 1000; return num(kg, kg < 100 ? 1 : 0) + ' kg'; }
  const t = g / 1e6;
  return (t < 1e3 ? num(t, t < 100 ? 2 : 0) : big(t)) + ' t';
}

/** Formatters are cached: making one per call (what toLocaleString does) is slow, and the HUD formats mass every tick. */
const FORMATS = new Map<string, Intl.NumberFormat>();
function massFormat(lang: 'pl' | 'en', d: number) {
  const key = lang + d;
  let f = FORMATS.get(key);
  if (!f) FORMATS.set(key, f = new Intl.NumberFormat(lang === 'pl' ? 'pl-PL' : 'en-US', { maximumFractionDigits: d }));
  return f;
}
