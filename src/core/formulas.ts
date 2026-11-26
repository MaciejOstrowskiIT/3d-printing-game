import { premiumFor, stockPrice, piecesInStock } from '../systems/inventory';
import { BAL } from '../content/balance';
import { mod } from './mods';
import { DEFAULT_MATERIAL, MATERIAL, materialDemand } from '../content/materials';
import { MARKET_EVENT } from '../content/events';
import { calendarOn } from '../content/calendar';
import { DEFAULT_MODEL, MODEL, type PrintModel } from '../content/models';
import { patLvl, type GameState } from './state';

/** Pure formulas derived from state. No side effects: used by core, UI and tests. */

export const autoCost = (s: GameState) => BAL.printerCost * BAL.printerCostGrowth ** s.auto * mod(s, 'printerCost');
export const farmCost = (s: GameState) => BAL.farmCost * BAL.farmCostGrowth ** s.farm * mod(s, 'farmCost');
export const panelCost = (s: GameState) => BAL.panelCost * BAL.panelCostGrowth ** s.panels;
export const mktCost = (s: GameState) => BAL.marketingCost * BAL.marketingCostGrowth ** (s.mkt - 1) * mod(s, 'marketingCost');
/** Product of a multiplier over running market effects, clamped so stacked events cannot break the economy. */
export function marketMul(s: GameState, key: 'demand' | 'spool', modelId = s.mdl) {
  let m = 1;
  for (const fx of s.mfx ?? []) m *= MARKET_EVENT[fx.id]?.[key] ?? 1;
  if (key === 'demand') m *= calendarMul(s, modelId);
  return Math.min(BAL.marketMulRange[1], Math.max(BAL.marketMulRange[0], m));
}

/** Demand multiplier from calendar events running today (content/calendar.ts), for the selected model and colour. */
export function calendarMul(s: GameState, modelId = s.mdl) {
  let m = 1;
  for (const e of calendarOn(s.today ?? 0)) {
    m *= e.demand ?? 1;
    m *= e.models?.[modelId] ?? 1;
    if (e.colors?.includes(s.col)) m *= e.colorMul ?? 1;
  }
  return m;
}

export const material = (s: GameState) => MATERIAL[s.materialId] ?? DEFAULT_MATERIAL;
export const spoolPrice = (s: GameState, stock = material(s)) =>
  (s.spoolG > 1000 ? s.spool * 5 * BAL.bulkPackDiscount : s.spool) * marketMul(s, 'spool') * stock.price * mod(s, 'spool');
/** Selected print model (falls back to the figurine for unknown ids). */
export const model = (s: GameState): PrintModel => MODEL[s.mdl] ?? DEFAULT_MODEL;
/** Filament per figurine of work: base nozzle consumption × the model's material factor. */
export const gpu = (s: GameState, m = model(s)) => s.g * m.material * mod(s, 'filament');
/** Market size of a model in figurines/s at the same price per figurine (see content/models.ts). */
export const modelDemand = (m: PrintModel) => m.value ** BAL.demandElasticity * m.market * m.seconds;
/** Figurines of work added by one click. */
export const precisionSpeed = (s: GameState) => s.precision ? BAL.precisionSpeed : 1;
export const realizedPrice = (s: GameState, id = s.mdl) => stockPrice(s, id) * (1 + premiumFor(s, id));
export const activeStockWork = (s: GameState) => piecesInStock(s, s.mdl) * model(s).seconds;
export const clickPower = (s: GameState) => BAL.clickWork * (1 + BAL.clickStep * s.clk) * precisionSpeed(s) * mod(s, 'click') / (s.slow || 1);
/** Print time of one piece of a model in seconds, as the player sees it (longer on a realistic line or in precision mode). */
export const printSeconds = (s: GameState, m: PrintModel) => m.seconds * (s.slow || 1) / precisionSpeed(s);
export const isRealistic = (s: GameState) => (s.slow || 1) > 1;
export const clickCost = (s: GameState) => BAL.clickCost * BAL.clickGrowth ** s.clk;
/** Price per figurine at which demand would be `sales` figurines/s (demand ∝ price^-elasticity). */
export const clearingPrice = (s: GameState, sales: number) =>
  s.price * (demand(s) / Math.max(sales, 1e-6)) ** (1 / BAL.demandElasticity);

export const unitCost = (s: GameState, m = model(s)) => (spoolPrice(s) / s.spoolG) * gpu(s, m);
export const droneCost = (s: GameState) => BAL.droneCost * BAL.droneCostGrowth ** s.drones;
export const fabCost = (s: GameState) => BAL.fabCost * BAL.fabCostGrowth ** s.fabs;

export const supply = (s: GameState) => (BAL.garagePower + s.panels * BAL.panelPower) * mod(s, 'power');
export const drawP = (s: GameState) => s.farm * BAL.farmDraw;
export const eff = (s: GameState) => (drawP(s) ? Math.min(1, supply(s) / drawP(s)) : 1);

export const trendOn = (s: GameState) => s.goal >= 2;
export const inTrend = (s: GameState) => trendOn(s) && s.col === s.trend;

export const demand = (s: GameState, m = model(s), price = s.price) =>
  BAL.demandBase *
  Math.pow(5 / price, BAL.demandElasticity) *
  BAL.marketingGrowth ** (s.mkt - 1) *
  s.dem *
  (s.pen > 0 ? BAL.penaltyDemand : 1) *
  (inTrend(s) ? BAL.trendBonus : 1) *
  (1 + 0.15 * patLvl(s, 'brand')) *
  marketMul(s, 'demand', m.id) *
  modelDemand(m) * materialDemand(material(s), m.id) *
  mod(s, 'demand');

export const boostMul = (s: GameState) => (s.boostT > 0 ? BAL.boostMultiplier : 1);
export const rateBase = (s: GameState) => (s.auto + s.farm * BAL.farmPrinters * eff(s)) * s.spd * boostMul(s) * (1 + 0.15 * patLvl(s, 'speed')) * precisionSpeed(s) / (s.slow || 1) * mod(s, 'speed');
export const rate1 = (s: GameState) => rateBase(s) * (1 - s.brk);

const repBase = (s: GameState) => BAL.repThreshold * 0.9 ** patLvl(s, 'fame') * mod(s, 'rep');
export const repNext = (s: GameState) => repBase(s) * (s.rep + 1) ** 2;
export const repPrev = (s: GameState) => (s.rep ? repBase(s) * s.rep ** 2 : 0);
export const freePts = (s: GameState) => s.rep - (s.proc + s.mem - 2);
export const opsCap = (s: GameState) => s.mem * BAL.opsPerMemory * mod(s, 'opsCap');
export const opsRate = (s: GameState) => s.proc * BAL.opsPerProcessor * (1 + 0.25 * patLvl(s, 'compute')) * mod(s, 'ops');

const patSpeed = (s: GameState) => 1 + 0.15 * patLvl(s, 'speed');
export const mining = (s: GameState) => s.drones * BAL.droneMining * s.dMul * boostMul(s) * patSpeed(s) * mod(s, 'mining');
export const fabCap = (s: GameState) => s.fabs * BAL.fabThroughput * s.fMul * boostMul(s) * patSpeed(s) * mod(s, 'fab');
export const spaceRate = (s: GameState) => Math.min(mining(s), fabCap(s)) * BAL.figurinesPerTon;
