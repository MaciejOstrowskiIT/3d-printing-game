import { BAL } from '../content/balance';
import { log, pick, sfx, type Ctx } from '../core/ctx';
import { has, type GameState } from '../core/state';
import { mod } from '../core/mods';

const BED_ADHESION = 1;
const SPAGHETTI = 5;
const WET_FILAMENT = 6;
const BASE_CAUSES = 5;

/** Seconds until the next breakdown: research, a realistic line and hired technicians change how often they come. */
const nextBreakdown = (s: GameState, ctx: Ctx) =>
  pick(ctx, BAL.breakdownEvery) / (mod(s, 'breakdown') * ((s.slow || 1) > 1 ? BAL.realisticBreakdownMul : 1) * technicianMul(s));

/** Breakdown frequency multiplier of the hired technicians (industrial printers, systems/printerTypes.ts). */
export const technicianMul = (s: GameState) => BAL.technicianBreakdown ** (s.techs?.length ?? 0);

export function repair(s: GameState, ctx: Ctx) {
  if (s.brk <= 0) return;
  s.brk = 0;
  s.brkT = nextBreakdown(s, ctx);
  log(s, ctx, 'fix');
}

export function breakdownsSystem(s: GameState, dt: number, ctx: Ctx) {
  if (s.ph !== 1 || ctx.offline || s.auto < 3) return;
  if (s.brk === 0) {
    s.brkT -= dt;
    if (s.brkT <= 0) {
      const share = Math.round(pick(ctx, BAL.breakdownShare) * 100) / 100;
      const causeCount = s.goal >= BAL.qualityUnlockGoal ? WET_FILAMENT + 1 : BASE_CAUSES;
      const cause = Math.floor(ctx.rng() * causeCount);
      if ((s.bedCalibrated && (cause === BED_ADHESION || cause === SPAGHETTI)) ||
          (s.dryerInstalled && cause === WET_FILAMENT)) {
        s.brkT = nextBreakdown(s, ctx);
        return;
      }
      s.brk = share;
      s.brkC = cause;
      s.fails++;
      s.fixT = BAL.cameraFix * mod(s, 'repair');
      log(s, ctx, 'brk', '%' + s.brkC);
      sfx(ctx, 'alert');
    }
  } else if (s.amOn.kamera && has(s, 'kamera')) {
    s.fixT -= dt;
    if (s.fixT <= 0) repair(s, ctx);
  }
}
