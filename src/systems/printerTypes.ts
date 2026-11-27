import { BAL } from '../content/balance';
import { MODEL, MODELS } from '../content/models';
import { EXTRA_PRINTER_TYPE, EXTRA_PRINTER_TYPES, typeOf, type PrinterType } from '../content/printerTypes';
import { log, type Ctx } from '../core/ctx';
import { typeCost } from '../core/formulas';
import type { GameState } from '../core/state';
import { fleetFilamentPerSecond, printing } from './fleet';
import { autobuyOn } from './filament';
import { materialStock } from './materials';
import { buySpool, deliver, printWork } from './production';
import { bookCash } from './workshopStats';

/** Printer types other than FDM (content/printerTypes.ts): buying printers, printing their models from their own
 *  feedstock, and the post-processing queue (wash and cure) between the printer and the stock. */

/** A type shows up in the shop once enough figurines have been printed. */
export const typeVisible = (s: GameState, type: PrinterType) => s.ph === 1 && s.total >= type.unlockAt;
/** Owned designs printed on a type. */
export const typeModels = (s: GameState, type: PrinterType) => s.mdls.filter(id => MODEL[id] && typeOf(MODEL[id]) === type);

/** Buys a printer of a type. It needs an owned design for that type; the new printer joins the model that already
 *  has the most printers of the type (the first design when none has any). */
export function buyPrinter(s: GameState, ctx: Ctx, id: string): boolean {
  if (!Object.hasOwn(EXTRA_PRINTER_TYPE, id)) return false;
  const type = EXTRA_PRINTER_TYPE[id], designs = typeModels(s, type);
  const cost = typeCost(s, type);
  if (!typeVisible(s, type) || !designs.length || s.zl < cost) return false;
  bookCash(s, 'equipment', cost);
  s.printers[id] = (s.printers[id] ?? 0) + 1;
  const target = designs.reduce((best, m) => (s.fleet[m] ?? 0) > (s.fleet[best] ?? 0) ? m : best, designs[0]);
  s.fleet[target] = (s.fleet[target] ?? 0) + 1;
  if (s.printers[id] === 1) log(s, ctx, 'ptFirst', '*' + target);
  return true;
}

/** Pieces of a model in post-processing. */
export const curingPieces = (s: GameState, id: string) =>
  s.curing.reduce((sum, b) => b.id === id ? sum + b.w : sum, 0) / (MODEL[id]?.seconds ?? 1);

export function printerTypesSystem(s: GameState, dt: number, ctx: Ctx) {
  if (s.ph !== 1) return;
  for (const type of EXTRA_PRINTER_TYPES) {
    if (!s.printers[type.id]) continue;
    const grams = fleetFilamentPerSecond(s, type) * dt;
    if (grams <= 0) continue;
    if (autobuyOn(s)) while (materialStock(s, type.material) < grams * 3 && buySpool(s, type.material)) { /* keep buying */ }
    // Short of feedstock: every model of the type keeps running in the configured proportion.
    const fraction = Math.min(1, materialStock(s, type.material) / grams);
    for (const { m, rate } of printing(s, undefined, type)) if (rate > 0) printWork(s, ctx, rate * dt * fraction, m);
  }
  // Post-processing: a batch reaches stock (or the accepted order) once its timer runs out.
  for (const b of s.curing) b.t -= dt;
  while (s.curing.length && s.curing[0].t <= 0) {
    const b = s.curing.shift()!;
    if (MODEL[b.id]) deliver(s, ctx, b.w, b.p, b.c, MODEL[b.id]);
  }
}

/** Save validation for the printer pools and the post-processing queue (for core/saveValidation). */
export function validPrinterTypes(s: GameState) {
  const pools = s.printers, queue = s.curing;
  if (!pools || typeof pools !== 'object' || Array.isArray(pools) || !Array.isArray(queue)) return false;
  if (!Object.entries(pools).every(([id, n]) => Object.hasOwn(EXTRA_PRINTER_TYPE, id) && Number.isSafeInteger(n) && n >= 0)) return false;
  const maxCure = Math.max(0, ...EXTRA_PRINTER_TYPES.map(t => t.cure));
  return queue.length <= MODELS.length * (maxCure + 1) && queue.every(b =>
    !!b && typeof b === 'object' && typeof b.id === 'string' && Object.hasOwn(MODEL, b.id) && s.mdls.includes(b.id) &&
    typeOf(MODEL[b.id]).cure > 0 && Number.isFinite(b.w) && b.w > 0 && b.w <= Number.MAX_SAFE_INTEGER &&
    Number.isFinite(b.t) && b.t <= typeOf(MODEL[b.id]).cure &&
    Number.isFinite(b.p) && b.p >= 0 && b.p <= BAL.precisionPremium + 1e-9 &&
    (b.c === null || (Number.isFinite(b.c) && b.c >= 0)));
}
