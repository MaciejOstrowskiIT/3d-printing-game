import { BAL } from '../content/balance';
import { log, pick, sfx, type Ctx } from '../core/ctx';
import { has, type GameState } from '../core/state';

const CAUSES = 5;

export function repair(s: GameState, ctx: Ctx) {
  if (s.brk <= 0) return;
  s.brk = 0;
  s.brkT = pick(ctx, BAL.breakdownEvery);
  log(s, ctx, 'fix');
}

export function breakdownsSystem(s: GameState, dt: number, ctx: Ctx) {
  if (s.ph !== 1 || ctx.offline || s.auto < 3) return;
  if (s.brk === 0) {
    s.brkT -= dt;
    if (s.brkT <= 0) {
      s.brk = Math.round(pick(ctx, BAL.breakdownShare) * 100) / 100;
      s.brkC = Math.floor(ctx.rng() * CAUSES);
      s.fails++;
      s.fixT = BAL.cameraFix;
      log(s, ctx, 'brk', '%' + s.brkC);
      sfx(ctx, 'alert');
    }
  } else if (s.amOn.kamera && has(s, 'kamera')) {
    s.fixT -= dt;
    if (s.fixT <= 0) repair(s, ctx);
  }
}
