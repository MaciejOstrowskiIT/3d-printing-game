import { TREE } from '../content/tree';
import type { Ctx } from '../core/ctx';
import { autoCost, drawP, fabCap, farmCost, freePts, mining, mktCost, panelCost, rate1, spoolPrice, supply, unitCost, droneCost, fabCost } from '../core/formulas';
import { has, type GameState } from '../core/state';
import { acceptOrder } from './orders';
import { buyNode, nodeStatus, reserveWyd } from './research';

const on = (s: GameState, id: string) => has(s, id) && !!s.amOn[id];

/** All automations unlocked in the research tree. Each runs only while the player keeps it enabled. */
export function automationSystem(s: GameState, dt: number, ctx: Ctx) {
  if (s.ph === 1) {
    s.amT += dt;
    if (s.amT >= 1) {
      s.amT = 0;
      const free = s.zl - spoolPrice(s) * 3;

      if (on(s, 'autocena')) {
        const target = Math.max(5, rate1(s) * 3);
        const making = rate1(s) > 0 && s.fil >= s.g;
        if (s.inv > target * 2) s.price = Math.max(0.1, s.price * 0.97);
        else if (s.inv < target && making) s.price = Math.min(500, s.price * 1.03);
        s.price = Math.max(Math.round(s.price * 100) / 100, Math.ceil(unitCost(s) * 1.3 * 100) / 100);
      }

      // Once liftoff is within reach, the agencies stop buying so the player can save up for it.
      const saving = has(s, 'slicer') && !has(s, 'replik') && s.farm >= 5;
      if (on(s, 'automkt') && !saving && mktCost(s) < free * 0.2) { s.zl -= mktCost(s); s.mkt++; }

      if (on(s, 'autodruk') && free > 0 && !saving) {
        if (s.farmOn && supply(s) < drawP(s) + 20 && panelCost(s) < free * 0.25) { s.zl -= panelCost(s); s.panels++; }
        else if (s.farmOn && farmCost(s) < free * 0.25 && supply(s) >= drawP(s) + 20) { s.zl -= farmCost(s); s.farm++; }
        else if (autoCost(s) < free * 0.25) { s.zl -= autoCost(s); s.auto++; }
      }
    }
    if (on(s, 'b2b') && s.ord && !s.ord.acc) acceptOrder(s);
  } else if (on(s, 'autobud')) {
    const free = s.inv - reserveWyd(s);
    if (mining(s) <= fabCap(s) * 1.2) { if (free >= droneCost(s)) { s.inv -= droneCost(s); s.drones++; } }
    else if (free >= fabCost(s)) { s.inv -= fabCost(s); s.fabs++; }
  }

  if (on(s, 'autopkt') && freePts(s) > 0) {
    const open = TREE.filter(n => !has(s, n.id) && nodeStatus(s, n) !== 'locked');
    const need = open.length ? Math.max(...open.map(n => n.ops)) : 0;
    const f = freePts(s);
    if (need > s.mem * 1000) {
      const m = Math.min(f, Math.ceil((need - s.mem * 1000) / 1000));
      s.mem += m;
      s.proc += f - m;
    } else s.proc += f;
  }

  if (on(s, 'zarzad')) {
    const n = TREE.filter(n => !n.liftoff && nodeStatus(s, n) === 'ready').sort((a, b) => a.ops - b.ops)[0];
    if (n) buyNode(s, ctx, n.id, 'board');
  }
}
