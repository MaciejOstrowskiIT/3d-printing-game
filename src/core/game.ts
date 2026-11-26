import { BAL } from '../content/balance';
import { achievementsSystem } from '../systems/achievements';
import { automationSystem } from '../systems/automation';
import { activateBoost, boostSystem } from '../systems/boost';
import { breakdownsSystem, repair } from '../systems/breakdowns';
import { energySystem } from '../systems/energy';
import { selectMaterial } from '../systems/materials';
import { marketSystem, setColor } from '../systems/market';
import { acceptMarketEvent, declineMarketEvent, marketEventsSystem } from '../systems/marketEvents';
import { acceptOrder, declineOrder, ordersSystem } from '../systems/orders';
import { setQualityAction } from '../systems/printQuality';
import { buySpool, productionSystem } from '../systems/production';
import { deliverDaily, newDay } from '../systems/dailyOrder';
import { dismissMessage, storySystem } from '../systems/story';
import { filamentSystem, idleForFilament, toggleAutoMaterial } from '../systems/filament';
import { claimOfflineBonus, grantOfflineBonus, offlineBonusSystem } from '../systems/offlineBonus';
import { buyClickTool, buyDesign, printManual, selectModel } from '../systems/models';
import { assignPoint, buyNode, computeSystem, goalsSystem, reputationSystem } from '../systems/research';
import { changePrice, salesSystem } from '../systems/sales';
import { buyDrone, buyFab, spaceSystem } from '../systems/space';
import { log, sfx, type Ctx, type GameEvent } from './ctx';
import { autoCost, farmCost, mktCost, model, panelCost } from './formulas';
import { buyPatent, prestige } from './prestige';
import { createState, type GameState, type LogEntry } from './state';

export type System = (s: GameState, dt: number, ctx: Ctx) => void;

/** System order within one tick. A new mechanic = a new file in systems/ plus an entry here. */
export const SYSTEMS: System[] = [
  boostSystem,
  computeSystem,
  productionSystem,
  energySystem,
  salesSystem,
  marketSystem,
  marketEventsSystem,
  ordersSystem,
  breakdownsSystem,
  spaceSystem,
  automationSystem,
  reputationSystem,
  goalsSystem,
  achievementsSystem,
  offlineBonusSystem,
  storySystem,
  filamentSystem,
];

/** Player actions. The UI only sends these strings and never mutates game state itself. */
export type Action =
  | 'calibrate' | 'dryer' | 'precision' | 'automat'
  | 'print' | 'spool' | 'auto' | 'farm' | 'panel' | 'mkt' | 'drone' | 'fab'
  | 'pminus' | 'pplus' | 'oacc' | 'odec' | 'fix' | 'mevyes' | 'mevno' | 'tool'
  | 'proc1' | 'procmax' | 'mem1' | 'memmax' | 'boost' | 'adfail' | 'prestige' | 'prestigeR' | 'offx2' | 'daily' | 'msgok'
  | `t:${string}` | `col:${number}` | `material:${string}` | `mdl:${string}` | `stl:${string}` | `day:${number}` | `am:${string}:${0 | 1}` | `pat:${string}`;

export interface Game {
  readonly s: GameState;
  tick(dt: number): void;
  act(a: Action): boolean;
  /** Simulates time spent away and logs what was produced. */
  /** Simulates time away; returns the summary line, plus how long printers stood idle without filament. */
  catchUp(seconds: number): (LogEntry & { idle?: number }) | undefined;
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
      if (a === 'calibrate' || a === 'dryer' || a === 'precision') return setQualityAction(s, a);
      if (a === 'print') return printManual(s, ctx);
      if (a === 'spool') { const ok = buySpool(s); if (ok) sfx(ctx, 'buy'); return ok; }
      if (a === 'auto') return spend(autoCost(s), () => { s.auto++; if (s.auto === 1) log(s, ctx, 'firstPr'); });
      if (a === 'farm') return spend(farmCost(s), () => { s.farm++; log(s, ctx, 'farm', s.farm); });
      if (a === 'panel') return spend(panelCost(s), () => { s.panels++; });
      if (a === 'mkt') return spend(mktCost(s), () => { s.mkt++; log(s, ctx, 'mkt', s.mkt); });
      if (a === 'drone') { const ok = buyDrone(s); if (ok) sfx(ctx, 'buy'); return ok; }
      if (a === 'fab') { const ok = buyFab(s); if (ok) sfx(ctx, 'buy'); return ok; }
      if (a === 'pminus') { changePrice(s, -0.1 / model(s).seconds); return true; }
      if (a === 'pplus') { changePrice(s, 0.1 / model(s).seconds); return true; }
      if (a === 'oacc') { acceptOrder(s); sfx(ctx, 'buy'); return true; }
      if (a === 'odec') { declineOrder(s, ctx); return true; }
      if (a === 'tool') { const ok = buyClickTool(s); if (ok) sfx(ctx, 'buy'); return ok; }
      if (a.startsWith('material:')) return selectMaterial(s, a.slice('material:'.length));
      if (a.startsWith('stl:')) { const ok = buyDesign(s, ctx, a.slice(4)); if (ok) sfx(ctx, 'buy'); return ok; }
      if (a.startsWith('mdl:')) { const ok = selectModel(s, ctx, a.slice(4)); if (ok) sfx(ctx, 'buy'); return ok; }
      if (a === 'mevyes') { const ok = acceptMarketEvent(s, ctx); if (ok) sfx(ctx, 'buy'); return ok; }
      if (a === 'mevno') { declineMarketEvent(s, ctx); return true; }
      if (a === 'fix') { repair(s, ctx); sfx(ctx, 'buy'); return true; }
      if (a === 'boost') return activateBoost(s, ctx);
      if (a === 'prestige' || a === 'prestigeR') { const next = prestige(s, ctx, a === 'prestigeR'); if (next) s = next; return !!next; }
      if (a.startsWith('pat:')) { const ok = buyPatent(s, a.slice(4)); if (ok) sfx(ctx, 'buy'); return ok; }
      if (a === 'adfail') { log(s, ctx, 'boostFail'); return true; }
      if (a === 'daily') return deliverDaily(s, ctx);
      if (a === 'msgok') return dismissMessage(s);
      if (a === 'automat') return toggleAutoMaterial(s);
      if (a.startsWith('day:')) return newDay(s, ctx, Number(a.slice(4)));
      if (a === 'offx2') { const ok = claimOfflineBonus(s, ctx); if (ok) sfx(ctx, 'buy'); return ok; }
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
      if (s.end || !Number.isFinite(seconds) || seconds <= 0) return;
      const before = { total: s.total, sold: s.sold };
      const elapsed = Math.min(seconds, s.slow > 1 ? BAL.realisticOfflineMax : BAL.offlineMaxSeconds);
      ctx.offline = true;
      let rem = elapsed, revenue = 0, idle = 0;
      while (rem > 0) {
        const d = Math.min(1, rem), sold = s.sold, price = s.price;
        game.tick(d);
        revenue += (s.sold - sold) * (price + s.price) / 2;
        if (idleForFilament(s)) idle += d;
        rem -= d;
      }
      ctx.offline = false;
      const made = Math.floor(s.total - before.total);
      const sold = s.goal >= 1 ? s.sold - before.sold : 0;
      grantOfflineBonus(s, elapsed, revenue, made);
      if (elapsed < 120) return;
      const duration = '~' + Math.round(elapsed);
      const idleNote = idle >= BAL.offlineIdleNoteSeconds ? Math.round(idle) : undefined;
      if (!made && !sold) {
        if (!idleNote) return;
        log(s, ctx, 'offIdle', duration);
        return { ...s.log[0], idle: idleNote };
      }
      if (made && sold) log(s, ctx, 'offProductionSales', duration, made, sold);
      else if (sold) log(s, ctx, 'offSales', duration, sold);
      else log(s, ctx, 'off2', duration, made);
      return { ...s.log[0], idle: idleNote };
    },
    load(next) { s = next; },
    reset(logKey = 'fresh') { s = createState(); log(s, ctx, logKey); },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
  return game;
}
