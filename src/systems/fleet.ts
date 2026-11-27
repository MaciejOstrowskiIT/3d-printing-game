import { BAL } from '../content/balance';
import { MODEL, type PrintModel } from '../content/models';
import { FDM, PRINTER_TYPES, typeOf, type PrinterType } from '../content/printerTypes';
import { eff, gpu, model, rate1, typeSpeed } from '../core/formulas';
import type { GameState } from '../core/state';

/** Production line: printers allocated per model. Each printer type (content/printerTypes.ts) is its own pool and
 *  prints only its own models; `s.fleet` holds the allocation of every pool (model id → printers).
 *  FDM has a main model that takes every FDM printer not dedicated elsewhere, plus farms and manual work.
 *  Other types have no main model: their unassigned printers stand idle. */

/** Extra printers can be dedicated to other models once there are at least two printers and two FDM designs. */
export const splitUnlocked = (s: GameState) => s.ph === 1 && s.auto >= 2 && s.mdls.filter(id => MODEL[id] && typeOf(MODEL[id]) === FDM).length >= 2;

/** Printers a type's allocation is shared from: the auto printers for FDM, the bought pool for other types. */
export const poolSize = (s: GameState, type: PrinterType) => type === FDM ? s.auto : s.printers?.[type.id] ?? 0;

/** Printers of a type dedicated to its models (for FDM: to models other than the main one). */
export const dedicated = (s: GameState, type: PrinterType = FDM) =>
  Object.entries(s.fleet).reduce((sum, [id, n]) => MODEL[id] && typeOf(MODEL[id]) === type ? sum + n : sum, 0);

/** Printers of a type other than FDM that have no model assigned. */
export const idlePrinters = (s: GameState, type: PrinterType) => Math.max(0, poolSize(s, type) - dedicated(s, type));

/** Printers working on a model. The main model gets every FDM printer not dedicated elsewhere. */
export const printersOn = (s: GameState, id: string) => id === s.mdl ? BAL.basePrinters + s.auto - dedicated(s) : s.fleet[id] ?? 0;

/** Print rate (figurine work/s) of a model. Farms, manual work and new FDM printers always go to the main model;
 *  all standalone FDM printers share the same speed, boost and breakdown modifiers. Other types run at their own speed. */
export function rateOn(s: GameState, id: string, totalRate = rate1(s)) {
  const m = MODEL[id];
  if (m && typeOf(m) !== FDM) return typeSpeed(s, typeOf(m)) * (s.fleet[id] ?? 0);
  const effectivePrinters = BAL.basePrinters + s.auto + s.farm * BAL.farmPrinters * eff(s);
  if (effectivePrinters <= 0) return 0;
  const perPrinter = totalRate / effectivePrinters;
  return id === s.mdl ? totalRate - perPrinter * dedicated(s) : perPrinter * (s.fleet[id] ?? 0);
}

/** Models a printer type is printing right now, with their rates (FDM: main first). */
export function printing(s: GameState, totalRate = rate1(s), type: PrinterType = FDM): { m: PrintModel; rate: number }[] {
  const out = type === FDM ? [{ m: model(s), rate: rateOn(s, s.mdl, totalRate) }] : [];
  for (const [id, n] of Object.entries(s.fleet)) {
    if (n > 0 && MODEL[id] && typeOf(MODEL[id]) === type) out.push({ m: MODEL[id], rate: rateOn(s, id, totalRate) });
  }
  return out;
}

/** Feedstock (grams/s) the printers of a type use; FDM by default, which draws the selected filament. */
export const fleetFilamentPerSecond = (s: GameState, type: PrinterType = FDM) => printing(s, rate1(s), type).reduce((sum, p) => sum + p.rate * gpu(s, p.m), 0);

/** Dedicates `count` printers of the model's type to it. FDM: extra printers taken from the main model (0 returns
 *  them); other types: printers taken from the idle ones of that pool (0 leaves them idle). */
export function setFleet(s: GameState, id: string, count: number) {
  if (!Object.hasOwn(MODEL, id) || !s.mdls.includes(id)) return false;
  const type = typeOf(MODEL[id]);
  if (type === FDM ? !splitUnlocked(s) || id === s.mdl : s.ph !== 1) return false;
  if (!Number.isSafeInteger(count) || count < 0 || count === (s.fleet[id] ?? 0)) return false;
  if (dedicated(s, type) - (s.fleet[id] ?? 0) + count > poolSize(s, type)) return false;
  if (count) s.fleet[id] = count; else delete s.fleet[id];
  return true;
}

/** The main model changes. If the new main already had dedicated printers, the two swap roles: those printers
 *  stay on it and the old main keeps its remaining printers. Otherwise the main group simply moves to the new model. */
export function swapMain(s: GameState, from: string, to: string) {
  if (!s.fleet[to]) return;
  const rest = s.auto - dedicated(s);
  delete s.fleet[to];
  if (rest > 0) s.fleet[from] = rest;
}

/** Progress (0–100) of the piece being printed, or null when it should not be shown: out of phase 1, nothing
 *  printing, or printing so fast (a piece under BAL.printProgressMinSeconds) that a bar would only flicker. */
export function printProgress(s: GameState): number | null {
  if (s.ph !== 1) return null;
  const m = model(s), rate = rateOn(s, s.mdl);
  if (rate <= 0 || m.seconds / rate < BAL.printProgressMinSeconds) return null;
  return Math.round(100 * Math.min(1, (s.modelStock[s.mdl]?.progress ?? 0) / m.seconds));
}

export function validFleet(s: GameState) {
  if (!s.fleet || typeof s.fleet !== 'object' || Array.isArray(s.fleet)) return false;
  for (const [id, n] of Object.entries(s.fleet)) {
    if (!Object.hasOwn(MODEL, id) || id === s.mdl || !s.mdls.includes(id) || !Number.isSafeInteger(n) || n < 1) return false;
  }
  return PRINTER_TYPES.every(type => dedicated(s, type) <= poolSize(s, type));
}
