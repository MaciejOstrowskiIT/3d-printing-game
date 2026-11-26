import { BAL } from '../content/balance';
import { MODEL, MODELS, type PrintModel } from '../content/models';
import { log, sfx, type Ctx } from '../core/ctx';
import { clickCost, clickPower, gpu, model } from '../core/formulas';
import type { GameState } from '../core/state';
import { make } from './production';

/** Print models: buying designs, switching the fleet to another model, manual printing with click tools.
 *  All model numbers come from content/models.ts; nothing here is specific to one model. */

/** A design shows up in the shop once enough figurines have been printed. */
export const designVisible = (s: GameState, m: PrintModel) => s.total >= m.unlockAt;
export const owns = (s: GameState, id: string) => s.mdls.includes(id);

export function buyDesign(s: GameState, ctx: Ctx, id: string): boolean {
  const m = MODEL[id];
  if (!m || s.ph !== 1 || owns(s, id) || !designVisible(s, m) || s.zl < m.design) return false;
  s.zl -= m.design;
  s.mdls = [...s.mdls, id];
  log(s, ctx, 'mdlBuy', '*' + id);
  ctx.emit({ type: 'model', id, action: 'bought' });
  return true;
}

/** Switches all printers to another owned model. The price per figurine moves with the model's value,
 *  so the player lands at a comparable spot on the new demand curve. */
export function selectModel(s: GameState, ctx: Ctx, id: string): boolean {
  const next = MODEL[id], cur = model(s);
  if (!next || s.ph !== 1 || !owns(s, id) || next.id === cur.id) return false;
  s.price = Math.max(0.1, Math.round(s.price * (next.value / cur.value) * 100) / 100);
  s.mdl = id;
  s.mp = 0;
  log(s, ctx, 'mdlSel', '*' + id);
  ctx.emit({ type: 'model', id, action: 'selected' });
  return true;
}

export function buyClickTool(s: GameState): boolean {
  const c = clickCost(s);
  if (s.ph !== 1 || s.zl < c) return false;
  s.zl -= c;
  s.clk++;
  return true;
}

/** One click: adds clickPower() figurines of work to your own printer. Whole figurines go to stock right away
 *  (so the economy does not depend on the model); s.mp tracks progress on the current piece for the animation. */
export function printManual(s: GameState, ctx: Ctx): boolean {
  const g = gpu(s);
  if (s.ph !== 1 || s.fil < g) return false;
  const work = Math.min(clickPower(s), s.fil / g);
  s.acc += work;
  const n = Math.floor(s.acc + 1e-9); // ten clicks of 0.1 must make a whole figurine despite float rounding
  s.acc = Math.max(0, s.acc - n);
  if (n > 0) { s.fil -= n * g; make(s, ctx, n); }
  const m = model(s);
  s.mp = (s.mp + work) % m.seconds;
  ctx.emit({ type: 'printed', manual: true, share: work / m.seconds });
  sfx(ctx, 'click');
  return true;
}

/** Save validation for the model fields (for core/saveValidation). */
export function validModelState(s: GameState): boolean {
  if (typeof s.mdl !== 'string' || !MODEL[s.mdl] || !Array.isArray(s.mdls)) return false;
  if (!s.mdls.every(id => typeof id === 'string' && MODEL[id]) || new Set(s.mdls).size !== s.mdls.length) return false;
  if (!s.mdls.includes(s.mdl) || !MODELS.filter(m => m.design === 0).every(m => s.mdls.includes(m.id))) return false;
  const maxSeconds = Math.max(...MODELS.map(m => m.seconds));
  return Number.isInteger(s.clk) && s.clk >= 0 && s.clk <= BAL.clickMaxLevel &&
    typeof s.mp === 'number' && s.mp >= 0 && s.mp <= maxSeconds;
}
