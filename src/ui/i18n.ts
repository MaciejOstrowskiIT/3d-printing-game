import { signal } from '@preact/signals';
import { massText } from '../core/units';
import { ACH } from '../content/achievements';
import { MARKET_EVENT } from '../content/events';
import { MODEL } from '../content/models';
import { CALENDAR_EVENT } from '../content/calendar';
import { STORY_MSG } from '../content/story';
import { MATERIAL } from '../content/materials';
import { COLORS } from '../content/colors';
import { en } from '../content/i18n/en';
import { pl, type Dict } from '../content/i18n/pl';
import { NODE } from '../content/tree';
import type { LogEntry } from '../core/state';
import { platform } from './platform';

export type Lang = 'pl' | 'en';
export type Notation = 'short' | 'scientific' | 'full';
/** Player preferences, kept in the platform preferences (not in GameState). Missing optional fields use defaults. */
export interface Prefs {
  lang: Lang; mute: boolean; view?: 'room' | 'close';
  /** Sound volume 0–1 (default 1). */
  volume?: number;
  /** How big numbers are written (default short: 1.2 M). */
  notation?: Notation;
  /** Reduced motion; undefined follows the system setting. */
  motion?: boolean;
  /** Show the onboarding hints (default on). */
  hints?: boolean;
}

function loadPrefs(): Prefs {
  const base: Prefs = { lang: (navigator.language || 'pl').toLowerCase().startsWith('pl') ? 'pl' : 'en', mute: false };
  try { return { ...base, ...JSON.parse(platform.loadPrefs() || '{}') }; } catch { return base; }
}

export const prefs = signal<Prefs>(loadPrefs());
/** Re-reads preferences once the platform is ready (a portal SDK may hold them). */
export const reloadPrefs = () => { prefs.value = loadPrefs(); };
export const setPrefs = (p: Partial<Prefs>) => { prefs.value = { ...prefs.value, ...p }; platform.savePrefs(JSON.stringify(prefs.value)); };

const DICTS: Record<Lang, Dict> = { pl, en };
export const dict = () => DICTS[prefs.value.lang];
export const li = () => (prefs.value.lang === 'pl' ? 0 : 1);

type Key = { [K in keyof Dict]: Dict[K] extends string ? K : never }[keyof Dict];
const fill = (s: string, a: (string | number)[]) => a.reduce<string>((r, v, i) => r.replace('{' + i + '}', String(v)), s);
export const t = (k: Key, ...a: (string | number)[]) => fill(dict()[k], a);

/** Number formatters by locale and digits. Creating one is slow (toLocaleString makes a new one on every call), and the
 *  UI formats hundreds of numbers a second. */
const FORMATS = new Map<string, Intl.NumberFormat>();
export const nf = (n: number, d = 0) => {
  const locale = prefs.value.lang === 'pl' ? 'pl-PL' : 'en-US', key = locale + d;
  let f = FORMATS.get(key);
  if (!f) FORMATS.set(key, f = new Intl.NumberFormat(locale, { minimumFractionDigits: d, maximumFractionDigits: d }));
  return f.format(n);
};

const UNITS = {
  pl: [[1e18, ' trln'], [1e15, ' bld'], [1e12, ' bln'], [1e9, ' mld'], [1e6, ' mln'], [1e3, ' tys.']],
  en: [[1e18, 'Qi'], [1e15, 'Qa'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']],
} as const;

/** Numbers in a given notation: short (below 10k in full, then tys., mln / K, M), scientific (1.23e6) or full. */
export function fmtAs(n: number, notation: Notation, d = 0): string {
  n = Math.max(0, n);
  if (n >= 1e21) return n.toExponential(2);
  if (n < 1e4) return nf(n, d);
  if (notation === 'scientific') return n.toExponential(2);
  if (notation === 'full') return nf(n, d);
  for (const [v, u] of UNITS[prefs.value.lang]) if (n >= v) return nf(n / v, 2) + u;
  return nf(n, d);
}

/** Numbers as the player chose to read them (Settings → Number notation). Every number in the UI goes through here. */
export const fmt = (n: number, d = 0): string => fmtAs(n, prefs.value.notation ?? 'short', d);

/** Reduced motion: the player's choice, or the system setting until they choose. */
export const reducedMotion = (): boolean => prefs.value.motion ?? systemReducedMotion();

// The media query list is live, so it is created once (per matchMedia implementation) and read on every call.
let motionQuery: { fn: typeof matchMedia; list: MediaQueryList } | undefined;
function systemReducedMotion() {
  if (typeof matchMedia !== 'function') return false;
  if (motionQuery?.fn !== matchMedia) motionQuery = { fn: matchMedia, list: matchMedia('(prefers-reduced-motion: reduce)') };
  return motionQuery.list.matches;
}

/** Mass from grams in the largest sensible unit (850 g, 10 kg, 1.5 t). */
export const mass = (g: number) => massText(g, prefs.value.lang, fmt);

export function money(n: number): string {
  const m = n < 0 ? '−' : '', a = Math.abs(n);
  return prefs.value.lang === 'pl' ? m + fmt(a, a < 1e4 ? 2 : 0) + ' zł' : m + '$' + fmt(a, a < 1e4 ? 2 : 0);
}

export const dur = (s: number) =>
  s >= 3600 ? Math.floor(s / 3600) + ' h ' + Math.floor((s % 3600) / 60) + ' min'
    : s < 60 ? Math.max(1, Math.round(s)) + ' s' // short spans (filament runway) in seconds, not "1 min"
    : Math.floor(s / 60) + ' min';

/** Countdown as m:ss. */
export const clock = (s: number) => { const t = Math.max(0, Math.ceil(s)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };

/** Elapsed play time as m:ss, or h:mm:ss after the first hour. */
export function playtime(seconds: number): string {
  const elapsed = Math.floor(seconds);
  const hours = Math.floor(elapsed / 3600);
  const remainder = clock(elapsed % 3600);
  return hours ? hours + ':' + remainder.padStart(5, '0') : remainder;
}

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
      case '(': return mass(+x.slice(1));
      case '&': return colorName(+x.slice(1));
      case '!': return ACH[x.slice(1)]?.n[li()] ?? x;
      case '^': return MARKET_EVENT[x.slice(1)]?.name[li()] ?? x;
      case '*': return MODEL[x.slice(1)]?.name[li()] ?? x;
      case '+': return CALENDAR_EVENT[x.slice(1)]?.name[li()] ?? x;
      case '=': return STORY_MSG[x.slice(1)]?.from[li()] ?? x;
      case '/': return MATERIAL[x.slice(1)]?.name[li()] ?? x;
      default: return x;
    }
  });
  // Abbreviated numbers end with a dot ("12 tys."); do not double it at the end of a sentence.
  return fill((D.L as Record<string, string>)[e.k] ?? e.k, args).replace(/\.\.(?=\s|$)/g, '.');
}
