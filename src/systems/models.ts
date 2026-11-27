import { swapMain } from './fleet';
import { bookCash } from './workshopStats';
import { BAL } from '../content/balance';
import { MODEL, MODELS, type PrintModel } from '../content/models';
import { log, sfx, type Ctx } from '../core/ctx';
import { clickCost, clickPower, demand, model, rate1, unitCost } from '../core/formulas';
import type { GameState } from '../core/state';
import { modelStock } from './inventory';
import { printWork } from './production';
import { mod } from '../core/mods';

/** Print models: buying designs, switching the main model, manual printing with click tools.
 *  All model numbers come from content/models.ts; nothing here is specific to one model. */

/** A design shows up in the shop once enough figurines have been printed. */
export const designVisible = (s: GameState, m: PrintModel) => s.total >= m.unlockAt;
export const owns = (s: GameState, id: string) => s.mdls.includes(id);
/** Price of a design after research discounts. */
export const designCost = (s: GameState, m: PrintModel) => Math.round(m.design * mod(s, 'design'));

export function buyDesign(s: GameState, ctx: Ctx, id: string): boolean {
  if (!Object.hasOwn(MODEL, id)) return false;
  const m = MODEL[id];
  if (!m || s.ph !== 1 || owns(s, id) || !designVisible(s, m) || s.zl < designCost(s, m)) return false;
  bookCash(s, 'other', designCost(s, m));
  s.mdls = [...s.mdls, id];
  log(s, ctx, 'mdlBuy', '*' + id);
  ctx.emit({ type: 'model', id, action: 'bought' });
  return true;
}

/** Switches the main printing group to another owned model. The price per figurine moves with the model's value,
 *  so the player lands at a comparable spot on the new demand curve. */
export function selectModel(s: GameState, ctx: Ctx, id: string): boolean {
  if (!Object.hasOwn(MODEL, id)) return false;
  const next = MODEL[id], cur = model(s);
  if (!next || s.ph !== 1 || !owns(s, id) || next.id === cur.id) return false;
  modelStock(s, cur.id).price = s.price;
  const stock = modelStock(s, next.id);
  s.price = stock.price || Math.max(0.1, Math.round(s.price * (next.value / cur.value) * 100) / 100);
  swapMain(s, cur.id, id);
  s.mdl = id;
  s.mp = 0;
  log(s, ctx, 'mdlSel', '*' + id);
  ctx.emit({ type: 'model', id, action: 'selected' });
  return true;
}

export function buyClickTool(s: GameState): boolean {
  const c = clickCost(s);
  if (s.ph !== 1 || s.zl < c) return false;
  bookCash(s, 'equipment', c);
  s.clk++;
  return true;
}

/** Manual work shares the same completion and stock rules as the fleet. */
export function printManual(s: GameState, ctx: Ctx): boolean {
  if (s.ph !== 1) return false;
  const work = printWork(s, ctx, clickPower(s));
  if (!work) return false;
  s.manualWork += work;
  const m = model(s);
  s.mp = modelStock(s, m.id).progress;
  ctx.emit({ type: 'printed', manual: true, share: work / m.seconds });
  sfx(ctx, 'click');
  return true;
}

/** Save validation for the model fields (for core/saveValidation). */
export function validModelState(s: GameState): boolean {
  if (typeof s.mdl !== 'string' || !Object.hasOwn(MODEL, s.mdl) || !Array.isArray(s.mdls)) return false;
  if (!s.mdls.every(id => typeof id === 'string' && Object.hasOwn(MODEL, id)) || new Set(s.mdls).size !== s.mdls.length) return false;
  if (!s.mdls.includes(s.mdl) || !MODELS.filter(m => m.design === 0).every(m => s.mdls.includes(m.id))) return false;
  const maxSeconds = Math.max(...MODELS.map(m => m.seconds));
  return Number.isInteger(s.clk) && s.clk >= 0 && s.clk <= BAL.clickMaxLevel &&
    typeof s.mp === 'number' && s.mp >= 0 && s.mp <= maxSeconds;
}

/** Owned model with the best profit per second if the price clears the market at the current production rate.
 *  Used by the production planner automation (and the balance bot). */
export function bestModel(s: GameState): string {
  const R = Math.max(rate1(s), 1e-6);
  let best = s.mdl, bestProfit = -Infinity;
  for (const id of s.mdls) {
    const m = MODEL[id];
    if (!m) continue;
    const t = { ...s, mdl: id, price: s.price * (m.value / (MODEL[s.mdl]?.value ?? 1)) };
    const clearing = t.price * (demand(t) / R) ** (1 / BAL.demandElasticity);
    const profit = R * (Math.min(clearing, 500 / m.seconds) - unitCost(t));
    if (profit > bestProfit) { bestProfit = profit; best = id; }
  }
  return best;
}

