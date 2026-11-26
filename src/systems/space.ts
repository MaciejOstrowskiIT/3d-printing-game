import { BAL } from '../content/balance';
import type { Ctx } from '../core/ctx';
import { droneCost, fabCap, fabCost, mining } from '../core/formulas';
import type { GameState } from '../core/state';
import { make } from './production';

export function spaceSystem(s: GameState, dt: number, ctx: Ctx) {
  if (s.ph !== 2 || s.end) return;
  const mined = Math.min(s.mat, mining(s) * dt);
  s.mat -= mined;
  s.ft += mined;
  const used = Math.min(s.ft, fabCap(s) * dt);
  s.ft -= used;
  make(s, ctx, used * BAL.figurinesPerTon);
  if (s.mat <= 1e-6 && s.ft <= 1e-6) {
    s.mat = 0;
    s.ft = 0;
    s.end = true;
    ctx.emit({ type: 'end' });
  }
}

export function buyDrone(s: GameState) {
  const c = droneCost(s);
  if (s.inv < c) return false;
  s.inv -= c;
  s.drones++;
  return true;
}

export function buyFab(s: GameState) {
  const c = fabCost(s);
  if (s.inv < c) return false;
  s.inv -= c;
  s.fabs++;
  return true;
}
