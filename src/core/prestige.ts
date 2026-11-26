import { BAL } from '../content/balance';
import { KEPT_AUTOMATION, PATENT } from '../content/patents';
import { log, sfx, type Ctx } from './ctx';
import { createState, patLvl, type GameState } from './state';

/** Patents earned by resetting now: grows with the log of total figurines, so a finished game gives far more than an early reset. */
export function patentsFor(s: GameState): number {
  const x = Math.log10(Math.max(1, s.total) / BAL.prestigeBase);
  return x <= 0 ? 0 : Math.floor(BAL.prestigeScale * x ** 1.5);
}

/** Total figurines needed for the next patent at reset. */
export function nextPatentAt(s: GameState): number {
  const want = patentsFor(s) + 1;
  return BAL.prestigeBase * 10 ** ((want / BAL.prestigeScale) ** (2 / 3));
}

/** A new production line is possible once the print shop has reached space. */
export const canPrestige = (s: GameState) => s.ph === 2 && patentsFor(s) >= 1;

const filamentFactor = (lvl: number) => 1 - 0.06 * lvl;

function keepAutomation(s: GameState) {
  for (const id of KEPT_AUTOMATION[patLvl(s, 'keep')] ?? []) {
    if (!s.done.includes(id)) s.done.push(id);
    s.amOn[id] ??= true;
  }
}

/** Applies patents that act at the start of a line (money, nozzle, kept automation). */
export function applyStartBonuses(s: GameState) {
  s.zl += 500 * patLvl(s, 'start');
  s.g *= filamentFactor(patLvl(s, 'nozzle'));
  keepAutomation(s);
}

/** Starts a new production line. Keeps meta progress, achievements and colours; returns the fresh state. */
export function prestige(s: GameState, ctx: Ctx): GameState | null {
  if (!canPrestige(s)) return null;
  const gain = patentsFor(s);
  const next = createState();
  next.meta = { ...s.meta, pat: { ...s.meta.pat }, patents: s.meta.patents + gain, earned: s.meta.earned + gain, runs: s.meta.runs + 1 };
  next.ach = [...s.ach];
  next.colorsUsed = s.colorsUsed;
  next.col = s.col;
  applyStartBonuses(next);
  log(next, ctx, 'prestige', gain);
  ctx.emit({ type: 'prestige', gain });
  sfx(ctx, 'goal');
  return next;
}

/** Buys one level of a patent. Takes effect immediately. */
export function buyPatent(s: GameState, id: string): boolean {
  const p = PATENT[id];
  if (!p) return false;
  const lvl = patLvl(s, id);
  if (lvl >= p.max || s.meta.patents < p.cost(lvl)) return false;
  s.meta.patents -= p.cost(lvl);
  s.meta.pat[id] = lvl + 1;
  // Patents that act on the starting state also apply to the running line.
  if (id === 'start') s.zl += 500;
  if (id === 'nozzle') s.g *= filamentFactor(lvl + 1) / filamentFactor(lvl);
  if (id === 'keep') keepAutomation(s);
  return true;
}
