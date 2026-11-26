import { recordStockShipment } from './workshopStats';
import { BAL } from '../content/balance';
import { MODEL, MODELS } from '../content/models';
import type { GameState } from '../core/state';

export interface ModelStock {
  pieces: number;
  price: number;
  premium: number;
  saleCarry: number;
  progress: number;
  progressPremium: number;
  printed: number;
  knownCostPieces?: number;
  filamentCost?: number;
  progressCost?: number | null;
  reservedCost?: number | null;
}

export function modelStock(s: GameState, id: string): ModelStock {
  return s.modelStock[id] ??= { pieces: 0, price: 0, premium: 0, saleCarry: 0, progress: 0, progressPremium: 0, printed: 0 };
}

/** inv remains the total work value used by research, daily orders and the space phase. */
export function piecesInStock(s: GameState, id: string) {
  if (id !== 'fig') return s.modelStock[id]?.pieces ?? 0;
  const otherWork = MODELS.reduce((sum, m) => m.id === 'fig' ? sum : sum + (s.modelStock[m.id]?.pieces ?? 0) * m.seconds, 0);
  return Math.max(0, Math.floor(s.inv - otherWork + 1e-9));
}

export const stockPrice = (s: GameState, id: string) =>
  id === s.mdl ? s.price : s.modelStock[id]?.price || s.price * MODEL[id].value / MODEL[s.mdl].value;
export function setStockPrice(s: GameState, id: string, price: number) {
  if (id === s.mdl) s.price = price;
  else modelStock(s, id).price = price;
}

export const premiumFor = (s: GameState, id: string) => id === 'fig' ? s.stockPremium : s.modelStock[id]?.premium ?? 0;

export function putPieces(s: GameState, id: string, count: number, premium: number, cost: number | null = null) {
  if (count <= 0) return;
  const lot = modelStock(s, id);
  if (cost !== null) {
    lot.knownCostPieces = (lot.knownCostPieces ?? 0) + count;
    lot.filamentCost = (lot.filamentCost ?? 0) + cost;
  }
  const previous = piecesInStock(s, id);
  const blended = (previous * premiumFor(s, id) + count * premium) / (previous + count);
  if (id === 'fig') s.stockPremium = blended;
  else {
    lot.price ||= stockPrice(s, id);
    lot.pieces += count;
    lot.premium = blended;
  }
  s.inv += count * MODEL[id].seconds;
}

export function takePieces(s: GameState, id: string, count: number) {
  const lot = modelStock(s, id);
  const known = lot.knownCostPieces ?? 0;
  // Legacy pieces with no cost information are sold first.
  const knownTaken = Math.max(0, count - (piecesInStock(s, id) - known));
  const cost = knownTaken ? (lot.filamentCost ?? 0) * knownTaken / known : 0;
  if (knownTaken) {
    lot.knownCostPieces = known - knownTaken;
    lot.filamentCost = lot.knownCostPieces ? (lot.filamentCost ?? 0) - cost : 0;
  }
  s.inv -= count * MODEL[id].seconds;
  if (id !== 'fig') {
    lot.pieces -= count;
    if (!lot.pieces) lot.premium = 0;
  } else if (!piecesInStock(s, id)) s.stockPremium = 0;
  return knownTaken === count ? cost : null;
}

export function takeStockWork(s: GameState, work: number) {
  for (const m of MODELS) {
    if (work <= 0) break;
    const count = Math.min(piecesInStock(s, m.id), Math.ceil(work / m.seconds));
    if (!count) continue;
    takePieces(s, m.id, count);
    recordStockShipment(s, m.id, count);
    work -= count * m.seconds;
  }
}

export function validInventory(s: GameState) {
  if (!s.modelStock || typeof s.modelStock !== 'object' || Array.isArray(s.modelStock) ||
      !s.orderStock || typeof s.orderStock !== 'object' || Array.isArray(s.orderStock) || s.inv < 0) return false;
  let work = 0;
  for (const [id, lot] of Object.entries(s.modelStock)) {
    if (!s.mdls.includes(id) || !lot || typeof lot !== 'object' ||
        !Number.isSafeInteger(lot.pieces) || lot.pieces < 0 || (id === 'fig' && lot.pieces !== 0) ||
        !Number.isFinite(lot.price) || lot.price < 0 ||
        !Number.isFinite(lot.premium) || lot.premium < 0 || lot.premium > BAL.precisionPremium + 1e-9 ||
        !Number.isFinite(lot.saleCarry) || lot.saleCarry < 0 || lot.saleCarry >= 1 ||
        !Number.isSafeInteger(lot.printed) || lot.printed < 0 ||
        !Number.isFinite(lot.progressPremium) || lot.progressPremium < 0 || lot.progressPremium > BAL.precisionPremium + 1e-9 ||
        !Number.isFinite(lot.progress) || lot.progress < 0 || lot.progress >= MODEL[id].seconds) return false;
    work += lot.pieces * MODEL[id].seconds;
  }
  let reserved = 0;
  for (const [id, count] of Object.entries(s.orderStock)) {
    if (!s.mdls.includes(id) || id === 'fig' || !Number.isSafeInteger(count) || count <= 0) return false;
    reserved += count * MODEL[id].seconds;
  }
  for (const [id, lot] of Object.entries(s.modelStock)) {
    const known = lot.knownCostPieces ?? 0;
    if (!Number.isSafeInteger(known) || known < 0 ||
        known > (id === 'fig' ? Math.floor(s.inv - work + 1e-9) : lot.pieces) ||
        ![lot.filamentCost, lot.progressCost, lot.reservedCost].every(cost =>
          cost == null || (Number.isFinite(cost) && cost >= 0))) return false;
  }
  return work <= s.inv + 1e-9 && reserved <= (s.ord?.got ?? 0) + 1e-9;
}
