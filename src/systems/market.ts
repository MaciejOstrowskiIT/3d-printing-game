import { BAL } from '../content/balance';
import { COLORS } from '../content/colors';
import { log, pick, rnd, sfx, type Ctx } from '../core/ctx';
import { trendOn } from '../core/formulas';
import type { GameState } from '../core/state';

/** Filament price jumps every ~10 s and drifts back to base. The trending colour changes every few minutes. */
export function marketSystem(s: GameState, dt: number, ctx: Ctx) {
  if (s.ph !== 1) return;

  s.spoolT -= dt;
  if (s.spoolT <= 0) {
    const old = s.spool;
    const next = s.spool * (1 + rnd(ctx, -BAL.spoolStep, BAL.spoolStep)) + (BAL.spoolBasePrice - s.spool) * 0.08;
    s.spool = Math.min(BAL.spoolMax, Math.max(BAL.spoolMin, next));
    s.spoolD = s.spool / old - 1;
    s.spoolT = pick(ctx, BAL.spoolEvery);
  }

  if (trendOn(s)) {
    s.trendT -= dt;
    if (s.trendT <= 0) {
      // Any colour except the current trend, without a retry loop (a fixed rng would spin forever).
      const n = (s.trend + 1 + Math.floor(ctx.rng() * (COLORS.length - 1))) % COLORS.length;
      s.trend = n;
      s.trendT = pick(ctx, BAL.trendEvery);
      log(s, ctx, 'trend', '&' + n);
      if (s.col !== n) sfx(ctx, 'alert');
    }
  }
}

export function setColor(s: GameState, i: number) {
  if (i >= 0 && i < COLORS.length) s.col = i;
}
