import { bookCash } from './workshopStats';
import { BAL } from '../content/balance';
import { TREE } from '../content/tree';
import type { Ctx } from '../core/ctx';
import { activeStockWork, autoCost, drawP, fabCap, farmCost, freePts, mining, mktCost, panelCost, rate1, spoolPrice, supply, unitCost, droneCost, fabCost, gpu, clearingPrice } from '../core/formulas';
import { has, type GameState } from '../core/state';
import { acceptOrder } from './orders';
import { acceptMarketEvent, canAfford } from './marketEvents';
import { deliverDaily } from './dailyOrder';
import { bestModel, selectModel } from './models';
import { buyNode, nodeStatus, reserveWyd } from './research';

const on = (s: GameState, id: string) => has(s, id) && !!s.amOn[id];

/** Liftoff is within reach (its prerequisites are done): automations stop spending so the shop can save up. */
export const savingForLiftoff = (s: GameState) => !has(s, 'replik') && TREE.some(n => n.liftoff && (n.req ?? []).every(r => has(s, r))) && s.farm >= 5;

/** Dynamic pricing, once per second. Aims for the price that sells what the printers make, plus a slow drain of
 *  extra stock (never more than autoPriceMaxDrain × production), and moves there by at most autoPriceStep a second.
 *  A smooth controller: the old one overshot, piled up stock, then crashed the price and dumped it all at once. */
export function autoPrice(s: GameState) {
  const rate = rate1(s) > 0 && s.fil >= gpu(s) ? rate1(s) : 0;
  const target = Math.max(10, rate * BAL.autoPriceStockSeconds);
  const stock = activeStockWork(s);
  const drain = Math.min(BAL.autoPriceMaxDrain, Math.max(0.5, 1 + (stock - target) / (target * 4)));
  const sales = rate > 0 ? rate * drain : Math.max(stock / 60, 0.1);
  const want = clearingPrice(s, sales);
  const step = s.price * BAL.autoPriceStep;
  const next = s.price + Math.max(-step, Math.min(step, want - s.price));
  s.price = Math.min(500, Math.max(Math.round(next * 1000) / 1000, Math.ceil(unitCost(s) * 1.3 * 1000) / 1000));
}

/** All automations unlocked in the research tree. Each runs only while the player keeps it enabled. */
export function automationSystem(s: GameState, dt: number, ctx: Ctx) {
  if (s.ph === 1) {
    s.amT += dt;
    if (s.amT >= 1) {
      s.amT = 0;
      const free = s.zl - spoolPrice(s) * 3;

      if (on(s, 'autocena')) autoPrice(s);

      // Once liftoff is within reach, the agencies stop buying so the player can save up for it.
      const saving = savingForLiftoff(s);
      if (on(s, 'automkt') && !saving && mktCost(s) < free * 0.2) { bookCash(s, 'other', mktCost(s)); s.mkt++; }

      if (on(s, 'autodruk') && free > 0 && !saving) {
        if (s.farmOn && supply(s) < drawP(s) + 20 && panelCost(s) < free * 0.25) { bookCash(s, 'equipment', panelCost(s)); s.panels++; }
        else if (s.farmOn && farmCost(s) < free * 0.25 && supply(s) >= drawP(s) + 20) { bookCash(s, 'equipment', farmCost(s)); s.farm++; }
        else if (autoCost(s) < free * 0.25) { bookCash(s, 'equipment', autoCost(s)); s.auto++; }
      }
    }
    if (on(s, 'b2b') && s.ord && !s.ord.acc) acceptOrder(s);
    if (s.ph === 1) {
      // Market agent: takes market offers costing under a third of the funds.
      if (on(s, 'autooffer') && s.mev && canAfford(s) && s.mev.cost < s.zl / 3) acceptMarketEvent(s, ctx);
      // Dispatcher: ships the order of the day once there is enough stock.
      if (on(s, 'autodaily') && s.dord && !s.dord.done && s.dord.day === s.dday && s.inv >= s.dord.n) deliverDaily(s, ctx);
      // Production planner: every 30 s, switches to the most profitable owned model.
      if (on(s, 'automodel')) {
        s.planT = (s.planT ?? 0) + dt;
        if (s.planT >= 30) { s.planT = 0; const best = bestModel(s); if (best !== s.mdl) selectModel(s, ctx, best); }
      }
    }
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

  // The board buys the cheapest ready node, but not while the shop is saving compute and money for liftoff:
  // with a large tree it would otherwise keep spending on side nodes and liftoff would never come.
  if (on(s, 'zarzad') && !(s.ph === 1 && savingForLiftoff(s))) {
    const n = TREE.filter(n => !n.liftoff && nodeStatus(s, n) === 'ready').sort((a, b) => a.ops - b.ops)[0];
    if (n) buyNode(s, ctx, n.id, 'board');
  }
}
