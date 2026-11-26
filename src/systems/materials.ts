import { DEFAULT_MATERIAL, MATERIAL } from '../content/materials';
import type { GameState } from '../core/state';

export function materialStock(s: GameState, id: string) {
  return id === s.materialId ? s.fil : s.materialStock[id] ?? 0;
}

export function addMaterial(s: GameState, id: string, grams: number) {
  if (id === s.materialId) s.fil += grams;
  else s.materialStock[id] = materialStock(s, id) + grams;
}

export function selectMaterial(s: GameState, id: string) {
  if (s.ph !== 1 || s.materialId === id || !Object.hasOwn(MATERIAL, id) || s.total < MATERIAL[id].unlockAt) return false;
  const nextStock = materialStock(s, id);
  s.materialStock[s.materialId] = s.fil;
  delete s.materialStock[id];
  s.materialId = id;
  s.fil = nextStock;
  s.warn = false;
  return true;
}

export function validMaterialState(s: GameState) {
  if (typeof s.materialId !== 'string' || !Object.hasOwn(MATERIAL, s.materialId) ||
      s.total < MATERIAL[s.materialId].unlockAt || s.fil < 0) return false;
  const stock = s.materialStock;
  return !!stock && typeof stock === 'object' && !Array.isArray(stock) &&
    Object.entries(stock).every(([id, grams]) => id !== s.materialId && Object.hasOwn(MATERIAL, id) &&
      s.total >= MATERIAL[id].unlockAt && Number.isFinite(grams) && grams >= 0 && grams <= Number.MAX_SAFE_INTEGER) &&
    (s.materialId === DEFAULT_MATERIAL.id || Object.hasOwn(stock, DEFAULT_MATERIAL.id));
}
