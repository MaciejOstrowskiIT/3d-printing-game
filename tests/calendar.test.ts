import { describe, expect, it } from 'vitest';
import { CALENDAR, calendarOn, dayToDate } from '../src/content/calendar';
import { COLORS } from '../src/content/colors';
import { MODEL } from '../src/content/models';
import { calendarMul, demand } from '../src/core/formulas';
import { createGame } from '../src/core/game';
import { createState } from '../src/core/state';

/** Day number of a date, the way the UI reports it (days since 1970-01-01, local). */
const dayOf = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d) / 86_400_000;
const ids = (y: number, m: number, d: number) => calendarOn(dayOf(y, m, d)).map(e => e.id);

describe('calendar registry', () => {
  it.each(CALENDAR.map(e => [e.id, e] as const))('%s is well formed', (_, e) => {
    for (const pair of [e.name, e.desc]) { expect(pair).toHaveLength(2); pair.forEach(x => expect(x.trim()).not.toBe('')); }
    for (const v of [e.demand, e.colorMul, ...Object.values(e.models ?? {})]) if (v !== undefined) { expect(v).toBeGreaterThan(0); expect(v).toBeLessThanOrEqual(3); }
    Object.keys(e.models ?? {}).forEach(id => expect(MODEL[id]).toBeDefined());
    (e.colors ?? []).forEach(c => expect(c).toBeLessThan(COLORS.length));
    let days = 0;
    for (let d = dayOf(2026, 1, 1); d < dayOf(2027, 1, 1); d++) if (e.active(dayToDate(d))) days++;
    expect(days).toBeGreaterThan(0);
    expect(days).toBeLessThanOrEqual(31);
  });

  it('dates round-trip', () => {
    expect(dayToDate(dayOf(2026, 11, 27))).toEqual({ y: 2026, m: 11, d: 27, wd: 5 });
  });
});

describe('calendar events', () => {
  it('Black Week runs from the Monday before Black Friday to Cyber Monday', () => {
    expect(ids(2026, 11, 22)).not.toContain('blackweek');
    expect(ids(2026, 11, 23)).toContain('blackweek');
    expect(ids(2026, 11, 27)).toContain('blackweek'); // Black Friday 2026
    expect(ids(2026, 11, 30)).toContain('blackweek');
    expect(ids(2026, 12, 1)).not.toContain('blackweek');
    expect(ids(2025, 12, 1)).toContain('blackweek'); // Cyber Monday 2025
  });

  it('move demand, by model and colour too', () => {
    const s = { ...createState(), today: dayOf(2026, 11, 27) };
    expect(demand(s)).toBeCloseTo(demand({ ...s, today: dayOf(2026, 3, 3) }) * 1.5);
    const halloween = { ...createState(), today: dayOf(2026, 10, 30), mdls: ['fig', 'helmet'], mdl: 'helmet', col: 1 };
    expect(calendarMul(halloween)).toBeCloseTo(2 * 1.3);
    expect(calendarMul({ ...halloween, mdl: 'fig', col: 0 })).toBe(1);
    expect(calendarMul({ ...createState(), today: 0 })).toBe(1);
  });

  it('are announced once when they start', () => {
    const g = createGame({ state: { ...createState(), goal: 1 } });
    g.act(`day:${dayOf(2026, 11, 22)}`);
    g.act(`day:${dayOf(2026, 11, 23)}`);
    g.act(`day:${dayOf(2026, 11, 24)}`);
    expect(g.s.log.filter(l => l.k === 'calOn')).toHaveLength(1);
  });

  it('the order of the day still comes on the day it unlocks', () => {
    const g = createGame({ state: { ...createState(), goal: 1, inv: 1e5 } });
    const day = dayOf(2026, 11, 26);
    expect(g.act(`day:${day}`)).toBe(false); // not unlocked yet, but the date is known
    expect(g.s.today).toBe(day);
    g.s.goal = 5;
    expect(g.act(`day:${day}`)).toBe(true);
    expect(g.s.dord?.day).toBe(day);
  });
});
