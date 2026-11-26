import { BAL } from '../content/balance';

/** Log entry argument. String prefixes are kept for compatibility with old saves:
 *  '@id' tree node, '$123' money, '#2' client, '%1' breakdown cause, '~90' duration in s, '&3' colour, '!id' achievement, 'pl|en' goal text. */
export type LogArg = string | number;
export interface LogEntry { k: string; a: LogArg[] }

/** Progress that survives a new production line (prestige). */
export interface Meta {
  /** Patents available to spend. */
  patents: number;
  /** Patents earned over all lines. */
  earned: number;
  /** Completed resets. */
  runs: number;
  /** Bought patent levels by id. */
  pat: Record<string, number>;
}

export interface Order {
  n: number; got: number; time: number; left: number; offer: number; acc: boolean; c: number; pay: number;
}

/** The whole game state. A plain JSON-serialisable object. Field names match the single-file v3 version. */
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
  /** Rewarded boost: seconds left, and seconds until it can be activated again. */
  boostT: number; boostCd: number;
  /** Unlocked achievement ids, check timer, and a bitmask of filament colours ever used. */
  ach: string[]; achT: number; colorsUsed: number;
  meta: Meta;
}

export const SAVE_VERSION = 5;

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
  boostT: 0, boostCd: 0,
  ach: [], achT: 0, colorsUsed: 1,
  meta: { patents: 0, earned: 0, runs: 0, pat: {} },
});

export const has = (s: GameState, id: string) => s.done.includes(id);
export const patLvl = (s: GameState, id: string) => s.meta?.pat?.[id] ?? 0;
