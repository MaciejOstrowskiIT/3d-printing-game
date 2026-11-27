import { BAL } from '../content/balance';
import { MODEL, type PrintModel } from '../content/models';
import { eff, gpu, model, rate1 } from '../core/formulas';
import type { GameState } from '../core/state';

/** Extra printers can be dedicated to other models once there are at least two printers and two designs. */
export const splitUnlocked = (s: GameState) => s.ph === 1 && s.auto >= 2 && s.mdls.length >= 2;

/** Extra printers dedicated to models other than the main one. */
export const dedicated = (s: GameState) => Object.values(s.fleet).reduce((sum, n) => sum + n, 0);

/** Printers working on a model. The main model gets every printer not dedicated elsewhere. */
export const printersOn = (s: GameState, id: string) => id === s.mdl ? BAL.basePrinters + s.auto - dedicated(s) : s.fleet[id] ?? 0;

/** Print rate (figurine work/s) of a model. Farms, manual work and new printers always go to the main model;
 *  all standalone printers share the same speed, boost and breakdown modifiers. */
export function rateOn(s: GameState, id: string, totalRate = rate1(s)) {
  const effectivePrinters = BAL.basePrinters + s.auto + s.farm * BAL.farmPrinters * eff(s);
  if (effectivePrinters <= 0) return 0;
  const perPrinter = totalRate / effectivePrinters;
  return id === s.mdl ? totalRate - perPrinter * dedicated(s) : perPrinter * (s.fleet[id] ?? 0);
}

/** Models printing right now, main first, with their rates. */
export function printing(s: GameState, totalRate = rate1(s)): { m: PrintModel; rate: number }[] {
  const out = [{ m: model(s), rate: rateOn(s, s.mdl, totalRate) }];
  for (const [id, n] of Object.entries(s.fleet)) if (n > 0 && MODEL[id]) out.push({ m: MODEL[id], rate: rateOn(s, id, totalRate) });
  return out;
}

export const fleetFilamentPerSecond = (s: GameState) => printing(s).reduce((sum, p) => sum + p.rate * gpu(s, p.m), 0);

/** Dedicates `count` extra printers to a model other than the main one (0 returns them to the main model). */
export function setFleet(s: GameState, id: string, count: number) {
  if (!splitUnlocked(s) || !Object.hasOwn(MODEL, id) || id === s.mdl || !s.mdls.includes(id)) return false;
  if (!Number.isSafeInteger(count) || count < 0 || count === (s.fleet[id] ?? 0)) return false;
  if (dedicated(s) - (s.fleet[id] ?? 0) + count > s.auto) return false;
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
  let sum = 0;
  for (const [id, n] of Object.entries(s.fleet)) {
    if (!Object.hasOwn(MODEL, id) || id === s.mdl || !s.mdls.includes(id) || !Number.isSafeInteger(n) || n < 1) return false;
    sum += n;
  }
  return sum <= s.auto;
}
