import { demand } from '../core/formulas';
import type { GameState } from '../core/state';

export function salesSystem(s: GameState, dt: number) {
  if (s.pen > 0) s.pen -= dt;
  if (s.ph !== 1) return;
  s.sacc += demand(s) * dt;
  let k = Math.floor(s.sacc);
  s.sacc -= k;
  k = Math.min(k, Math.floor(s.inv));
  if (k > 0) { s.inv -= k; s.sold += k; s.zl += k * s.price; }
}

export function changePrice(s: GameState, delta: number) {
  s.price = Math.max(0.1, Math.round((s.price + delta) * 100) / 100);
}
