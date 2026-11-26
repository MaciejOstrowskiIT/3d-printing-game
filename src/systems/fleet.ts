import { BAL } from '../content/balance';
import { MODEL } from '../content/models';
import { eff, gpu, model, rate1 } from '../core/formulas';
import type { GameState } from '../core/state';

export const splitUnlocked = (s: GameState) => s.ph === 1 && s.auto >= 2 && s.mdls.length >= 2;

export function secondaryRate(s: GameState, totalRate = rate1(s)) {
  // Available power affects farms, but both groups of standalone printers
  // share the same shop speed, boost and breakdown modifiers.
  const effectivePrinters = s.auto + s.farm * BAL.farmPrinters * eff(s);
  return s.fleetModel && effectivePrinters > 0 ? totalRate * s.fleetPrinters / effectivePrinters : 0;
}

export const primaryRate = (s: GameState) => rate1(s) - secondaryRate(s);

export function fleetFilamentPerSecond(s: GameState) {
  const total = rate1(s), secondary = secondaryRate(s, total);
  return (total - secondary) * gpu(s) + (s.fleetModel ? secondary * gpu(s, MODEL[s.fleetModel]) : 0);
}

export function setFleetModel(s: GameState, id: string) {
  if (!splitUnlocked(s) || (id && (id === model(s).id || !s.mdls.includes(id) || !Object.hasOwn(MODEL, id)))) return false;
  if (id === s.fleetModel) return false;
  s.fleetModel = id;
  s.fleetPrinters = id ? Math.max(1, s.fleetPrinters) : 0;
  return true;
}

export function setFleetPrinters(s: GameState, count: number) {
  if (!splitUnlocked(s) || !s.fleetModel || !Number.isSafeInteger(count) || count < 1 || count >= s.auto ||
      count === s.fleetPrinters) return false;
  s.fleetPrinters = count;
  return true;
}

export function validFleet(s: GameState) {
  if (s.fleetModel === '') return s.fleetPrinters === 0;
  return typeof s.fleetModel === 'string' && Object.hasOwn(MODEL, s.fleetModel) && s.mdls.includes(s.fleetModel) &&
    s.fleetModel !== s.mdl && Number.isSafeInteger(s.fleetPrinters) && s.fleetPrinters >= 1 && s.fleetPrinters < s.auto;
}
