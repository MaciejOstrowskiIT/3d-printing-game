import { BAL } from '../content/balance';
import { MARKET_EVENT } from '../content/events';
import { DEFAULT_MODEL, MODEL, type PrintModel } from '../content/models';
import { patLvl, type GameState } from './state';

/** Pure formulas derived from state. No side effects: used by core, UI and tests. */

export const autoCost = (s: GameState) => BAL.printerCost * BAL.printerCostGrowth ** s.auto;
export const farmCost = (s: GameState) => BAL.farmCost * BAL.farmCostGrowth ** s.farm;
export const panelCost = (s: GameState) => BAL.panelCost * BAL.panelCostGrowth ** s.panels;
export const mktCost = (s: GameState) => BAL.marketingCost * BAL.marketingCostGrowth ** (s.mkt - 1);
/** Product of a multiplier over running market effects, clamped so stacked events cannot break the economy. */
export function marketMul(s: GameState, key: 'demand' | 'spool') {
  let m = 1;
  for (const fx of s.mfx ?? []) m *= MARKET_EVENT[fx.id]?.[key] ?? 1;
  return Math.min(BAL.marketMulRange[1], Math.max(BAL.marketMulRange[0], m));
}

export const spoolPrice = (s: GameState) => (s.spoolG > 1000 ? s.spool * 5 * BAL.bulkPackDiscount : s.spool) * marketMul(s, 'spool');
/** Selected print model (falls back to the figurine for unknown ids). */
export const model = (s: GameState): PrintModel => MODEL[s.mdl] ?? DEFAULT_MODEL;
/** Filament per figurine of work: base nozzle consumption × the model's material factor. */
export const gpu = (s: GameState) => s.g * model(s).material;
/** Market size of a model in figurines/s at the same price per figurine (see content/models.ts). */
export const modelDemand = (m: PrintModel) => m.value ** BAL.demandElasticity * m.market * m.seconds;
/** Figurines of work added by one click. */
export const clickPower = (s: GameState) => BAL.clickWork * (1 + BAL.clickStep * s.clk);
export const clickCost = (s: GameState) => BAL.clickCost * BAL.clickGrowth ** s.clk;
export const unitCost = (s: GameState) => (spoolPrice(s) / s.spoolG) * gpu(s);
export const droneCost = (s: GameState) => BAL.droneCost * BAL.droneCostGrowth ** s.drones;
export const fabCost = (s: GameState) => BAL.fabCost * BAL.fabCostGrowth ** s.fabs;

export const supply = (s: GameState) => BAL.garagePower + s.panels * BAL.panelPower;
export const drawP = (s: GameState) => s.farm * BAL.farmDraw;
export const eff = (s: GameState) => (drawP(s) ? Math.min(1, supply(s) / drawP(s)) : 1);

export const trendOn = (s: GameState) => s.goal >= 2;
export const inTrend = (s: GameState) => trendOn(s) && s.col === s.trend;

export const demand = (s: GameState) =>
  BAL.demandBase *
  Math.pow(5 / s.price, BAL.demandElasticity) *
  BAL.marketingGrowth ** (s.mkt - 1) *
  s.dem *
  (s.pen > 0 ? BAL.penaltyDemand : 1) *
  (inTrend(s) ? BAL.trendBonus : 1) *
  (1 + 0.15 * patLvl(s, 'brand')) *
  marketMul(s, 'demand') *
  modelDemand(model(s));

export const boostMul = (s: GameState) => (s.boostT > 0 ? BAL.boostMultiplier : 1);
export const rateBase = (s: GameState) => (s.auto + s.farm * BAL.farmPrinters * eff(s)) * s.spd * boostMul(s) * (1 + 0.15 * patLvl(s, 'speed'));
export const rate1 = (s: GameState) => rateBase(s) * (1 - s.brk);

const repBase = (s: GameState) => BAL.repThreshold * 0.9 ** patLvl(s, 'fame');
export const repNext = (s: GameState) => repBase(s) * (s.rep + 1) ** 2;
export const repPrev = (s: GameState) => (s.rep ? repBase(s) * s.rep ** 2 : 0);
export const freePts = (s: GameState) => s.rep - (s.proc + s.mem - 2);
export const opsCap = (s: GameState) => s.mem * BAL.opsPerMemory;
export const opsRate = (s: GameState) => s.proc * BAL.opsPerProcessor * (1 + 0.25 * patLvl(s, 'compute'));

const patSpeed = (s: GameState) => 1 + 0.15 * patLvl(s, 'speed');
export const mining = (s: GameState) => s.drones * BAL.droneMining * s.dMul * boostMul(s) * patSpeed(s);
export const fabCap = (s: GameState) => s.fabs * BAL.fabThroughput * s.fMul * boostMul(s) * patSpeed(s);
export const spaceRate = (s: GameState) => Math.min(mining(s), fabCap(s)) * BAL.figurinesPerTon;
