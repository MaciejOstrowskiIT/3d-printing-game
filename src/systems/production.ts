import { log, sfx, type Ctx } from '../core/ctx';
import { rate1, spoolPrice } from '../core/formulas';
import { has, type GameState } from '../core/state';
import { pickOrderCooldown } from './orders';

/** Nowe figurki trafiają najpierw do przyjętego zamówienia, reszta na stan. */
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
  s.inv += n;
}

export function buySpool(s: GameState): boolean {
  const c = spoolPrice(s);
  if (s.zl < c) return false;
  s.zl -= c;
  s.fil += s.spoolG;
  s.warn = false;
  return true;
}

export function printManual(s: GameState, ctx: Ctx): boolean {
  if (s.ph !== 1 || s.fil < s.g) return false;
  s.fil -= s.g;
  make(s, ctx, 1);
  ctx.emit({ type: 'printed', manual: true });
  sfx(ctx, 'click');
  return true;
}

export function productionSystem(s: GameState, dt: number, ctx: Ctx) {
  if (s.ph !== 1) return;
  s.acc += rate1(s) * dt;
  let n = Math.floor(s.acc);
  s.acc -= n;
  if (s.amOn.autobuy && has(s, 'autobuy') && s.fil < s.g * Math.max(1, n * 3)) buySpool(s);
  n = Math.min(n, Math.floor(s.fil / s.g));
  if (n > 0) { s.fil -= n * s.g; make(s, ctx, n); }

  if (s.fil < s.g && !s.warn && s.total > 0) { s.warn = true; log(s, ctx, 'noFil'); sfx(ctx, 'alert'); }

  // Ratunek przed zablokowaniem gry: bez filamentu, bez towaru i bez pieniędzy hurtownia daje szpulę na kredyt.
  if (s.fil < s.g && s.inv < 1 && s.zl < spoolPrice(s) && s.zl > -spoolPrice(s) * 4 && s.total > 0 && !(s.ord && s.ord.acc)) {
    s.zl -= spoolPrice(s);
    s.fil += s.spoolG;
    log(s, ctx, 'credit');
  }
}
