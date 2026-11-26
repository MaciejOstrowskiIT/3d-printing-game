import type { CashPeriod } from '../systems/workshopStats';
import type { ModelStock } from '../systems/inventory';
import { DEFAULT_MATERIAL } from '../content/materials';
import type { DailyOrder } from '../systems/dailyOrder';
import { BAL } from '../content/balance';

/** Log entry argument. String prefixes are kept for compatibility with old saves:
 *  '@id' tree node, '$123' money, '#2' client, '%1' breakdown cause, '~90' duration in s, '&3' colour, '!id' achievement, '^id' market event, '*id' print model, '+id' calendar event, '=id' story message sender, '/id' material, 'pl|en' goal text. */
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

/** A market event waiting for the player's decision. cost is fixed when it appears (money or figurines). */
export interface PendingMarketEvent { id: string; offer: number; cost: number }
/** A running market effect and its seconds left. */
export interface MarketEffect { id: string; t: number }

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
  panels: number; pwWarn: boolean; ts: number; serverThrough: number;
  col: number; trend: number; trendT: number;
  /** Rewarded boost: seconds left, and seconds until it can be activated again. */
  boostT: number; boostCd: number;
  /** Unlocked achievement ids, check timer, and a bitmask of filament colours ever used. */
  ach: string[]; achT: number; colorsUsed: number;
  /** Seconds of active (online) play on this line; offline catch-up does not count. Used for analytics. */
  play: number;
  /** Market events: pending offer, seconds until the next one, running effects. */
  mev: PendingMarketEvent | null; mevT: number; mfx: MarketEffect[];
  /** Print models (content/models.ts): selected model, owned designs, click tool level, manual progress on the current piece. */
  mdl: string; mdls: string[]; clk: number; mp: number;
  /** Rewarded offline bonus waiting to be claimed: money, figurines, seconds left. */
  offB: number; offBi: number; offBT: number;
  /** Print-time multiplier: 1 normally, BAL.realisticSlow on a realistic line. */
  slow: number;
  /** Order of the day: last day seen (local day number), today's order, current and best streak. */
  dday: number; dord: DailyOrder | null; dstreak: number; dbest: number;
  /** Latest local day number reported by the UI; calendar events follow it. */
  today: number;
  /** Story messages already shown, the one open on screen, and a 1 s check timer. */
  story: string[]; msg: string | null; msgT: number;
  meta: Meta;
  precision: boolean; bedCalibrated: boolean; dryerInstalled: boolean; stockPremium: number;
  /** Active feedstock and reserves. fil holds the active feedstock, including PLA in old saves. */
  materialId: string;
  materialStock: Record<string, number>;
  /** Filament run-out: early warning shown, switch hint shown, switch to a stocked material automatically. */
  lowFil: boolean; matHint: boolean; autoMat: boolean;
  modelStock: Record<string, ModelStock>;
  orderStock: Record<string, number>;
  financeTime: number;
  finance: CashPeriod[];
  /** Production planner automation: seconds since its last check. */
  planT: number;
}

export const SAVE_VERSION = 6;

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
  panels: 0, pwWarn: false, ts: 0, serverThrough: 0,
  col: 0, trend: 2, trendT: 150,
  boostT: 0, boostCd: 0,
  ach: [], achT: 0, colorsUsed: 1,
  play: 0,
  mev: null, mevT: BAL.marketEventFirst, mfx: [],
  mdl: 'fig', mdls: ['fig'], clk: 0, mp: 0,
  offB: 0, offBi: 0, offBT: 0,
  slow: 1,
  dday: 0, dord: null, dstreak: 0, dbest: 0,
  today: 0,
  story: [], msg: null, msgT: 0,
  meta: { patents: 0, earned: 0, runs: 0, pat: {} },
  precision: false, bedCalibrated: false, dryerInstalled: false, stockPremium: 0,
  materialId: DEFAULT_MATERIAL.id, materialStock: {},
  lowFil: false, matHint: false, autoMat: false,
  modelStock: {}, orderStock: {},
  financeTime: 0, finance: [],
  planT: 0,
});

export const has = (s: GameState, id: string) => s.done.includes(id);
export const patLvl = (s: GameState, id: string) => s.meta?.pat?.[id] ?? 0;
