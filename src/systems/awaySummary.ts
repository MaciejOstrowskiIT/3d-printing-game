import type { GameState } from '../core/state';

/** What happened while the player was away. Plain data, built by `catchUp`, rendered by the away dialog.
 *  Orders, market events, story messages and breakdowns do not happen offline (see their systems), so they are not
 *  counted here: the dialog just says they waited. */
export interface AwaySummary {
  /** Seconds the player was away. */
  away: number;
  /** Seconds actually simulated (capped by the offline limit). */
  simulated: number;
  capped: boolean;
  /** Phase after the catch-up: 1 = money and sales, 2 = space. */
  ph: 1 | 2;
  /** Figurines of work printed (or produced in space). */
  made: number;
  /** Figurine pieces sold in phase 1. */
  sold: number;
  /** Money earned by sales while away. */
  revenue: number;
  /** Change in funds, after filament and other spending. */
  net: number;
  /** Filament used, in grams. */
  filament: number;
  /** Seconds printers stood idle without filament (0 when under the reporting threshold). */
  idle: number;
}

export interface AwayInput {
  seconds: number; elapsed: number;
  before: { total: number; sold: number; zl: number };
  revenue: number; filament: number; idle: number;
}

export function buildAwaySummary(s: GameState, i: AwayInput): AwaySummary {
  return {
    away: i.seconds,
    simulated: i.elapsed,
    capped: i.elapsed < i.seconds,
    ph: s.ph,
    made: Math.floor(s.total - i.before.total),
    sold: s.goal >= 1 ? s.sold - i.before.sold : 0,
    revenue: s.ph === 1 ? Math.round(i.revenue) : 0,
    net: s.ph === 1 ? Math.round(s.zl - i.before.zl) : 0,
    filament: Math.round(i.filament),
    idle: Math.round(i.idle),
  };
}
