import { BAL } from '../content/balance';
import { achievementsSystem } from '../systems/achievements';
import { automationSystem } from '../systems/automation';
import { activateBoost, boostSystem } from '../systems/boost';
import { breakdownsSystem, repair } from '../systems/breakdowns';
import { energySystem } from '../systems/energy';
import { marketSystem, setColor } from '../systems/market';
import { acceptOrder, declineOrder, ordersSystem } from '../systems/orders';
import { buySpool, printManual, productionSystem } from '../systems/production';
import { assignPoint, buyNode, computeSystem, goalsSystem, reputationSystem } from '../systems/research';
import { changePrice, salesSystem } from '../systems/sales';
import { buyDrone, buyFab, spaceSystem } from '../systems/space';
import { log, sfx, type Ctx, type GameEvent } from './ctx';
import { autoCost, farmCost, mktCost, panelCost } from './formulas';
import { buyPatent, prestige } from './prestige';
import { createState, type GameState } from './state';

export type System = (s: GameState, dt: number, ctx: Ctx) => void;

/** System order within one tick. A new mechanic = a new file in systems/ plus an entry here. */
export const SYSTEMS: System[] = [
  boostSystem,
  computeSystem,
  productionSystem,
  energySystem,
  salesSystem,
  marketSystem,
  ordersSystem,
  breakdownsSystem,
  spaceSystem,
  automationSystem,
  reputationSystem,
  goalsSystem,
  achievementsSystem,
];

/** Player actions. The UI only sends these strings and never mutates game state itself. */
export type Action =
  | 'print' | 'spool' | 'auto' | 'farm' | 'panel' | 'mkt' | 'drone' | 'fab'
  | 'pminus' | 'pplus' | 'oacc' | 'odec' | 'fix'
  | 'proc1' | 'procmax' | 'mem1' | 'memmax' | 'boost' | 'adfail' | 'prestige'
  | `t:${string}` | `col:${number}` | `am:${string}:${0 | 1}` | `pat:${string}`;

export interface Game {
  readonly s: GameState;
  tick(dt: number): void;
  act(a: Action): boolean;
  /** Simulates time spent away and logs what was produced. */
  catchUp(seconds: number): void;
  load(s: GameState): void;
  reset(logKey?: string): void;
  on(fn: (e: GameEvent) => void): () => void;
}

export function createGame(opts: { state?: GameState; rng?: () => number } = {}): Game {
  let s = opts.state ?? createState();
  const listeners = new Set<(e: GameEvent) => void>();
  const ctx: Ctx = { rng: opts.rng ?? Math.random, offline: false, emit: e => listeners.forEach(fn => fn(e)) };
  if (!s.log.length) log(s, ctx, 'start');

  const spend = (cost: number, apply: () => void) => {
    if (s.zl < cost) return false;
    s.zl -= cost;
    apply();
    sfx(ctx, 'buy');
    return true;
  };

  const game: Game = {
    get s() { return s; },
    tick(dt) {
      if (s.end) return;
      if (!ctx.offline) s.play += dt;
      for (const sys of SYSTEMS) sys(s, dt, ctx);
    },
    act(a) {
      if (a === 'print') return printManual(s, ctx);
      if (a === 'spool') { const ok = buySpool(s); if (ok) sfx(ctx, 'buy'); return ok; }
      if (a === 'auto') return spend(autoCost(s), () => { s.auto++; if (s.auto === 1) log(s, ctx, 'firstPr'); });
      if (a === 'farm') return spend(farmCost(s), () => { s.farm++; log(s, ctx, 'farm', s.farm); });
      if (a === 'panel') return spend(panelCost(s), () => { s.panels++; });
      if (a === 'mkt') return spend(mktCost(s), () => { s.mkt++; log(s, ctx, 'mkt', s.mkt); });
      if (a === 'drone') { const ok = buyDrone(s); if (ok) sfx(ctx, 'buy'); return ok; }
      if (a === 'fab') { const ok = buyFab(s); if (ok) sfx(ctx, 'buy'); return ok; }
      if (a === 'pminus') { changePrice(s, -0.1); return true; }
      if (a === 'pplus') { changePrice(s, 0.1); return true; }
      if (a === 'oacc') { acceptOrder(s); sfx(ctx, 'buy'); return true; }
      if (a === 'odec') { declineOrder(s, ctx); return true; }
      if (a === 'fix') { repair(s, ctx); sfx(ctx, 'buy'); return true; }
      if (a === 'boost') return activateBoost(s, ctx);
      if (a === 'prestige') { const next = prestige(s, ctx); if (next) s = next; return !!next; }
      if (a.startsWith('pat:')) { const ok = buyPatent(s, a.slice(4)); if (ok) sfx(ctx, 'buy'); return ok; }
      if (a === 'adfail') { log(s, ctx, 'boostFail'); return true; }
      if (a === 'proc1') { assignPoint(s, 'proc'); return true; }
      if (a === 'procmax') { assignPoint(s, 'proc', true); return true; }
      if (a === 'mem1') { assignPoint(s, 'mem'); return true; }
      if (a === 'memmax') { assignPoint(s, 'mem', true); return true; }
      if (a.startsWith('t:')) { const ok = buyNode(s, ctx, a.slice(2)); if (ok) sfx(ctx, 'buy'); return ok; }
      if (a.startsWith('am:')) { const [, id, v] = a.split(':'); s.amOn[id] = v === '1'; log(s, ctx, v === '1' ? 'amOn' : 'amOff', '@' + id); return true; }
      if (a.startsWith('col:')) { const c = +a.slice(4); if (c === s.col) return false; setColor(s, c); sfx(ctx, 'buy'); return true; }
      return false;
    },
    catchUp(seconds) {
      if (s.end || seconds <= 60) return;
      const t0 = s.total, z0 = s.zl;
      ctx.offline = true;
      let rem = Math.min(seconds, BAL.offlineMaxSeconds);
      while (rem > 0) { const d = Math.min(1, rem); game.tick(d); rem -= d; }
      ctx.offline = false;
      const made = Math.floor(s.total - t0);
      if (made >= 1) {
        if (s.zl - z0 >= 1) log(s, ctx, 'off', '~' + Math.round(seconds), made, '$' + (s.zl - z0));
        else log(s, ctx, 'off2', '~' + Math.round(seconds), made);
      }
    },
    load(next) { s = next; },
    reset(logKey = 'fresh') { s = createState(); log(s, ctx, logKey); },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
  return game;
}
