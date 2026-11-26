import type { Pair } from './models';

export interface PrintMaterial {
  id: string;
  name: Pair;
  price: number;
  durability: number;
  matches: readonly string[];
  unlockAt: number;
}

/** Prices are relative to PLA. Buyers pay more attention to models made with a suitable material. */
export const MATERIALS: readonly PrintMaterial[] = [
  { id: 'pla', name: ['PLA', 'PLA'], price: 1, durability: 2, matches: [], unlockAt: 0 },
  { id: 'petg', name: ['PETG', 'PETG'], price: 1.2, durability: 4, matches: ['fig', 'helmet'], unlockAt: 150 },
  { id: 'tpu', name: ['TPU', 'TPU'], price: 1.45, durability: 5, matches: ['keychain', 'dragon'], unlockAt: 1500 },
  { id: 'resin', name: ['Żywica', 'Resin'], price: 1.65, durability: 1, matches: ['bust'], unlockAt: 1500 },
];

export const MATERIAL: Record<string, PrintMaterial> = Object.fromEntries(MATERIALS.map(m => [m.id, m]));
export const DEFAULT_MATERIAL = MATERIALS[0];

export function materialDemand(material: PrintMaterial, modelId: string) {
  return material.matches.includes(modelId) ? 1.2 + 0.07 * material.durability : 1;
}
