/** Calendar events: real dates that move the market (Christmas rush, Halloween, Black Week…). Pure data.
 *
 *  To add one: append an entry with `active(date)` and its effects. The game learns the local date from the UI
 *  (the `day:<n>` action, see systems/dailyOrder.ts), so these switch on and off by themselves; no state is stored.
 *  tests/calendar.test.ts checks every entry (texts, multipliers in range, active on at least one day a year). */

export type Pair = [pl: string, en: string];

/** A local calendar date. Month 1–12, day 1–31, weekday 0 = Sunday. */
export interface CalDate { y: number; m: number; d: number; wd: number }

export interface CalendarEvent {
  id: string;
  name: Pair;
  desc: Pair;
  active: (date: CalDate) => boolean;
  /** Demand multiplier for everything. */
  demand?: number;
  /** Extra demand multiplier when printing one of these models. */
  models?: Record<string, number>;
  /** Extra demand multiplier when printing in one of these filament colours (indices into content/colors.ts). */
  colors?: number[];
  colorMul?: number;
}

/** Inclusive range within one year, e.g. range(12, 1, 12, 24). */
const range = (m1: number, d1: number, m2: number, d2: number) => ({ m, d }: CalDate) => {
  const x = m * 100 + d;
  return x >= m1 * 100 + d1 && x <= m2 * 100 + d2;
};

/** Black Week: Monday before Black Friday (the 4th Friday of November) to Cyber Monday. */
function blackWeek({ y, m, d }: CalDate) {
  const firstFriday = 1 + ((5 - new Date(Date.UTC(y, 10, 1)).getUTCDay() + 7) % 7);
  const friday = firstFriday + 21;
  const at = m === 11 ? d : m === 12 ? 30 + d : -99;
  return at >= friday - 4 && at <= friday + 3;
}

export const CALENDAR: CalendarEvent[] = [
  {
    id: 'blackweek', active: blackWeek, demand: 1.5,
    name: ['Black Week', 'Black Week'],
    desc: ['Tydzień promocji: popyt ×1,5.', 'A week of deals: demand ×1.5.'],
  },
  {
    id: 'xmas', active: range(12, 1, 12, 23), demand: 1.4, colors: [2, 4, 5], colorMul: 1.25,
    name: ['Gorączka świąteczna', 'Christmas rush'],
    desc: ['Prezenty pod choinkę: popyt ×1,4, a czerwone, zielone i złote figurki ×1,25.', 'Presents for under the tree: demand ×1.4; red, green and gold figurines ×1.25.'],
  },
  {
    id: 'valentine', active: range(2, 7, 2, 14), colors: [2], colorMul: 1.5,
    name: ['Walentynki', 'Valentine’s week'],
    desc: ['Czerwone figurki schodzą ×1,5.', 'Red figurines sell ×1.5.'],
  },
  {
    id: 'kidsday', active: range(5, 25, 6, 1), models: { fig: 1.5, keychain: 1.3 },
    name: ['Dzień Dziecka', 'Children’s Day'],
    desc: ['Figurki ×1,5, breloki ×1,3.', 'Figurines ×1.5, keychains ×1.3.'],
  },
  {
    id: 'school', active: range(8, 25, 9, 10), models: { keychain: 1.6 },
    name: ['Powrót do szkoły', 'Back to school'],
    desc: ['Breloki do plecaków: ×1,6.', 'Keychains for backpacks: ×1.6.'],
  },
  {
    id: 'halloween', active: range(10, 20, 10, 31), models: { helmet: 2, bust: 1.4 }, colors: [1], colorMul: 1.3,
    name: ['Halloween', 'Halloween'],
    desc: ['Hełmy i maski ×2, popiersia ×1,4, czarne wydruki ×1,3.', 'Helmets and masks ×2, busts ×1.4, black prints ×1.3.'],
  },
  {
    id: 'springGardening', active: range(3, 18, 3, 31), models: { planter: 1.6 }, colors: [4], colorMul: 1.2,
    name: ['Wiosenne sadzenie', 'Spring planting'],
    desc: ['Doniczki ×1,6, zielone wydruki ×1,2.', 'Planters ×1.6, green prints ×1.2.'],
  },
  {
    id: 'moonLanding', active: range(7, 16, 7, 24), models: { lunarBase: 1.6, mechanicalOrrery: 1.4 },
    name: ['Rocznica lądowania na Księżycu', 'Moon landing anniversary'],
    desc: ['Bazy księżycowe ×1,6, mechaniczne układy planet ×1,4.', 'Moon bases ×1.6, mechanical orreries ×1.4.'],
  },
  {
    id: 'deskReset', active: range(1, 2, 1, 12), models: { cableComb: 1.5 },
    name: ['Noworoczne porządki', 'New Year desk reset'],
    desc: ['Czas uporządkować biurko. Popyt na grzebienie do kabli ×1,5.', 'Time to tidy the desk. Demand for cable combs ×1.5.'],
  },
];

export const CALENDAR_EVENT: Record<string, CalendarEvent> = Object.fromEntries(CALENDAR.map(e => [e.id, e]));

/** The local date for a day number (days since 1970-01-01 in local time, as the UI reports it). */
export function dayToDate(day: number): CalDate {
  const t = new Date(day * 86_400_000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), wd: t.getUTCDay() };
}

/** Calendar events running on a given day number (0 = unknown date: none). */
export const calendarOn = (day: number): CalendarEvent[] => (day > 0 ? CALENDAR.filter(e => e.active(dayToDate(day))) : []);
