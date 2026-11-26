import { BAL } from '../content/balance';
import type { GameState } from '../core/state';

export const qualityUnlocked = (s: GameState) => s.ph === 1 && s.goal >= BAL.qualityUnlockGoal;

/** Add ordinary or premium work to the sale inventory, preserving the value of existing stock. */
export function stockPrints(s: GameState, count: number, premium = 0) {
  if (count <= 0) return;
  if (s.ph === 1) {
    s.stockPremium = (s.inv * s.stockPremium + count * premium) / (s.inv + count);
  }
  s.inv += count;
}

export function setQualityAction(s: GameState, action: 'calibrate' | 'dryer' | 'precision') {
  if (!qualityUnlocked(s)) return false;
  if (action === 'precision') {
    s.precision = !s.precision;
    return true;
  }
  const upgrade = action === 'calibrate' ? 'bedCalibrated' : 'dryerInstalled';
  const cost = action === 'calibrate' ? BAL.bedCalibrationCost : BAL.filamentDryerCost;
  if (s[upgrade] || s.zl < cost) return false;
  s.zl -= cost;
  s[upgrade] = true;
  return true;
}
