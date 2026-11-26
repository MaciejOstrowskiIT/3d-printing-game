import { bookCash } from './workshopStats';
import { BAL } from '../content/balance';
import { log, type Ctx } from '../core/ctx';
import type { GameState } from '../core/state';

/** Rewarded "double offline earnings": after a long enough absence, what the shop earned while away
 *  (sales revenue in phase 1, figurines in phase 2) can be doubled once by watching an ad.
 *  The amount lives in the state, so the UI cannot choose it and the save validator can check it. */

export const offlineBonusReady = (s: GameState) => s.offBT > 0 && (s.offB > 0 || s.offBi > 0);

/** Called by catchUp with what the absence produced. Repeated catch-ups before claiming add up. */
export function grantOfflineBonus(s: GameState, seconds: number, revenue: number, figurines: number) {
  if (seconds < BAL.offlineBonusMinSeconds || s.end) return;
  const zl = s.ph === 1 ? Math.max(0, Math.floor(revenue * BAL.offlineBonusMult)) : 0;
  const fig = s.ph === 2 ? Math.max(0, Math.floor(figurines * BAL.offlineBonusMult)) : 0;
  if (!zl && !fig) return;
  if (s.offBT <= 0) { s.offB = 0; s.offBi = 0; }
  s.offB += zl;
  s.offBi += fig;
  s.offBT = BAL.offlineBonusClaimSeconds;
}

export function claimOfflineBonus(s: GameState, ctx: Ctx): boolean {
  if (!offlineBonusReady(s)) return false;
  bookCash(s, 'bonus', s.offB);
  s.inv += s.offBi;
  if (s.offB) log(s, ctx, 'offx2', '$' + s.offB);
  else log(s, ctx, 'offx2f', Math.round(s.offBi));
  s.offB = 0; s.offBi = 0; s.offBT = 0;
  return true;
}

/** The offer expires after offlineBonusClaimSeconds of play. */
export function offlineBonusSystem(s: GameState, dt: number, ctx: Ctx) {
  if (ctx.offline || s.offBT <= 0) return;
  s.offBT = Math.max(0, s.offBT - dt);
  if (s.offBT === 0) { s.offB = 0; s.offBi = 0; }
}

export function validOfflineBonus(s: GameState): boolean {
  const ok = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  return ok(s.offB) && ok(s.offBi) && ok(s.offBT) && s.offBT <= BAL.offlineBonusClaimSeconds;
}
