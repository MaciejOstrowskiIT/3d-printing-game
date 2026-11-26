import { signal } from '@preact/signals';
import { ACH } from '../content/achievements';
import { MARKET_EVENT } from '../content/events';
import { COLORS } from '../content/colors';
import { en } from '../content/i18n/en';
import { pl, type Dict } from '../content/i18n/pl';
import { NODE } from '../content/tree';
import type { LogEntry } from '../core/state';
import { platform } from './platform';

export type Lang = 'pl' | 'en';
export interface Prefs { lang: Lang; mute: boolean; view?: 'room' | 'close' }

function loadPrefs(): Prefs {
  const base: Prefs = { lang: (navigator.language || 'pl').toLowerCase().startsWith('pl') ? 'pl' : 'en', mute: false };
  try { return { ...base, ...JSON.parse(platform.loadPrefs() || '{}') }; } catch { return base; }
}

export const prefs = signal<Prefs>(loadPrefs());
export const setPrefs = (p: Partial<Prefs>) => { prefs.value = { ...prefs.value, ...p }; platform.savePrefs(JSON.stringify(prefs.value)); };

const DICTS: Record<Lang, Dict> = { pl, en };
export const dict = () => DICTS[prefs.value.lang];
export const li = () => (prefs.value.lang === 'pl' ? 0 : 1);

type Key = { [K in keyof Dict]: Dict[K] extends string ? K : never }[keyof Dict];
const fill = (s: string, a: (string | number)[]) => a.reduce<string>((r, v, i) => r.replace('{' + i + '}', String(v)), s);
export const t = (k: Key, ...a: (string | number)[]) => fill(dict()[k], a);

export const nf = (n: number, d = 0) =>
  n.toLocaleString(prefs.value.lang === 'pl' ? 'pl-PL' : 'en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

const UNITS = {
  pl: [[1e18, ' trln'], [1e15, ' bld'], [1e12, ' bln'], [1e9, ' mld'], [1e6, ' mln'], [1e3, ' tys.']],
  en: [[1e18, 'Qi'], [1e15, 'Qa'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']],
} as const;

/** Numbers: full below 10k, abbreviated above (tys., mln / K, M). */
export function fmt(n: number, d = 0): string {
  n = Math.max(0, n);
  if (n >= 1e21) return n.toExponential(2);
  if (n < 1e4) return nf(n, d);
  for (const [v, u] of UNITS[prefs.value.lang]) if (n >= v) return nf(n / v, 2) + u;
  return nf(n, d);
}

export function money(n: number): string {
  const m = n < 0 ? '−' : '', a = Math.abs(n);
  return prefs.value.lang === 'pl' ? m + fmt(a, a < 1e4 ? 2 : 0) + ' zł' : m + '$' + fmt(a, a < 1e4 ? 2 : 0);
}

export const dur = (s: number) =>
  s >= 3600 ? Math.floor(s / 3600) + ' h ' + Math.floor((s % 3600) / 60) + ' min' : Math.max(1, Math.floor(s / 60)) + ' min';

/** Countdown as m:ss. */
export const clock = (s: number) => { const t = Math.max(0, Math.ceil(s)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };

export const nodeName = (id: string) => NODE[id]?.n[li()] ?? id;
export const colorName = (i: number) => COLORS[i]?.n[li()] ?? '';

/** Renders a log entry in the current language (argument prefixes are documented in core/state.ts). */
export function logText(e: LogEntry): string {
  const D = dict();
  if (e.k === 'goal') return fill(D.L.goal, [String(e.a[0]).split('|')[li()]]);
  const args = e.a.map(x => {
    if (typeof x === 'number') return fmt(x);
    switch (x[0]) {
      case '@': return nodeName(x.slice(1));
      case '$': return money(+x.slice(1));
      case '#': return D.clients[+x.slice(1)];
      case '%': return D.causes[+x.slice(1)];
      case '~': return dur(+x.slice(1));
      case '&': return colorName(+x.slice(1));
      case '!': return ACH[x.slice(1)]?.n[li()] ?? x;
      case '^': return MARKET_EVENT[x.slice(1)]?.name[li()] ?? x;
      default: return x;
    }
  });
  return fill((D.L as Record<string, string>)[e.k] ?? e.k, args);
}
