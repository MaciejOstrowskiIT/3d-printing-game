import type { Pair, PrintModel } from './models';

/** Printer types: which machines print a model. Pure data, one entry per type.
 *
 *  FDM is the original line: the garage printer, the auto printers (`s.auto`) and the farms. Every other type is a
 *  separate pool of printers (`s.printers[id]`) that prints only the models whose `printerType` names it. The pool is
 *  split between those models with the same per-model allocation as the FDM production line (`s.fleet`,
 *  systems/fleet.ts), but it has no main model: unassigned printers stand idle.
 *
 *  To add a type: append an entry (ids are stored in saves, so never rename or remove one), give some models
 *  `printerType: '<id>'`, and add `printer.<id>` texts. tests/printerTypes.test.ts checks every entry. */
export interface PrinterType {
  id: string;
  name: Pair;
  /** Short label on model tiles. */
  tag: Pair;
  /** One line for the printer card. */
  desc: Pair;
  /** Widest layer (px, see PrintModel.shape) the build volume takes. Models of this type must fit. */
  buildWidth: number;
  /** Price multiplier buyers accept for the detail of this type (applied on top of the model's value). */
  detail: number;
  /** Work per printer-second relative to an FDM printer (research, boost and breakdowns apply on top). */
  speed: number;
  /** Feedstock material id (content/materials.ts) consumed instead of the selected filament; empty for FDM. */
  material: string;
  /** Seconds a finished piece spends in post-processing (wash and cure) before it reaches stock or an order. */
  cure: number;
  /** Price of the first printer and growth per printer owned. */
  cost: number;
  costGrowth: number;
  /** Figurines printed (total) before the printer shows up in the shop. */
  unlockAt: number;
}

export const PRINTER_TYPES: readonly PrinterType[] = [
  {
    id: 'fdm', buildWidth: 188, detail: 1, speed: 1, material: '', cure: 0, cost: 0, costGrowth: 1, unlockAt: 0,
    name: ['Drukarka FDM', 'FDM printer'], tag: ['FDM', 'FDM'],
    desc: ['Topi filament warstwa po warstwie. Szybka i uniwersalna.', 'Melts filament layer by layer. Fast and versatile.'],
  },
  {
    id: 'resin', buildWidth: 72, detail: 2, speed: 0.5, material: 'resin', cure: 45, cost: 4000, costGrowth: 1.3, unlockAt: 20000,
    name: ['Drukarka żywiczna', 'Resin printer'], tag: ['Żywica', 'Resin'],
    desc: [
      'Utwardza żywicę światłem. Mały stół i wolny druk, ale detal, za który kolekcjonerzy płacą podwójnie. Wydruk wymaga mycia i utwardzania.',
      'Cures resin with light. A small plate and slow prints, but detail collectors pay double for. Every print needs a wash and cure.',
    ],
  },
];

export const PRINTER_TYPE: Record<string, PrinterType> = Object.fromEntries(PRINTER_TYPES.map(t => [t.id, t]));
export const FDM = PRINTER_TYPES[0];
/** Types bought as their own printer pool (everything but FDM). */
export const EXTRA_PRINTER_TYPES = PRINTER_TYPES.filter(t => t !== FDM);
export const EXTRA_PRINTER_TYPE: Record<string, PrinterType> = Object.fromEntries(EXTRA_PRINTER_TYPES.map(t => [t.id, t]));

/** Printer type a model is made on (models without `printerType` are FDM). */
export const typeOf = (m: PrintModel): PrinterType => PRINTER_TYPE[m.printerType ?? FDM.id] ?? FDM;
export const isFdm = (m: PrintModel) => typeOf(m) === FDM;
