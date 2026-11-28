/** Print models: what the printers make. Pure data, one entry per model.
 *
 *  To add a model: append an entry below (ids are stored in saves, so never rename or remove one).
 *  Nothing else needs to change: systems/models.ts, the Models card and the printer animation read this list,
 *  and tests/models.test.ts checks every entry (numbers in range, shape fits the printer, texts in PL and EN).
 *
 *  Economy is counted in figurines: one figurine = one second of work of one printer at base speed. A model
 *  that takes 5 s to print is 5 figurines of work, so goals and the space phase stay in the
 *  same unit no matter which model is selected. The workshop stocks and sells whole pieces.
 *  A model changes the market side:
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
  /** Printer type that makes it (content/printerTypes.ts); omitted = FDM. The shape must fit the type's build volume. */
  printerType?: string;
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
    id: 'miniature', seconds: 6, value: 1, market: 0.12, material: 0.35, design: 6000, unlockAt: 20000, printerType: 'resin',
    name: ['Figurka bitewna', 'Tabletop miniature'],
    desc: ['Drobny detal z żywicy. Gracze bitewni płacą za każdy szczegół.', 'Fine resin detail. Tabletop players pay for every rivet.'],
    shape: [40, 40, 24, 28, 34, 30, 22, 26, 30, 20, 14],
  },
  {
    id: 'gardenStatue', seconds: 30, value: 1.5, market: 0.004, material: 1.3, design: 120000, unlockAt: 100000, printerType: 'industrial',
    name: ['Rzeźba ogrodowa', 'Garden statue'],
    desc: ['Posąg do ogrodu, wyższy niż krasnal. Mieści się tylko w drukarce przemysłowej.', 'A garden statue taller than any gnome. Only an industrial printer fits it.'],
    shape: [150, 150, 136, 64, 58, 72, 82, 78, 70, 62, 68, 58, 42, 28],
  },
  {
    id: 'helmet', seconds: 60, value: 1.6, market: 0.04, material: 1.4, design: 300000, unlockAt: 200000,
    name: ['Hełm do cosplayu', 'Cosplay helmet'],
    desc: ['Godzina pracy farmy na sztukę. Mało klientów, ale płacą najwięcej.', 'An hour of farm time per piece. Few buyers, but they pay the most.'],
    shape: [92, 98, 102, 104, 104, 102, 98, 92, 84, 74, 60, 42, 24],
  },
  {
    id: 'cableComb', seconds: 2, value: 1.1, market: 0.85, material: 0.68, design: 340000, unlockAt: 240000,
    name: ['Grzebień do kabli', 'Cable comb'],
    desc: ['Praktyczny organizer do kabli. Niskie zużycie filamentu sprzyja dużym seriom.', 'A practical cable organizer. Low filament use suits large batches.'],
    shape: [96, 96, 92, 80, 80, 76],
  },
  {
    id: 'pendant', seconds: 10, value: 1.15, market: 0.07, material: 0.25, design: 90000, unlockAt: 240000, printerType: 'resin',
    name: ['Wisior biżuteryjny', 'Jewellery pendant'],
    desc: ['Gładka żywica bez śladów warstw. Mały rynek, bardzo wysoka cena.', 'Smooth resin with no layer lines. A small market and a very high price.'],
    shape: [12, 22, 32, 40, 44, 44, 40, 32, 22, 14, 10],
  },
  {
    id: 'giantDragon', seconds: 120, value: 1.8, market: 0.0016, material: 1.4, design: 450000, unlockAt: 300000, printerType: 'industrial',
    name: ['Smok naturalnej wielkości', 'Life-size dragon'],
    desc: ['Smok większy od klienta. Parki rozrywki i galerie płacą za każdą łuskę.', 'A dragon bigger than the buyer. Theme parks and malls pay for every scale.'],
    shape: [176, 180, 172, 148, 118, 96, 110, 128, 140, 120, 90, 70, 52, 36],
  },
  {
    id: 'planter', seconds: 12, value: 1.3, market: 0.14, material: 0.92, design: 420000, unlockAt: 320000,
    name: ['Żebrowana doniczka', 'Ribbed planter'],
    desc: ['Lekka osłonka na biurko. Drukuje się dłużej, ale zużywa mniej filamentu niż figurka na sekundę pracy.', 'A lightweight desk planter. It takes longer to print but uses less filament per second than a figurine.'],
    shape: [52, 58, 58, 64, 64, 70, 70, 76, 76, 82, 82, 80],
  },
  {
    id: 'lunarBase', seconds: 40, value: 1.5, market: 0.055, material: 1.18, design: 540000, unlockAt: 450000,
    name: ['Makieta bazy księżycowej', 'Moon base model'],
    desc: ['Kopuły i lądowisko w miniaturze. Cierpliwi kolekcjonerzy dobrze płacą.', 'Miniature domes and a landing pad. Patient collectors pay well.'],
    shape: [132, 132, 124, 112, 94, 86, 78, 62, 50, 36, 22, 16],
  },
  {
    id: 'mechanicalOrrery', seconds: 90, value: 1.7, market: 0.023, material: 1.55, design: 720000, unlockAt: 650000,
    name: ['Mechaniczny układ planet', 'Mechanical orrery'],
    desc: ['Ruchome planety na wspólnej podstawie. Długi druk i wysoka cena dla nielicznych kupujących.', 'Moving planets on a shared base. A long print with a high price for a small market.'],
    shape: [108, 108, 88, 68, 54, 120, 124, 84, 58, 90, 54, 34, 42, 32],
  },
];

export const MODEL: Record<string, PrintModel> = Object.fromEntries(MODELS.map(m => [m.id, m]));
export const DEFAULT_MODEL = MODELS[0];
