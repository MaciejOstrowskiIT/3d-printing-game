import { demand, realizedPrice } from '../core/formulas';
import type { GameState } from '../core/state';

export function salesSystem(s: GameState, dt: number) {
  if (s.pen > 0) s.pen -= dt;
  if (s.ph !== 1) return;
  s.sacc += demand(s) * dt;
  let k = Math.floor(s.sacc);
  s.sacc -= k;
  k = Math.min(k, Math.floor(s.inv));
  if (k > 0) {
    s.inv -= k;
    s.sold += k;
    s.zl += k * realizedPrice(s);
    if (s.inv === 0) s.stockPremium = 0;
  }
}

export function changePrice(s: GameState, delta: number) {
  s.price = Math.max(0.01, Math.round((s.price + delta) * 1000) / 1000);
}
