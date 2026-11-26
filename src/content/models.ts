/** Print models: what the printers make. Pure data, one entry per model.
 *
 *  To add a model: append an entry below (ids are stored in saves, so never rename or remove one).
 *  Nothing else needs to change: systems/models.ts, the Models card and the printer animation read this list,
 *  and tests/models.test.ts checks every entry (numbers in range, shape fits the printer, texts in PL and EN).
 *
 *  Economy is counted in figurines: one figurine = one second of work of one printer at base speed. A model
 *  that takes 5 s to print is 5 figurines of work, so production, stock, goals and the space phase stay in the
 *  same unit no matter which model is selected. A model changes the market side:
 *   - demand for it, in figurines/s at the same price per figurine, is multiplied by value^elasticity × market × seconds;
 *   - filament per figurine is multiplied by material.
 *  Bigger models pay more per printer-second but have fewer buyers, so they help most once printers outnumber clients. */

export type Pair = [pl: string, en: string];

export interface PrintModel {
  id: string;
  name: Pair;
  /** One line for the Models card. */
  desc: Pair;
  /** Print time of one piece on one printer at base speed, in seconds = figurines of work per piece. */
  seconds: number;
  /** What buyers pay per printer-second, relative to the figurine. */
  value: number;
  /** How many pieces the market takes, relative to the figurine. */
  market: number;
  /** Filament per printer-second, relative to the figurine. */
  material: number;
  /** Price of the design (STL file). 0 = owned from the start. */
  design: number;
  /** Figurines printed (total) before the design shows up in the shop. */
  unlockAt: number;
  /** Layer widths for the printer close-up, bottom to top (px in a 320×240 scene, build plate is 188 wide). */
  shape: number[];
}

export const MODELS: PrintModel[] = [
  {
    id: 'fig', seconds: 1, value: 1, market: 1, material: 1, design: 0, unlockAt: 0,
    name: ['Figurka', 'Figurine'],
    desc: ['Klasyka. Szybka, tania, każdy chce.', 'The classic. Quick, cheap, everyone wants one.'],
    shape: [34, 44, 52, 56, 56, 52, 46, 40, 36, 36, 40, 46],
  },
  {
    id: 'keychain', seconds: 0.5, value: 0.9, market: 2.2, material: 0.55, design: 150, unlockAt: 150,
    name: ['Brelok', 'Keychain'],
    desc: ['Mało plastiku, ogromny rynek, niska cena. Dobry, gdy filament drożeje.', 'Little plastic, a huge market, a low price. Good when filament is expensive.'],
    shape: [64, 64, 60, 52],
  },
  {
    id: 'bust', seconds: 5, value: 1.2, market: 0.22, material: 1.2, design: 2500, unlockAt: 1500,
    name: ['Popiersie', 'Bust'],
    desc: ['Lepsza cena za sekundę druku, mniej kupujących, więcej filamentu.', 'Better price per second of printing, fewer buyers, more filament.'],
    shape: [72, 72, 66, 54, 30, 26, 34, 44, 50, 52, 50, 46, 38, 26],
  },
  {
    id: 'dragon', seconds: 15, value: 1.4, market: 0.1, material: 1.1, design: 30000, unlockAt: 20000,
    name: ['Smok przegubowy', 'Articulated dragon'],
    desc: ['Hit internetu. Drogi, wolny, kolekcjonerzy płacą za każdą sekundę.', 'An internet hit. Pricey and slow; collectors pay for every second.'],
    shape: [96, 104, 108, 100, 84, 70, 56, 62, 70, 58, 40, 30],
  },
  {
    id: 'helmet', seconds: 60, value: 1.6, market: 0.04, material: 1.4, design: 300000, unlockAt: 200000,
    name: ['Hełm do cosplayu', 'Cosplay helmet'],
    desc: ['Godzina pracy farmy na sztukę. Mało klientów, ale płacą najwięcej.', 'An hour of farm time per piece. Few buyers, but they pay the most.'],
    shape: [92, 98, 102, 104, 104, 102, 98, 92, 84, 74, 60, 42, 24],
  },
];

export const MODEL: Record<string, PrintModel> = Object.fromEntries(MODELS.map(m => [m.id, m]));
export const DEFAULT_MODEL = MODELS[0];
