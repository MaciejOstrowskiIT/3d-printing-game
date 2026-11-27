import { BAL } from '../content/balance';
import type { Ctx } from '../core/ctx';
import type { GameState } from '../core/state';
import { repair } from './breakdowns';
import { completeOrder } from './orders';

/** Rewarded placements next to Overtime (systems/boost.ts): "Instant delivery" for the accepted special order and
 *  "Skip breakdown". Each has its own cooldown in the save. Cooldowns count game time (ticks and verified offline
 *  catch-up), never the device clock, so changing the clock does not shorten them. The actions run only after the
 *  platform reports a completed rewarded ad. */

export const orderAdReady = (s: GameState) => s.ph === 1 && !!s.ord?.acc && s.adCd.order <= 0;
export const repairAdReady = (s: GameState) => s.ph === 1 && s.brk > 0 && s.adCd.repair <= 0;

/** Finishes the accepted order at once and pays it. */
export function instantDelivery(s: GameState, ctx: Ctx): boolean {
  if (!orderAdReady(s)) return false;
  completeOrder(s, ctx);
  s.adCd.order = BAL.adOrderCooldown;
  return true;
}

/** Repairs every printer at once. */
export function skipBreakdown(s: GameState, ctx: Ctx): boolean {
  if (!repairAdReady(s)) return false;
  repair(s, ctx);
  s.adCd.repair = BAL.adRepairCooldown;
  return true;
}

export function rewardedSystem(s: GameState, dt: number) {
  s.adCd.order = Math.max(0, s.adCd.order - dt);
  s.adCd.repair = Math.max(0, s.adCd.repair - dt);
}

/** Save validation: both cooldowns are numbers within what the game can set. */
export function validRewarded(s: GameState): boolean {
  const c = s.adCd as unknown;
  if (!c || typeof c !== 'object' || Array.isArray(c)) return false;
  const { order, repair } = c as Record<string, unknown>;
  const ok = (v: unknown, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;
  return ok(order, BAL.adOrderCooldown) && ok(repair, BAL.adRepairCooldown);
}
