import { GOALS } from '../content/goals';
import { NODE, TREE, type TreeNode } from '../content/tree';
import { log, sfx, type Ctx } from '../core/ctx';
import { freePts, opsCap, opsRate, repNext } from '../core/formulas';
import { has, type GameState } from '../core/state';

export type NodeStatus = 'done' | 'locked' | 'need' | 'ready' | 'avail';

export const canBuy = (s: GameState, n: TreeNode) => s.ops >= n.ops && s.zl >= (n.zl ?? 0) && s.inv >= (n.wyd ?? 0);

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
  s.zl -= n.zl ?? 0;
  s.inv -= n.wyd ?? 0;
  s.done.push(n.id);
  n.fx(s);
  ctx.emit({ type: 'node', id });
  if (n.liftoff) {
    log(s, ctx, 'space');
    ctx.emit({ type: 'phase', phase: 2 });
  } else log(s, ctx, logKey, '@' + n.id);
  return true;
}

/** Ile figurek trzymać w rezerwie na najbliższy węzeł płatny figurkami, gdy moc już wystarcza. */
export function reserveWyd(s: GameState) {
  const w = TREE.filter(n => n.wyd && !has(s, n.id) && nodeStatus(s, n) !== 'locked' && s.ops >= n.ops).map(n => n.wyd!);
  return w.length ? Math.min(...w) : 0;
}

/** Moc obliczeniowa rośnie co tick, ograniczona pamięcią. */
export function computeSystem(s: GameState, dt: number) {
  s.ops = Math.min(opsCap(s), s.ops + opsRate(s) * dt);
}

/** Punkty reputacji za kolejne figurki. */
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
