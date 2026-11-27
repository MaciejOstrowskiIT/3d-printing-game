import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../src/content/achievements';
import { CALENDAR } from '../src/content/calendar';
import { COLORS } from '../src/content/colors';
import { MARKET_EVENTS } from '../src/content/events';
import { GOALS } from '../src/content/goals';
import { MATERIALS } from '../src/content/materials';
import { MODELS } from '../src/content/models';
import { PATENTS } from '../src/content/patents';
import { STORY } from '../src/content/story';
import { BRANCHES, TREE } from '../src/content/tree';
import { en } from '../src/content/i18n/en';
import { pl } from '../src/content/i18n/pl';

const placeholders = (s: string) => [...s.matchAll(/\{\d+\}/g)].map(m => m[0]).sort();
/** Every text in a dictionary by path: values can be strings, lists of strings (clients) or nested groups (log lines). */
function flatten(v: unknown, path = '', out: Record<string, unknown> = {}) {
  if (typeof v === 'string') out[path] = v;
  else if (Array.isArray(v)) v.forEach((x, i) => flatten(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) flatten(x, path ? `${path}.${k}` : k, out);
  else out[path] = v;
  return out;
}
const dicts = { pl: flatten(pl) as Record<string, string>, en: flatten(en) as Record<string, string> };

describe('dictionaries', () => {
  it('PL and EN have exactly the same keys, including list lengths and nested groups', () => {
    expect(Object.keys(dicts.en).sort()).toEqual(Object.keys(dicts.pl).sort());
  });

  it('no value is empty', () => {
    for (const [lang, d] of Object.entries(dicts)) for (const [k, v] of Object.entries(d)) expect(typeof v === 'string' && v.trim() !== '', `${lang}.${k}`).toBe(true);
  });

  it('both languages use the same {placeholders}', () => {
    for (const k of Object.keys(dicts.pl)) expect(placeholders(dicts.en[k] ?? ''), `placeholders of ${k}`).toEqual(placeholders(dicts.pl[k]));
  });

  it('every key used via t(\'...\') in src/ exists', () => {
    const sources = import.meta.glob<string>('../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true });
    const used = new Map<string, string>();
    for (const [f, text] of Object.entries(sources)) for (const m of text.matchAll(/(?<![\w.$])t\('([A-Za-z0-9_]+)'/g)) used.set(m[1], f);
    expect(used.size).toBeGreaterThan(100);
    for (const [k, f] of used) expect(k in (pl as object), `${k} (used in ${f})`).toBe(true);
  });
});

/** Every [pl, en] text pair found anywhere inside a content entry (name, description, hint, label, ...). */
function pairs(v: unknown, path: string, out: [string, [string, string]][] = []) {
  if (Array.isArray(v)) {
    if (v.length === 2 && v.every(x => typeof x === 'string')) out.push([path, v as [string, string]]);
    else v.forEach((x, i) => pairs(x, `${path}[${i}]`, out));
  } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) pairs(x, `${path}.${k}`, out);
  return out;
}

describe('content texts', () => {
  const lists: Record<string, { id?: string }[]> = {
    goals: GOALS.map((g, i) => ({ id: String(i), ...g })), achievements: ACHIEVEMENTS, tree: TREE, models: MODELS, materials: [...MATERIALS],
    events: MARKET_EVENTS, calendar: CALENDAR, patents: PATENTS, story: STORY, colors: COLORS.map((c, i) => ({ id: String(i), ...c })),
  };
  for (const [name, list] of Object.entries(lists)) {
    it(`every ${name} entry has non-empty texts in both languages with matching placeholders`, () => {
      expect(list.length).toBeGreaterThan(0);
      let found = 0;
      list.forEach((e, i) => {
        for (const [path, [a, b]] of pairs(e, `${name}[${e.id ?? i}]`)) {
          found++;
          expect(a.trim(), `${path} PL`).not.toBe('');
          expect(b.trim(), `${path} EN`).not.toBe('');
          expect(placeholders(a), `${path} placeholders`).toEqual(placeholders(b));
        }
      });
      expect(found).toBeGreaterThanOrEqual(list.length);
    });
  }

  it('every branch has a name and a subtitle in both languages', () => {
    for (const [i, b] of BRANCHES.entries()) for (const lang of b) { expect(lang, `branch ${i}`).toHaveLength(2); lang.forEach(x => expect(x.trim()).not.toBe('')); }
  });
});
