import { autoCost, gpu, spoolPrice } from '../core/formulas';
import type { GameState } from '../core/state';
import { nodeStatus, researchUnlocked } from '../systems/research';
import { TREE } from './tree';

export const HINTS = [
  {
    id: 'print',
    text: ['Przytrzymaj „Drukuj figurkę”, aby zacząć produkcję.', 'Hold Print a figurine to start production.'],
    when: (s: GameState) => s.goal === 0 && s.fil > 0,
  },
  {
    id: 'sell',
    text: ['Klienci kupują figurki automatycznie. Jeśli zapas rośnie, obniż cenę w panelu Sprzedaż.', 'Customers buy figurines automatically. Lower the price in Sales if stock piles up.'],
    when: (s: GameState) => s.goal === 1,
  },
  {
    id: 'spool',
    text: ['Kończy się filament. Kup szpulę w panelu Inwestycje.', 'Filament is running low. Buy a spool in Investments.'],
    when: (s: GameState) => s.goal >= 1 && s.fil <= 15 * gpu(s) && s.zl >= spoolPrice(s),
  },
  {
    id: 'printer',
    text: ['Stać cię na pierwszą drukarkę automatyczną. Kup ją w panelu Inwestycje.', 'You can afford your first auto printer. Buy it in Investments.'],
    when: (s: GameState) => s.goal >= 2 && s.auto === 0 && s.zl >= autoCost(s),
  },
  {
    id: 'research',
    text: ['Otwórz zakładkę Rozwój i odblokuj pierwszy dostępny projekt.', 'Open Research and unlock your first available project.'],
    when: (s: GameState) => s.done.length === 0 && researchUnlocked(s) && TREE.some(node => nodeStatus(s, node) === 'ready'),
  },
] as const;

export type HintId = typeof HINTS[number]['id'];
