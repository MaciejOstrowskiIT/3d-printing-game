import { AUTOMATIONS } from './tree';
import { COLORS } from './colors';
import { MODELS } from './models';
import { has, type GameState } from '../core/state';

type L = [string, string];
export interface Achievement {
  id: string;
  n: L;
  d: L;
  /** Hidden achievements show as "???" until unlocked. */
  hidden?: boolean;
  check: (s: GameState) => boolean;
}

const allColors = (1 << COLORS.length) - 1;

/** Achievements. Order = display order; ids are stored in saves, so never rename them. */
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', n: ['Pierwsza warstwa', 'First layer'], d: ['Wydrukuj pierwszą figurkę.', 'Print your first figurine.'], check: s => s.total >= 1 },
  { id: 'k1', n: ['Seria próbna', 'Test batch'], d: ['Wydrukuj 1000 figurek.', 'Print 1,000 figurines.'], check: s => s.total >= 1e3 },
  { id: 'm1', n: ['Milion warstw', 'A million layers'], d: ['Wydrukuj milion figurek.', 'Print a million figurines.'], check: s => s.total >= 1e6 },
  { id: 'b1', n: ['Masowa produkcja', 'Mass production'], d: ['Wydrukuj miliard figurek.', 'Print a billion figurines.'], check: s => s.total >= 1e9 },
  { id: 'auto1', n: ['Nie muszę klikać', 'Hands off'], d: ['Kup pierwszą drukarkę automatyczną.', 'Buy your first auto printer.'], check: s => s.auto >= 1 },
  { id: 'auto50', n: ['Ściana drukarek', 'Wall of printers'], d: ['Miej 50 drukarek automatycznych.', 'Own 50 auto printers.'], check: s => s.auto >= 50 },
  { id: 'farm1', n: ['Rolnik', 'Farmer'], d: ['Zbuduj pierwszą farmę drukarek.', 'Build your first printer farm.'], check: s => s.farm >= 1 },
  { id: 'farm10', n: ['Agroholding', 'Agribusiness'], d: ['Miej 10 farm drukarek.', 'Own 10 printer farms.'], check: s => s.farm >= 10 },
  { id: 'order1', n: ['Pierwszy klient biznesowy', 'First business client'], d: ['Zrealizuj zamówienie specjalne.', 'Deliver a special order.'], check: s => s.ordDone >= 1 },
  { id: 'order10', n: ['Solidny dostawca', 'Reliable supplier'], d: ['Zrealizuj 10 zamówień bez żadnej wpadki.', 'Deliver 10 orders without a single failure.'], check: s => s.ordDone >= 10 && s.ordFail === 0 },
  { id: 'rich', n: ['Milioner z garażu', 'Garage millionaire'], d: ['Miej milion na koncie.', 'Have a million in the bank.'], check: s => s.zl >= 1e6 },
  { id: 'rainbow', n: ['Tęcza', 'Rainbow'], d: ['Drukuj w każdym kolorze filamentu.', 'Print in every filament colour.'], check: s => (s.colorsUsed & allColors) === allColors },
  { id: 'designs', n: ['Pełny katalog', 'Full catalogue'], d: ['Kup projekty wszystkich modeli.', 'Buy the designs of every model.'], check: s => MODELS.every(m => s.mdls?.includes(m.id)) },
  { id: 'trendy', n: ['Na czasie', 'On trend'], d: ['Drukuj w modnym kolorze.', 'Print in the trending colour.'], check: s => s.goal >= 2 && s.col === s.trend && s.total > 0 },
  { id: 'fixer', n: ['Złota rączka', 'Handyman'], d: ['Przetrwaj 10 awarii.', 'Survive 10 breakdowns.'], check: s => s.fails >= 10 },
  { id: 'robots', n: ['Firma bez ludzi', 'Nobody at the wheel'], d: ['Odblokuj wszystkie automatyzacje na Ziemi.', 'Unlock every automation on Earth.'], check: s => AUTOMATIONS.filter(id => id !== 'autobud').every(id => has(s, id)) },
  { id: 'liftoff', n: ['Houston, drukujemy', 'Houston, we are printing'], d: ['Wyślij drukarnię w kosmos.', 'Send the print shop into space.'], check: s => s.ph === 2 },
  { id: 'half', n: ['Połowa pasa', 'Half the belt'], d: ['Przetwórz połowę pasa asteroid.', 'Process half of the asteroid belt.'], check: s => s.ph === 2 && s.mat <= s.mat0 / 2 },
  { id: 'line2', n: ['Druga linia', 'Second line'], d: ['Zacznij nową linię produkcyjną.', 'Start a new production line.'], check: s => s.meta.runs >= 1 },
  { id: 'patents20', n: ['Kancelaria patentowa', 'Patent office'], d: ['Zdobądź łącznie 20 patentów.', 'Earn 20 patents in total.'], check: s => s.meta.earned >= 20 },
  { id: 'end', n: ['Wszystko jest figurką', 'Everything is a figurine'], d: ['Ukończ grę.', 'Finish the game.'], hidden: true, check: s => s.end },
];

export const ACH: Record<string, Achievement> = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));
