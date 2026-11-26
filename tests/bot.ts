import { TREE } from '../src/content/tree';
import { seededRng } from '../src/core/ctx';
import { autoCost, drawP, droneCost, fabCap, fabCost, farmCost, freePts, mining, mktCost, panelCost, rate1, spoolPrice, supply } from '../src/core/formulas';
import { createGame } from '../src/core/game';
import { applyStartBonuses } from '../src/core/prestige';
import type { GameState, Meta } from '../src/core/state';
import { has } from '../src/core/state';
import { nodeStatus, reserveWyd } from '../src/systems/research';

export interface BotResult { ended: boolean; minutes: number; goalMinutes: number[]; ordersDone: number; ordersFailed: number }

/** Bot that plays like a skilled player: clicks early, watches filament and price, buys sensibly, takes orders. */
export function playthrough(seed = 1, maxHours = 6, dt = 0.25, meta?: Partial<Meta>, observe?: (s: GameState, t: number) => void): BotResult {
  const game = createGame({ rng: seededRng(seed) });
  if (meta) { Object.assign(game.s.meta, meta); applyStartBonuses(game.s); }
  const goalMinutes: number[] = [];
  let t = 0;
  while (t < maxHours * 3600 && !game.s.end) {
    const s = game.s;
    if (Math.abs(t - Math.round(t)) < 1e-6) {
      if (s.ph === 1) {
        if (s.auto < 15) for (let i = 0; i < 4; i++) game.act('print');
        if (s.fil < s.g * Math.max(10, rate1(s) * 15) && s.zl >= spoolPrice(s)) game.act('spool');
        if (!has(s, 'autocena')) {
          const target = Math.max(5, rate1(s) * 3);
          if (s.inv > target * 2) s.price = Math.max(0.1, Math.round(s.price * 0.97 * 100) / 100);
          else if (s.inv < target) s.price = Math.round(s.price * 1.03 * 100) / 100;
          s.price = Math.max(s.price, (spoolPrice(s) / s.spoolG) * s.g * 1.3);
        }
        const reserve = spoolPrice(s) * 2;
        if (s.farmOn && supply(s) < drawP(s) + 20 && panelCost(s) < s.zl - reserve) game.act('panel');
        else if (!(has(s, 'slicer') && s.farm >= 5) && s.farmOn && farmCost(s) < (s.zl - reserve) * 0.7 && supply(s) >= drawP(s) + 20) game.act('farm');
        else if (autoCost(s) < (s.zl - reserve) * 0.5) game.act('auto');
        if (!(has(s, 'slicer') && s.farm >= 5) && mktCost(s) < (s.zl - reserve) * 0.3) game.act('mkt');
        if (s.ord && !s.ord.acc) game.act('oacc');
        if (s.brk > 0) game.act('fix');
        if (s.col !== s.trend && s.goal >= 2) game.act(`col:${s.trend}`);
      } else {
        const free = s.inv - reserveWyd(s);
        if (mining(s) <= fabCap(s) * 1.2) { if (free >= droneCost(s)) game.act('drone'); }
        else if (free >= fabCost(s)) game.act('fab');
      }
      const f = freePts(s);
      if (f > 0) {
        const open = TREE.filter(n => !has(s, n.id) && nodeStatus(s, n) !== 'locked');
        const need = open.length ? Math.max(...open.map(n => n.ops)) : 0;
        if (need > s.mem * 1000) { const m = Math.min(f, Math.ceil((need - s.mem * 1000) / 1000)); s.mem += m; s.proc += f - m; }
        else s.proc += f;
      }
      const r = TREE.filter(n => nodeStatus(s, n) === 'ready').sort((a, b) => a.ops - b.ops)[0];
      if (r) game.act(`t:${r.id}`);
    }
    const before = game.s.goal;
    game.tick(dt);
    t = Math.round((t + dt) * 100) / 100;
    for (let k = before; k < game.s.goal; k++) goalMinutes[k] = t / 60;
    observe?.(game.s, t);
  }
  return { ended: game.s.end, minutes: t / 60, goalMinutes, ordersDone: game.s.ordDone, ordersFailed: game.s.ordFail };
}
