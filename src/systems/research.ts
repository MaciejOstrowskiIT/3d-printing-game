import { bookCash } from './workshopStats';
import { GOALS } from '../content/goals';
import { NODE, QUANTUM_BRANCH, TREE, type TreeNode } from '../content/tree';
import { log, sfx, type Ctx } from '../core/ctx';
import { freePts, opsCap, opsRate, repNext } from '../core/formulas';
import { has, patLvl, type GameState } from '../core/state';
import { quantumVisible } from './quantum';

export type NodeStatus = 'done' | 'locked' | 'need' | 'ready' | 'avail';

export const researchUnlocked = (s: GameState) =>
  s.goal >= 5 || s.rep > 0 || s.done.length > 0 || s.meta.runs > 0 || s.meta.patents > 0;

/** Money cost of a node, after patents (Investor discounts liftoff). */
export const nodeZl = (s: GameState, n: TreeNode) => (n.zl ?? 0) * (n.liftoff ? 1 - 0.15 * patLvl(s, 'investor') : 1);

export const canBuy = (s: GameState, n: TreeNode) => s.ops >= n.ops && s.qp >= (n.qp ?? 0) && s.zl >= nodeZl(s, n) && s.inv >= (n.wyd ?? 0);

/** Quantum nodes stay out of sight until the machine is bought or within reach of memory. */
export const nodeShown = (s: GameState, n: TreeNode) => n.col !== QUANTUM_BRANCH || quantumVisible(s);

export function nodeStatus(s: GameState, n: TreeNode): NodeStatus {
  if (has(s, n.id)) return 'done';
  if ((n.req ?? []).some(r => !has(s, r)) || (n.reqAny?.length && !n.reqAny.some(r => has(s, r)))) return 'locked';
  if (n.need && n.need.value(s) < n.need.target) return 'need';
  return canBuy(s, n) ? 'ready' : 'avail';
}

export function buyNode(s: GameState, ctx: Ctx, id: string, logKey = 'node'): boolean {
  const n = NODE[id];
  if (!n || nodeStatus(s, n) !== 'ready') return false;
  s.ops -= n.ops;
  s.qp -= n.qp ?? 0;
  bookCash(s, 'other', nodeZl(s, n));
  s.inv -= n.wyd ?? 0;
  s.done.push(n.id);
  n.fx?.(s);
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

export interface ResearchPick {
  node: TreeNode;
  status: NodeStatus;
  /** 0..1 progress toward compute, money and the "need" condition (1 when not required). */
  ops: number; zl: number; need: number;
  /** The node needs more compute than memory can hold: the player must add memory first. */
  memoryShort: boolean;
}

/** The research worth showing next to the game: ready nodes first, then the ones closest to affordable,
 *  then the ones waiting for a condition. Space nodes appear only in the space phase. */
export function nextResearch(s: GameState, limit = 3): ResearchPick[] {
  const order: Record<NodeStatus, number> = { ready: 0, avail: 1, need: 2, locked: 9, done: 9 };
  const picks = TREE.map(n => {
    const status = nodeStatus(s, n);
    const zlCost = n.zl ? nodeZl(s, n) : 0;
    return {
      node: n, status,
      ops: n.ops ? Math.min(1, s.ops / n.ops) : 1,
      zl: zlCost ? Math.min(1, Math.max(0, s.zl) / zlCost) : 1,
      need: n.need ? Math.min(1, n.need.value(s) / n.need.target) : 1,
      memoryShort: n.ops > opsCap(s),
    };
  }).filter(p => order[p.status] < 9 && (s.ph === 2 || p.node.col !== 3) && nodeShown(s, p.node));
  const closeness = (p: ResearchPick) => (p.status === 'need' ? p.need : Math.min(p.ops, p.zl));
  return picks.sort((a, b) => order[a.status] - order[b.status] || closeness(b) - closeness(a)).slice(0, limit);
}

