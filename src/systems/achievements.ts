import { ACHIEVEMENTS } from '../content/achievements';
import { log, sfx, type Ctx } from '../core/ctx';
import type { GameState } from '../core/state';

/** Checks achievements twice a second and unlocks the ones whose condition holds. */
export function achievementsSystem(s: GameState, dt: number, ctx: Ctx) {
  s.colorsUsed |= 1 << s.col;
  s.achT += dt;
  if (s.achT < 0.5) return;
  s.achT = 0;
  for (const a of ACHIEVEMENTS) {
    if (s.ach.includes(a.id) || !a.check(s)) continue;
    s.ach.push(a.id);
    log(s, ctx, 'ach', '!' + a.id);
    if (!ctx.offline) ctx.emit({ type: 'achievement', id: a.id });
    sfx(ctx, 'goal');
  }
}
