import { bookCash } from './workshopStats';
import { MODEL } from '../content/models';
import { fleetFilamentPerSecond, secondaryRate } from './fleet';
import { BAL } from '../content/balance';
import { modelStock, putPieces } from './inventory';
import { log, sfx, type Ctx } from '../core/ctx';
import { gpu, model, rate1, spoolPrice } from '../core/formulas';
import { has, type GameState } from '../core/state';
import { pickOrderCooldown } from './orders';
import { stockedAlternative } from './filament';

/** New figurines fill an accepted order first; the rest goes to stock. */
export function make(s: GameState, ctx: Ctx, n: number, premium = s.precision ? BAL.precisionPremium : 0, m = model(s)) {
  s.total += n;
  if (s.ph === 2) { s.inv += n; return; }
  modelStock(s, m.id).printed += n / m.seconds;
  const o = s.ord;
  if (o && o.acc && o.got < o.n) {
    const k = Math.min(n, Math.ceil((o.n - o.got) / m.seconds) * m.seconds);
    if (m.id !== 'fig') s.orderStock[m.id] = (s.orderStock[m.id] ?? 0) + k / m.seconds;
    o.got += k;
    n -= k;
    if (o.got >= o.n) {
      bookCash(s, 'orders', o.pay);
      s.ordDone++;
      log(s, ctx, 'oOk', '$' + o.pay);
      ctx.emit({ type: 'order', result: 'delivered' });
      s.ord = null;
      s.orderStock = {};
      s.ordT = pickOrderCooldown(ctx);
      sfx(ctx, 'goal');
    }
  }
  putPieces(s, m.id, n / m.seconds, premium);
}

export function buySpool(s: GameState): boolean {
  const c = spoolPrice(s);
  if (s.zl < c) return false;
  bookCash(s, 'filament', c);
  s.fil += s.spoolG;
  s.warn = false;
  return true;
}

export function printWork(s: GameState, ctx: Ctx, requested: number, m = model(s)) {
  const g = gpu(s, m);
  const work = Math.min(requested, s.fil / g);
  if (work <= 0) return 0;
  s.fil = Math.max(0, s.fil - work * g);
  const lot = modelStock(s, m.id);
  const premium = s.precision ? BAL.precisionPremium : 0;
  const previous = lot.progress;
  const total = previous + work;
  const printed = Math.floor((total + 1e-9) / m.seconds) * m.seconds;
  lot.progress = Math.max(0, total - printed);
  if (printed) {
    const blended = (previous * lot.progressPremium + (printed - previous) * premium) / printed;
    lot.progressPremium = premium;
    make(s, ctx, printed, blended, m);
  } else {
    lot.progressPremium = (previous * lot.progressPremium + work * premium) / total;
  }
  return work;
}

export function productionSystem(s: GameState, dt: number, ctx: Ctx) {
  if (s.ph !== 1) return;
  const g = gpu(s);
  const rate = rate1(s);
  const secondary = secondaryRate(s, rate);
  const grams = fleetFilamentPerSecond(s) * dt;
  if (s.amOn.autobuy && has(s, 'autobuy')) {
    const need = Math.max(g, grams * 3);
    while (s.fil < need && buySpool(s)) { /* keep buying */ }
  }
  // If stock is low, keep both groups running in the configured proportion.
  const fraction = grams > 0 ? Math.min(1, s.fil / grams) : 0;
  printWork(s, ctx, (rate - secondary) * dt * fraction);
  if (secondary > 0) printWork(s, ctx, secondary * dt * fraction, MODEL[s.fleetModel]);

  if (s.fil < g && !s.warn && s.total > 0) { s.warn = true; log(s, ctx, 'noFil'); sfx(ctx, 'alert'); }

  // Soft-lock guard: with no filament (not even another material in stock), no stock and no money,
  // the supplier gives a spool on credit.
  if (s.fil < g && s.inv < 1 && s.zl < spoolPrice(s) && s.zl > -spoolPrice(s) * 4 && s.total > 0 && !(s.ord && s.ord.acc) && !stockedAlternative(s)) {
    bookCash(s, 'filament', spoolPrice(s));
    s.fil += s.spoolG;
    log(s, ctx, 'credit');
  }
}
