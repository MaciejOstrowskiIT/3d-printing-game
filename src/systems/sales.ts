import { bookCash } from './workshopStats';
import { MODEL, MODELS } from '../content/models';
import { demand, realizedPrice } from '../core/formulas';
import type { GameState } from '../core/state';
import { modelStock, piecesInStock, setStockPrice, stockPrice, takePieces } from './inventory';

export function salesSystem(s: GameState, dt: number) {
  if (s.pen > 0) s.pen -= dt;
  if (s.ph !== 1) return;

  for (const m of MODELS) {
    const stock = piecesInStock(s, m.id);
    if (!stock && m.id !== s.mdl) continue;
    const lot = modelStock(s, m.id);
    lot.price ||= stockPrice(s, m.id);
    const carry = m.id === 'fig' ? s.sacc : lot.saleCarry;
    const demandPieces = carry + demand(s, m, stockPrice(s, m.id)) * dt / m.seconds;
    const wanted = Math.floor(demandPieces);
    const next = demandPieces - wanted;
    if (m.id === 'fig') s.sacc = next;
    else lot.saleCarry = next;

    const count = Math.min(wanted, stock);
    if (!count) continue;
    const revenue = count * m.seconds * realizedPrice(s, m.id);
    s.sold += count;
    const cost = takePieces(s, m.id, count);
    bookCash(s, 'sales', revenue, { modelId: m.id, pieces: count, cost });
  }
}

export function changePrice(s: GameState, delta: number, id = s.mdl) {
  if (s.ph !== 1 || !Object.hasOwn(MODEL, id) || !s.mdls.includes(id)) return false;
  const price = Math.max(0.01, Math.round((stockPrice(s, id) + delta / MODEL[id].seconds) * 1000) / 1000);
  setStockPrice(s, id, price);
  return true;
}
