import { BAL } from '../content/balance';
import { stockPrints } from './printQuality';
import { log, sfx, type Ctx } from '../core/ctx';
import { gpu, rate1, spoolPrice } from '../core/formulas';
import { has, type GameState } from '../core/state';
import { pickOrderCooldown } from './orders';

/** New figurines fill an accepted order first; the rest goes to stock. */
export function make(s: GameState, ctx: Ctx, n: number) {
  s.total += n;
  const o = s.ord;
  if (o && o.acc && o.got < o.n) {
    const k = Math.min(n, o.n - o.got);
    o.got += k;
    n -= k;
    if (o.got >= o.n) {
      s.zl += o.pay;
      s.ordDone++;
      log(s, ctx, 'oOk', '$' + o.pay);
      ctx.emit({ type: 'order', result: 'delivered' });
      s.ord = null;
      s.ordT = pickOrderCooldown(ctx);
      sfx(ctx, 'goal');
    }
  }
  stockPrints(s, n, s.precision && s.ph === 1 ? BAL.precisionPremium : 0);
}

export function buySpool(s: GameState): boolean {
  const c = spoolPrice(s);
  if (s.zl < c) return false;
  s.zl -= c;
  s.fil += s.spoolG;
  s.warn = false;
  return true;
}

export function productionSystem(s: GameState, dt: number, ctx: Ctx) {
  if (s.ph !== 1) return;
  const g = gpu(s);
  s.acc += rate1(s) * dt;
  let n = Math.floor(s.acc);
  s.acc -= n;
  if (s.amOn.autobuy && has(s, 'autobuy')) {
    // Buy as many packs as this tick needs; one pack per tick starves large farms.
    const need = g * Math.max(1, n * 3);
    while (s.fil < need && buySpool(s)) { /* keep buying */ }
  }
  n = Math.min(n, Math.floor(s.fil / g));
  if (n > 0) { s.fil -= n * g; make(s, ctx, n); }

  if (s.fil < g && !s.warn && s.total > 0) { s.warn = true; log(s, ctx, 'noFil'); sfx(ctx, 'alert'); }

  // Soft-lock guard: with no filament, no stock and no money, the supplier gives a spool on credit.
  if (s.fil < g && s.inv < 1 && s.zl < spoolPrice(s) && s.zl > -spoolPrice(s) * 4 && s.total > 0 && !(s.ord && s.ord.acc)) {
    s.zl -= spoolPrice(s);
    s.fil += s.spoolG;
    log(s, ctx, 'credit');
  }
}
