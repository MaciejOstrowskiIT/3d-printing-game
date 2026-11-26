type L = [string, string];

export interface Patent {
  id: string;
  n: L;
  /** Effect per level; {0} is replaced with the value at the next level. */
  d: L;
  max: number;
  /** Cost in patents of buying level `lvl + 1`. */
  cost: (lvl: number) => number;
  /** Value of the effect at a given level, inserted into the description. `money` marks amounts the UI formats as currency. */
  show: (lvl: number, lang: 0 | 1) => string | { money: number };
}

const KEEP_LABELS: [string[], string[]] = [
  ['kamerą i auto-zakupem filamentu', 'kamerą, auto-zakupem, dynamicznymi cenami i agencją', 'wszystkimi automatami poza zarządem'],
  ['camera and filament auto-buy', 'camera, auto-buy, dynamic pricing and the agency', 'every automation except the board'],
];

/** Permanent upgrades bought with patents earned by starting a new production line (prestige).
 *  Ids are stored in saves, so never rename them. Effects are applied in core/formulas.ts and core/prestige.ts. */
export const PATENTS: Patent[] = [
  { id: 'start', n: ['Kapitał startowy', 'Seed capital'], d: ['Każda nowa linia zaczyna z {0} na koncie.', 'Every new line starts with {0} in the bank.'], max: 5, cost: l => l + 1, show: l => ({ money: 500 * l }) },
  { id: 'speed', n: ['Lepsze drukarki', 'Better printers'], d: ['Drukarki pracują o {0}% szybciej.', 'Printers work {0}% faster.'], max: 10, cost: l => l + 1, show: l => String(15 * l) },
  { id: 'brand', n: ['Rozpoznawalność', 'Brand recognition'], d: ['Popyt wyższy o {0}%.', 'Demand {0}% higher.'], max: 10, cost: l => l + 1, show: l => String(15 * l) },
  { id: 'nozzle', n: ['Precyzyjne dysze', 'Precision nozzles'], d: ['Figurka zużywa o {0}% mniej filamentu.', 'Figurines use {0}% less filament.'], max: 5, cost: l => l + 2, show: l => String(6 * l) },
  { id: 'compute', n: ['Serwerownia', 'Server room'], d: ['Moc obliczeniowa rośnie o {0}% szybciej.', 'Compute grows {0}% faster.'], max: 8, cost: l => l + 1, show: l => String(25 * l) },
  { id: 'fame', n: ['Sława', 'Fame'], d: ['Punkty reputacji przychodzą o {0}% szybciej.', 'Reputation points come {0}% sooner.'], max: 5, cost: l => l + 2, show: l => String(Math.round(100 * (1 - 0.9 ** l))) },
  { id: 'keep', n: ['Zachowane automaty', 'Kept automation'], d: ['Nowa linia zaczyna z: {0}.', 'A new line starts with: {0}.'], max: 3, cost: l => [3, 6, 10][l] ?? 99, show: (l, lang) => KEEP_LABELS[lang][Math.max(0, l - 1)] },
  { id: 'investor', n: ['Inwestor', 'Investor'], d: ['Lot w kosmos kosztuje o {0}% mniej pieniędzy.', 'Liftoff costs {0}% less money.'], max: 4, cost: l => l + 2, show: l => String(15 * l) },
  { id: 'fleet', n: ['Gwiezdna flota', 'Star fleet'], d: ['Lot w kosmos zaczyna z {0} dronami.', 'Liftoff starts with {0} drones.'], max: 3, cost: l => 3 + 2 * l, show: l => String(1 + 3 * l) },
];

export const PATENT: Record<string, Patent> = Object.fromEntries(PATENTS.map(p => [p.id, p]));

/** Automation nodes kept by each level of the "keep" patent. */
export const KEPT_AUTOMATION: string[][] = [
  [],
  ['kamera', 'autobuy'],
  ['kamera', 'autobuy', 'autocena', 'automkt'],
  ['kamera', 'autobuy', 'autocena', 'automkt', 'autodruk', 'autopkt'],
];
