import { BAL } from '../content/balance';
import { HINTS, type HintId } from '../content/hints';
import type { Ctx } from '../core/ctx';
import type { GameState } from '../core/state';

export interface HintProgress { seen: HintId[]; active: HintId | null; retired: boolean }

export function hintsSystem(s: GameState, _dt: number, ctx: Ctx) {
  if (ctx.offline) return;
  const { hints } = s;
  if (hints.retired || s.end || s.ph !== 1 || s.meta.runs > 0 || s.play >= BAL.onboardingSeconds * BAL.pace) {
    hints.active = null;
    return;
  }
  if (HINTS.find(hint => hint.id === hints.active)?.when(s)) return;
  const next = HINTS.find(hint => !hints.seen.includes(hint.id) && hint.when(s));
  hints.active = next?.id ?? null;
  if (next) hints.seen.push(next.id);
}

export function dismissHint(s: GameState): boolean {
  if (s.hints.active === null) return false;
  s.hints.active = null;
  return true;
}

export function validHints(hints: HintProgress): boolean {
  return !!hints && typeof hints.retired === 'boolean' && Array.isArray(hints.seen) &&
    new Set(hints.seen).size === hints.seen.length &&
    hints.seen.every(id => HINTS.some(hint => hint.id === id)) &&
    (hints.active === null || hints.seen.includes(hints.active));
}
