import { BAL } from '../content/balance';
import { log, sfx, type Ctx } from '../core/ctx';
import type { GameState } from '../core/state';

/** The boost can be offered once the player has automated production. */
export const boostUnlocked = (s: GameState) => s.ph === 2 || s.goal >= 3;
export const boostReady = (s: GameState) => boostUnlocked(s) && s.boostT <= 0 && s.boostCd <= 0;

/** Grants the reward. Called only after the platform reports a completed rewarded ad. */
export function activateBoost(s: GameState, ctx: Ctx): boolean {
  if (!boostReady(s)) return false;
  s.boostT = BAL.boostSeconds;
  s.boostCd = BAL.boostCooldown;
  log(s, ctx, 'boostOn');
  sfx(ctx, 'goal');
  return true;
}

export function boostSystem(s: GameState, dt: number) {
  if (s.boostT > 0) s.boostT = Math.max(0, s.boostT - dt);
  if (s.boostCd > 0) s.boostCd = Math.max(0, s.boostCd - dt);
}
