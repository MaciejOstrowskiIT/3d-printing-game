/** Plays the game with the balance bot and saves states at chosen moments, for screenshots and covers.
 *  Run: npx vite-node promo/snapshots.ts */
import { writeFileSync } from 'node:fs';
import { serialize } from '../src/core/save';
import type { GameState } from '../src/core/state';
import { playthrough } from '../tests/bot';

/** Moment name -> predicate on the state; the first state matching it is saved. */
const MOMENTS: Record<string, (s: GameState, t: number) => boolean> = {
  garage: s => s.auto >= 5 && s.auto <= 9,
  workshop: s => s.auto >= 40 && s.farm === 0 && !!s.ord,
  factory: s => s.farm >= 6 && s.farmOn,
  research: s => s.farm >= 5 && s.done.length >= 14,
  space: s => s.ph === 2 && s.drones >= 30 && s.fabs >= 4,
};

const saved = new Set<string>();
playthrough(3, 3, 0.25, undefined, (s, t) => {
  for (const [name, test] of Object.entries(MOMENTS)) {
    if (saved.has(name) || !test(s, t)) continue;
    saved.add(name);
    const copy = JSON.parse(serialize(s)) as GameState;
    copy.tab = name === 'research' ? 'r' : 'w';
    writeFileSync(new URL(`./states/${name}.json`, import.meta.url), JSON.stringify(copy));
    console.log(`${name}: ${(t / 60).toFixed(1)} min, printers ${s.auto}, farms ${s.farm}, drones ${s.drones}`);
  }
});
console.log('missing:', Object.keys(MOMENTS).filter(k => !saved.has(k)).join(', ') || 'none');
