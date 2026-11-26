import { BAL } from '../content/balance';
import type { GameState } from './state';

/** Pure formulas derived from state. No side effects: used by core, UI and tests. */

export const autoCost = (s: GameState) => BAL.printerCost * BAL.printerCostGrowth ** s.auto;
export const farmCost = (s: GameState) => BAL.farmCost * BAL.farmCostGrowth ** s.farm;
export const panelCost = (s: GameState) => BAL.panelCost * BAL.panelCostGrowth ** s.panels;
export const mktCost = (s: GameState) => BAL.marketingCost * BAL.marketingCostGrowth ** (s.mkt - 1);
export const spoolPrice = (s: GameState) => (s.spoolG > 1000 ? s.spool * 5 * BAL.bulkPackDiscount : s.spool);
export const unitCost = (s: GameState) => (spoolPrice(s) / s.spoolG) * s.g;
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
  (inTrend(s) ? BAL.trendBonus : 1);

export const rateBase = (s: GameState) => (s.auto + s.farm * BAL.farmPrinters * eff(s)) * s.spd;
export const rate1 = (s: GameState) => rateBase(s) * (1 - s.brk);

export const repNext = (s: GameState) => BAL.repThreshold * (s.rep + 1) ** 2;
export const repPrev = (s: GameState) => (s.rep ? BAL.repThreshold * s.rep ** 2 : 0);
export const freePts = (s: GameState) => s.rep - (s.proc + s.mem - 2);
export const opsCap = (s: GameState) => s.mem * BAL.opsPerMemory;
export const opsRate = (s: GameState) => s.proc * BAL.opsPerProcessor;

export const mining = (s: GameState) => s.drones * BAL.droneMining * s.dMul;
export const fabCap = (s: GameState) => s.fabs * BAL.fabThroughput * s.fMul;
export const spaceRate = (s: GameState) => Math.min(mining(s), fabCap(s)) * BAL.figurinesPerTon;
