/** Pure helpers for the HUD money floats and counters (no DOM, so they are easy to test). */

/** Minimum time between two "+$12.50" floats; income arriving in between is merged into the next one. */
export const GAIN_GAP_MS = 400;
/** How long a counter takes to slide to its new value. */
export const COUNT_MS = 450;

export interface GainQueue { pending: number; last: number }

export const gainQueue = (): GainQueue => ({ pending: 0, last: -Infinity });

/** Adds new income and returns the merged amount to show now, or 0 while the gap since the last float has not passed.
 *  Call it on every update (also with 0) so held-back income is shown once the gap is over. */
export function takeGain(q: GainQueue, now: number, add: number, gap = GAIN_GAP_MS): number {
  if (add > 0) q.pending += add;
  if (q.pending <= 0 || now - q.last < gap) return 0;
  const out = q.pending;
  q.pending = 0;
  q.last = now;
  return out;
}

/** Value of a counter sliding from `from` to `to`, `elapsed` ms after the change (ease-out). */
export function countValue(from: number, to: number, elapsed: number, ms = COUNT_MS): number {
  if (elapsed >= ms || from === to) return to;
  const k = Math.max(0, elapsed) / ms;
  return from + (to - from) * (1 - (1 - k) ** 3);
}
