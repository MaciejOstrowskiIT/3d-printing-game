import { log, type Ctx } from '../core/ctx';
import { eff } from '../core/formulas';
import type { GameState } from '../core/state';

/** Warns once when farms lack power, and re-arms when supply recovers. */
export function energySystem(s: GameState, _dt: number, ctx: Ctx) {
  if (s.ph !== 1) return;
  if (s.farmOn && eff(s) < 1 && !s.pwWarn) { s.pwWarn = true; log(s, ctx, 'noPow'); }
  else if (eff(s) >= 1) s.pwWarn = false;
}
