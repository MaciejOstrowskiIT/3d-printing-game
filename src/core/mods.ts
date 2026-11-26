import { NODE } from '../content/tree';
import type { GameState } from './state';

/** Research modifiers: tree nodes declare `mods: { speed: 1.2, spool: 0.9 }` and formulas multiply them in.
 *  Values come from s.done (already validated and rebuilt on load), so they need no state of their own.
 *  To add a new kind of effect: add a key here, then multiply `mod(s, key)` where the game computes it. */
export type ModKey =
  | 'speed' | 'demand' | 'filament' | 'spool' | 'click'
  | 'ops' | 'opsCap' | 'rep'
  | 'orderPay' | 'orderTime' | 'penalty' | 'dailyPay' | 'offer'
  | 'breakdown' | 'repair' | 'power'
  | 'printerCost' | 'farmCost' | 'marketingCost' | 'design'
  | 'offline' | 'mining' | 'fab';

export type Mods = Partial<Record<ModKey, number>>;

const cache = new WeakMap<string[], { n: number; m: Mods }>();

/** Product of a modifier over all researched nodes (1 when none has it). Cached per `done` list. */
export function mod(s: GameState, key: ModKey): number {
  const done = s.done;
  let c = cache.get(done);
  if (!c || c.n !== done.length) {
    const m: Mods = {};
    for (const id of done) for (const [k, v] of Object.entries(NODE[id]?.mods ?? {}) as [ModKey, number][]) m[k] = (m[k] ?? 1) * v;
    c = { n: done.length, m };
    cache.set(done, c);
  }
  return c.m[key] ?? 1;
}
