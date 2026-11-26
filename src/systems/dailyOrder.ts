import { BAL } from '../content/balance';
import { log, sfx, type Ctx } from '../core/ctx';
import { boostMul, rateBase } from '../core/formulas';
import type { GameState } from '../core/state';

/** Order of the day: one special order per calendar day, delivered from stock any time that day.
 *  Days in a row build a streak that raises the pay. The core never reads the clock: the UI reports the local
 *  day number with the `day:<n>` action; a day earlier than the last one seen is ignored (no date-rewind farming). */

const CLIENTS = 7;

export interface DailyOrder { day: number; n: number; pay: number; c: number; done: boolean }

export const dailyUnlocked = (s: GameState) => s.ph === 1 && s.goal >= BAL.dailyFromGoal;
export const streakMul = (streak: number) => 1 + BAL.dailyStreakStep * Math.min(Math.max(streak - 1, 0), BAL.dailyStreakMax - 1);

/** Called when the UI reports today's day number (on start and every minute). Creates today's order once. */
export function newDay(s: GameState, ctx: Ctx, day: number): boolean {
  if (!Number.isInteger(day) || day <= s.dday || !dailyUnlocked(s)) return false;
  // The streak continues only if yesterday's order was delivered.
  if (!(s.dord?.done && s.dord.day === day - 1)) s.dstreak = 0;
  s.dday = day;
  const rate = Math.max(1, rateBase(s) / boostMul(s));
  const n = Math.max(BAL.dailyMinSize, Math.round((rate * BAL.dailySeconds) / 10) * 10);
  const c = Math.floor(ctx.rng() * CLIENTS);
  const streak = s.dstreak + 1;
  s.dord = { day, n, c, done: false, pay: Math.round(n * s.price * BAL.dailyPayMultiplier * streakMul(streak) * 100) / 100 };
  log(s, ctx, 'dNew', '#' + c);
  ctx.emit({ type: 'daily', result: 'offered', streak });
  sfx(ctx, 'alert');
  return true;
}

export function deliverDaily(s: GameState, ctx: Ctx): boolean {
  const o = s.dord;
  if (!o || o.done || o.day !== s.dday || s.ph !== 1 || s.inv < o.n) return false;
  s.inv -= o.n;
  s.zl += o.pay;
  o.done = true;
  s.dstreak += 1;
  s.dbest = Math.max(s.dbest, s.dstreak);
  log(s, ctx, 'dDone', '$' + o.pay, s.dstreak);
  ctx.emit({ type: 'daily', result: 'delivered', streak: s.dstreak });
  sfx(ctx, 'goal');
  return true;
}

export function validDailyState(s: GameState): boolean {
  const int = (v: unknown, min: number) => Number.isInteger(v) && (v as number) >= min;
  if (!int(s.dday, 0) || !int(s.dstreak, 0) || !int(s.dbest, 0) || s.dstreak > s.dbest + 1) return false;
  if (s.dord === null) return true;
  const o = s.dord;
  return !!o && int(o.day, 0) && o.day <= s.dday && int(o.n, 1) && int(o.c, 0) && o.c < CLIENTS &&
    typeof o.done === 'boolean' && typeof o.pay === 'number' && Number.isFinite(o.pay) && o.pay > 0;
}
