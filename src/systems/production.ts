import { bookCash, recordStockOutput } from './workshopStats';
import { MATERIAL } from '../content/materials';
import { MODEL } from '../content/models';
import { fleetFilamentPerSecond, printing } from './fleet';
import { BAL } from '../content/balance';
import { modelStock, putPieces } from './inventory';
import { log, sfx, type Ctx } from '../core/ctx';
import { gpu, model, rate1, spoolPrice, unitCost } from '../core/formulas';
import { has, type GameState } from '../core/state';
import { completeOrder } from './orders';
import { stockedAlternative } from './filament';
import { addMaterial } from './materials';

/** New figurines fill an accepted order first; the rest goes to stock. */
export function make(s: GameState, ctx: Ctx, n: number, premium = s.precision ? BAL.precisionPremium : 0, cost: number | null = null, m = model(s)) {
  s.total += n;
  if (s.ph === 2) { s.inv += n; return; }
  const lot = modelStock(s, m.id);
  lot.printed += n / m.seconds;
  const o = s.ord;
  if (o && o.acc && o.got < o.n) {
    const k = Math.min(n, Math.ceil((o.n - o.got) / m.seconds) * m.seconds);
    const previouslyReserved = m.id === 'fig'
      ? o.got - Object.entries(s.orderStock).reduce((sum, [id, count]) => sum + count * MODEL[id].seconds, 0)
      : (s.orderStock[m.id] ?? 0) * m.seconds;
    const reservedCost = cost === null ? null : cost * k / n;
    lot.reservedCost = reservedCost !== null && (!previouslyReserved || lot.reservedCost != null)
      ? (previouslyReserved ? lot.reservedCost ?? 0 : 0) + reservedCost
      : null;
    if (cost !== null) cost *= (n - k) / n;
    if (m.id !== 'fig') s.orderStock[m.id] = (s.orderStock[m.id] ?? 0) + k / m.seconds;
    o.got += k;
    n -= k;
    if (o.got >= o.n) completeOrder(s, ctx);
  }
  putPieces(s, m.id, n / m.seconds, premium, cost);
  if (n > 0) recordStockOutput(s, m.id, n / m.seconds);
}

export function buySpool(s: GameState, id = s.materialId): boolean {
  if (s.ph !== 1 || !Object.hasOwn(MATERIAL, id) || s.total < MATERIAL[id].unlockAt) return false;
  const c = spoolPrice(s, MATERIAL[id]);
  if (s.zl < c) return false;
  bookCash(s, 'filament', c);
  addMaterial(s, id, s.spoolG);
  if (id === s.materialId) s.warn = false;
  return true;
}

export function printWork(s: GameState, ctx: Ctx, requested: number, m = model(s)) {
  const g = gpu(s, m);
  const work = Math.min(requested, s.fil / g);
  if (work <= 0) return 0;
  s.fil = Math.max(0, s.fil - work * g);
  if (ctx.tally) ctx.tally.filament += work * g;
  const lot = modelStock(s, m.id);
  const premium = s.precision ? BAL.precisionPremium : 0;
  const previous = lot.progress;
  const total = previous + work;
  const quotedCost = unitCost(s, m);
  const previousCost = previous ? lot.progressCost ?? null : 0;
  const printed = Math.floor((total + 1e-9) / m.seconds) * m.seconds;
  lot.progress = Math.max(0, total - printed);
  if (printed) {
    const blended = (previous * lot.progressPremium + (printed - previous) * premium) / printed;
    lot.progressPremium = premium;
    lot.progressCost = lot.progress * quotedCost;
    make(s, ctx, printed, blended, previousCost === null ? null : previousCost + (printed - previous) * quotedCost, m);
  } else {
    lot.progressCost = previousCost === null ? null : previousCost + work * quotedCost;
    lot.progressPremium = (previous * lot.progressPremium + work * premium) / total;
  }
  return work;
}

export function productionSystem(s: GameState, dt: number, ctx: Ctx) {
  if (s.ph !== 1) return;
  const g = gpu(s);
  const groups = printing(s, rate1(s));
  const grams = fleetFilamentPerSecond(s) * dt;
  if (s.amOn.autobuy && has(s, 'autobuy')) {
    const need = Math.max(g, grams * 3);
    while (s.fil < need && buySpool(s)) { /* keep buying */ }
  }
  // If filament is short, every model keeps running in the configured proportion.
  const fraction = grams > 0 ? Math.min(1, s.fil / grams) : 0;
  for (const { m, rate } of groups) if (rate > 0) printWork(s, ctx, rate * dt * fraction, m);

  if (s.fil < g && !s.warn && s.total > 0) { s.warn = true; log(s, ctx, 'noFil'); sfx(ctx, 'alert'); }

  // Soft-lock guard: with no filament (not even another material in stock), no stock and no money,
  // the supplier gives a spool on credit.
  if (s.fil < g && s.inv < 1 && s.zl < spoolPrice(s) && s.zl > -spoolPrice(s) * 4 && s.total > 0 && !(s.ord && s.ord.acc) && !stockedAlternative(s)) {
    bookCash(s, 'filament', spoolPrice(s));
    s.fil += s.spoolG;
    log(s, ctx, 'credit');
  }
}
