import { BAL } from '../content/balance';

/** Argument wpisu w dzienniku. Prefiksy w stringach są zachowane dla zgodności ze starymi zapisami:
 *  '@id' węzeł drzewka, '$123' kwota, '#2' klient, '%1' przyczyna awarii, '~90' czas w s, '&3' kolor, 'pl|en' tekst celu. */
export type LogArg = string | number;
export interface LogEntry { k: string; a: LogArg[] }

export interface Order {
  n: number; got: number; time: number; left: number; offer: number; acc: boolean; c: number; pay: number;
}

/** Cały stan gry. Zwykły obiekt, który da się zapisać jako JSON. Nazwy pól są zgodne z wersją v3 jednoplikową. */
export interface GameState {
  v: number;
  ph: 1 | 2;
  total: number; sold: number; inv: number; zl: number; price: number;
  fil: number; g: number; spool: number; spoolG: number; spoolT: number; spoolD: number;
  auto: number; farm: number; farmOn: boolean; spd: number; dem: number; mkt: number;
  rep: number; proc: number; mem: number; ops: number;
  done: string[]; log: LogEntry[];
  acc: number; sacc: number;
  mat: number; mat0: number; drones: number; fabs: number; ft: number; dMul: number; fMul: number;
  end: boolean;
  amOn: Record<string, boolean>; amT: number;
  goal: number; tab: 'w' | 'r'; br: number; warn: boolean;
  ord: Order | null; ordT: number; ordDone: number; ordFail: number; pen: number;
  brk: number; brkC: number; brkT: number; fixT: number; fails: number;
  panels: number; pwWarn: boolean; ts: number;
  col: number; trend: number; trendT: number;
}

export const SAVE_VERSION = 4;

export const createState = (): GameState => ({
  v: SAVE_VERSION,
  ph: 1,
  total: 0, sold: 0, inv: 0, zl: 0, price: BAL.startPrice,
  fil: BAL.startFilament, g: BAL.filamentPerFigurine, spool: BAL.spoolBasePrice, spoolG: 1000, spoolT: 10, spoolD: 0,
  auto: 0, farm: 0, farmOn: false, spd: 1, dem: 1, mkt: 1,
  rep: 0, proc: 1, mem: 1, ops: 0,
  done: [], log: [],
  acc: 0, sacc: 0,
  mat: BAL.beltMatter, mat0: BAL.beltMatter, drones: 0, fabs: 0, ft: 0, dMul: 1, fMul: 1,
  end: false,
  amOn: {}, amT: 0,
  goal: 0, tab: 'w', br: 0, warn: false,
  ord: null, ordT: 45, ordDone: 0, ordFail: 0, pen: 0,
  brk: 0, brkC: 0, brkT: 120, fixT: 0, fails: 0,
  panels: 0, pwWarn: false, ts: 0,
  col: 0, trend: 2, trendT: 150,
});

export const has = (s: GameState, id: string) => s.done.includes(id);
