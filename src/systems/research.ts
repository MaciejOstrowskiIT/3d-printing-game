import { GOALS } from '../content/goals';
import { NODE, TREE, type TreeNode } from '../content/tree';
import { log, sfx, type Ctx } from '../core/ctx';
import { freePts, opsCap, opsRate, repNext } from '../core/formulas';
import { has, patLvl, type GameState } from '../core/state';

export type NodeStatus = 'done' | 'locked' | 'need' | 'ready' | 'avail';

/** Money cost of a node, after patents (Investor discounts liftoff). */
export const nodeZl = (s: GameState, n: TreeNode) => (n.zl ?? 0) * (n.liftoff ? 1 - 0.15 * patLvl(s, 'investor') : 1);

export const canBuy = (s: GameState, n: TreeNode) => s.ops >= n.ops && s.zl >= nodeZl(s, n) && s.inv >= (n.wyd ?? 0);

export function nodeStatus(s: GameState, n: TreeNode): NodeStatus {
  if (has(s, n.id)) return 'done';
  if ((n.req ?? []).some(r => !has(s, r))) return 'locked';
  if (n.need && n.need.value(s) < n.need.target) return 'need';
  return canBuy(s, n) ? 'ready' : 'avail';
}

export function buyNode(s: GameState, ctx: Ctx, id: string, logKey = 'node'): boolean {
  const n = NODE[id];
  if (!n || nodeStatus(s, n) !== 'ready') return false;
  s.ops -= n.ops;
  s.zl -= nodeZl(s, n);
  s.inv -= n.wyd ?? 0;
  s.done.push(n.id);
  n.fx(s);
  ctx.emit({ type: 'node', id });
  if (n.liftoff) {
    s.drones += 3 * patLvl(s, 'fleet');
    log(s, ctx, 'space');
    ctx.emit({ type: 'phase', phase: 2 });
  } else log(s, ctx, logKey, '@' + n.id);
  return true;
}

/** Figurines to keep in reserve for the next figurine-priced node once compute is sufficient. */
export function reserveWyd(s: GameState) {
  const w = TREE.filter(n => n.wyd && !has(s, n.id) && nodeStatus(s, n) !== 'locked' && s.ops >= n.ops).map(n => n.wyd!);
  return w.length ? Math.min(...w) : 0;
}

/** Compute grows every tick, capped by memory. */
export function computeSystem(s: GameState, dt: number) {
  s.ops = Math.min(opsCap(s), s.ops + opsRate(s) * dt);
}

/** Reputation points for printed figurines. */
export function reputationSystem(s: GameState, _dt: number, ctx: Ctx) {
  let gained = 0;
  while (s.total >= repNext(s)) { s.rep++; gained++; }
  if (gained === 1) log(s, ctx, 'rep1');
  else if (gained > 1) log(s, ctx, 'repN', gained);
}

export function goalsSystem(s: GameState, _dt: number, ctx: Ctx) {
  while (s.goal < GOALS.length) {
    const [a, b] = GOALS[s.goal].p(s);
    if (a < b) break;
    log(s, ctx, 'goal', GOALS[s.goal].t[0] + '|' + GOALS[s.goal].t[1]);
    ctx.emit({ type: 'goal', index: s.goal });
    s.goal++;
    sfx(ctx, 'goal');
  }
}

export function assignPoint(s: GameState, to: 'proc' | 'mem', all = false) {
  const f = freePts(s);
  if (f <= 0) return;
  s[to] += all ? f : 1;
}
