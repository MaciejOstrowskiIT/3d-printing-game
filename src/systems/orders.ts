import { MODEL } from '../content/models';
import { putPieces } from './inventory';
import { BAL } from '../content/balance';
import { log, pick, sfx, type Ctx } from '../core/ctx';
import { boostMul, rateBase } from '../core/formulas';
import { has, type GameState } from '../core/state';
import { mod } from '../core/mods';

const CLIENTS = 7;

export const pickOrderCooldown = (ctx: Ctx) => pick(ctx, BAL.orderEvery);

function spawnOrder(s: GameState, ctx: Ctx) {
  // Size orders on the un-boosted rate so a boost does not leave the player with an impossible order.
  const cap = Math.max(1.5, rateBase(s) / boostMul(s));
  const n = Math.max(15, Math.round((cap * (20 + ctx.rng() * 20)) / 5) * 5);
  const time = Math.ceil(((n / cap) * 1.6 + 20) * mod(s, 'orderTime'));
  const c = Math.floor(ctx.rng() * CLIENTS);
  s.ord = { n, got: 0, time, left: time, offer: BAL.orderOffer, acc: false, c, pay: n * s.price * BAL.orderPayMultiplier * (has(s, 'b2b') ? BAL.b2bBonus : 1) * mod(s, 'orderPay') };
  log(s, ctx, 'oNew', '#' + c);
  ctx.emit({ type: 'order', result: 'offered' });
  sfx(ctx, 'alert');
}

export function acceptOrder(s: GameState) {
  if (s.ord && !s.ord.acc) { s.ord.acc = true; s.ord.left = s.ord.time; }
}

function releaseOrderStock(s: GameState) {
  let figurines = s.ord?.got ?? 0;
  for (const [id, count] of Object.entries(s.orderStock)) {
    figurines -= count * MODEL[id].seconds;
    putPieces(s, id, count, 0, s.modelStock[id]?.reservedCost ?? null);
  }
  putPieces(s, 'fig', figurines, 0, s.modelStock.fig?.reservedCost ?? null);
  for (const stock of Object.values(s.modelStock)) delete stock.reservedCost;
  s.orderStock = {};
}

export function declineOrder(s: GameState, ctx: Ctx) {
  releaseOrderStock(s);
  s.ord = null;
  s.ordT = pickOrderCooldown(ctx);
}

export function ordersSystem(s: GameState, dt: number, ctx: Ctx) {
  if (s.ph !== 1 || ctx.offline || s.goal < 3) return;
  const o = s.ord;
  if (!o) {
    s.ordT -= dt;
    if (s.ordT <= 0) spawnOrder(s, ctx);
  } else if (!o.acc) {
    o.offer -= dt;
    if (o.offer <= 0) {
      log(s, ctx, 'oExp');
      ctx.emit({ type: 'order', result: 'expired' });
      declineOrder(s, ctx);
    }
  } else {
    o.left -= dt;
    if (o.left <= 0) {
      releaseOrderStock(s);
      s.ord = null;
      s.pen = BAL.penaltySeconds * mod(s, 'penalty');
      s.ordFail++;
      s.ordT = pickOrderCooldown(ctx);
      log(s, ctx, 'oFail');
      ctx.emit({ type: 'order', result: 'failed' });
      sfx(ctx, 'fail');
    }
  }
}
