import { BAL } from '../content/balance';
import { MARKET_EVENT, MARKET_EVENTS, type MarketEvent } from '../content/events';
import { log, pick, sfx, type Ctx } from '../core/ctx';
import { demand, marketMul, rate1, spoolPrice } from '../core/formulas';
import type { GameState } from '../core/state';

/** Market events: random swings during phase 1. Some just happen, some are offers the player may take.
 *  Effects tick down offline too, but new events only appear while the player is watching. */

/** Sales income per second, ignoring running market effects (so prices do not feed back on themselves). */
const baseIncome = (s: GameState) => Math.min(demand(s) / marketMul(s, 'demand'), rate1(s)) * s.price;

/** Price of an offer, fixed when it appears. */
export function offerCost(s: GameState, e: MarketEvent): number {
  if (!e.offer) return 0;
  if (e.spools) return Math.ceil(spoolPrice(s) * e.spools * BAL.clearanceDiscount * 100) / 100;
  return Math.max(BAL.marketMinMoney, Math.round(baseIncome(s) * e.offer.seconds));
}

export const canAfford = (s: GameState) => {
  const e = s.mev && MARKET_EVENT[s.mev.id];
  if (!s.mev || !e?.offer || !(Number.isFinite(s.mev.cost) && s.mev.cost > 0)) return false;
  return s.zl >= s.mev.cost;
};

/** Save validation for the market fields: known ids, sane timers, a positive price.
 *  Meant for core/saveValidation (cheat-proofing); a bad pending offer could otherwise pay out on accept. */
export function validMarketState(s: GameState): boolean {
  const num = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  if (!num(s.mevT, -1, BAL.marketEventEvery[1])) return false;
  if (!Array.isArray(s.mfx) || s.mfx.length > MARKET_EVENTS.length) return false;
  if (!s.mfx.every(f => f && MARKET_EVENT[f.id]?.seconds && num(f.t, 0, MARKET_EVENT[f.id].seconds))) return false;
  if (new Set(s.mfx.map(f => f.id)).size !== s.mfx.length) return false;
  if (s.mev === null) return true;
  const e = s.mev && MARKET_EVENT[s.mev.id];
  return !!e?.offer && num(s.mev.offer, 0, BAL.marketEventOffer) && num(s.mev.cost, 1e-9, Number.MAX_SAFE_INTEGER);
}

const startEffect = (s: GameState, e: MarketEvent) => {
  if (e.seconds > 0) s.mfx = [...s.mfx.filter(f => f.id !== e.id), { id: e.id, t: e.seconds }];
};

function pickEvent(s: GameState, ctx: Ctx): MarketEvent | undefined {
  const pool = MARKET_EVENTS.filter(e => (e.when?.(s) ?? true) && !s.mfx.some(f => f.id === e.id));
  const total = pool.reduce((a, e) => a + e.weight, 0);
  let r = ctx.rng() * total;
  for (const e of pool) if ((r -= e.weight) < 0) return e;
  return pool[pool.length - 1];
}

function spawn(s: GameState, ctx: Ctx) {
  const e = pickEvent(s, ctx);
  s.mevT = pick(ctx, BAL.marketEventEvery);
  if (!e) return;
  if (!e.offer || e.counter) startEffect(s, e);
  if (e.offer) {
    s.mev = { id: e.id, offer: BAL.marketEventOffer, cost: offerCost(s, e) };
    ctx.emit({ type: 'market', id: e.id, result: 'offered' });
  } else {
    ctx.emit({ type: 'market', id: e.id, result: 'started' });
  }
  log(s, ctx, 'mev', '^' + e.id);
  sfx(ctx, 'alert');
}

export function acceptMarketEvent(s: GameState, ctx: Ctx): boolean {
  const e = s.mev && MARKET_EVENT[s.mev.id];
  if (!s.mev || !e?.offer || !canAfford(s)) return false;
  s.zl -= s.mev.cost;
  if (e.counter) s.mfx = s.mfx.filter(f => f.id !== e.id);
  else if (e.spools) s.fil += e.spools * s.spoolG;
  else startEffect(s, e);
  log(s, ctx, 'mevOk', '^' + e.id);
  ctx.emit({ type: 'market', id: e.id, result: 'accepted' });
  s.mev = null;
  return true;
}

export function declineMarketEvent(s: GameState, ctx: Ctx) {
  if (!s.mev) return;
  ctx.emit({ type: 'market', id: s.mev.id, result: 'declined' });
  s.mev = null;
}

export function marketEventsSystem(s: GameState, dt: number, ctx: Ctx) {
  if (s.mfx.length) {
    for (const f of s.mfx) f.t -= dt;
    s.mfx = s.mfx.filter(f => f.t > 0);
  }
  if (s.ph !== 1) { s.mev = null; return; }
  if (ctx.offline || s.goal < 3) return;
  if (s.mev) {
    s.mev.offer -= dt;
    if (s.mev.offer <= 0) {
      ctx.emit({ type: 'market', id: s.mev.id, result: 'expired' });
      s.mev = null;
    }
    return;
  }
  s.mevT -= dt;
  if (s.mevT <= 0) spawn(s, ctx);
}
