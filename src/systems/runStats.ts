import { MODEL } from '../content/models';
import type { GameState } from '../core/state';

/* Run statistics kept for the end screen and the run summary (systems/runSummary.ts reads them). */

/** Stores the line play time at which the current goal was reached. Goals reached before this was tracked stay at -1. */
export function recordGoal(s: GameState) {
  while (s.goalAt.length < s.goal) s.goalAt.push(-1);
  if (s.goalAt.length === s.goal) s.goalAt.push(Math.round(s.play));
}

/** Adds incoming money to the run totals; called from bookCash for sales, orders and bonuses. */
export function recordEarning(s: GameState, amount: number, modelId?: string) {
  if (!(amount > 0)) return;
  s.runEarned += amount;
  if (modelId && Object.hasOwn(MODEL, modelId)) s.modelRev[modelId] = (s.modelRev[modelId] ?? 0) + amount;
}

export function validRunStats(s: GameState) {
  const amount = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  if (!amount(s.runEarned)) return false;
  if (!s.modelRev || typeof s.modelRev !== 'object' || Array.isArray(s.modelRev) ||
      !Object.entries(s.modelRev).every(([id, n]) => Object.hasOwn(MODEL, id) && amount(n))) return false;
  return Array.isArray(s.goalAt) && s.goalAt.length <= s.goal &&
    s.goalAt.every(n => typeof n === 'number' && Number.isFinite(n) && n >= -1);
}
