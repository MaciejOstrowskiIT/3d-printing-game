import { BAL } from '../content/balance';
import { log, type Ctx } from '../core/ctx';
import { eff, opsCap } from '../core/formulas';
import type { GameState } from '../core/state';

/** Quantum computer: bought once with compute (ops), then upgraded with compute too. It makes quantum points (QP),
 *  which advanced research (the Quantum branch, a later card) will spend. It draws power from the same supply as the farms
 *  and runs slower when power is short. It starts over with a new production line, like compute itself. */

export const quantumLevelMax = BAL.quantumMaxLevel;

/** Compute for the next qubit level, or Infinity at the maximum. */
export const quantumUpgradeCost = (s: GameState) =>
  s.qLvl >= BAL.quantumMaxLevel ? Infinity : Math.round(BAL.quantumUpgradeBase * BAL.quantumUpgradeGrowth ** (s.qLvl - 1));

/** QP per second: level × base rate, scaled by power in phase 1 (space has no power model). */
export const qpRate = (s: GameState) => (s.qOn ? s.qLvl * BAL.quantumQpPerSecond * (s.ph === 1 ? eff(s) : 1) : 0);

/** Worth showing the machine: bought, or memory is within reach of its price. */
export const quantumVisible = (s: GameState) => s.qOn || opsCap(s) >= BAL.quantumCost * 0.5;

export function quantumSystem(s: GameState, dt: number) {
  if (s.qOn) s.qp += qpRate(s) * dt;
}

export function buyQuantum(s: GameState, ctx: Ctx): boolean {
  if (s.qOn || s.ops < BAL.quantumCost) return false;
  s.ops -= BAL.quantumCost;
  s.qOn = true;
  s.qLvl = 1;
  log(s, ctx, 'qBought');
  return true;
}

export function upgradeQuantum(s: GameState, ctx: Ctx): boolean {
  const cost = quantumUpgradeCost(s);
  if (!s.qOn || s.ops < cost) return false;
  s.ops -= cost;
  s.qLvl++;
  log(s, ctx, 'qUpgraded', s.qLvl);
  return true;
}
