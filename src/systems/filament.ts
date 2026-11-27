import { BAL } from '../content/balance';
import { MATERIAL, MATERIALS } from '../content/materials';
import { log, sfx, type Ctx } from '../core/ctx';
import { fleetFilamentPerSecond } from './fleet';
import { gpu, rate1 } from '../core/formulas';
import { has, type GameState } from '../core/state';
import { materialStock, selectMaterial } from './materials';

/** Running out of filament: a warning before it happens, a hint (or an automatic switch) to a material that is
 *  still in stock once it does. Purchases stay with the player or the auto-buy automation (systems/production.ts). */

export const autobuyOn = (s: GameState) => has(s, 'autobuy') && !!s.amOn.autobuy;

/** Seconds of printing left at the current rate (Infinity when nothing prints). */
export function filamentRunway(s: GameState): number {
  const use = fleetFilamentPerSecond(s);
  return use > 0 ? s.fil / use : Infinity;
}

/** The unlocked, non-active material with the most stock, if it is enough for a few figurines. */
export function stockedAlternative(s: GameState): string | null {
  let best: string | null = null, most = gpu(s) * BAL.filamentSwitchMinFigurines;
  for (const m of MATERIALS) {
    if (m.id === s.materialId || s.total < m.unlockAt) continue;
    const g = materialStock(s, m.id);
    if (g >= most) { best = m.id; most = g; }
  }
  return best;
}

export const toggleAutoMaterial = (s: GameState) => { s.autoMat = !s.autoMat; return true; };

export function filamentSystem(s: GameState, dt: number, ctx: Ctx) {
  if (s.ph !== 1 || ctx.offline) return;
  const g = gpu(s);
  const runway = filamentRunway(s);

  // Early warning (once, until the runway recovers), unless the automation keeps buying anyway.
  if (runway > BAL.filamentWarnSeconds * 2) s.lowFil = false;
  else if (!s.lowFil && s.fil >= g && runway < BAL.filamentWarnSeconds && !autobuyOn(s) && s.total > 0) {
    s.lowFil = true;
    log(s, ctx, 'lowFil', '~' + Math.max(1, Math.round(runway)));
    sfx(ctx, 'alert');
  }

  // Empty: switch automatically if the player chose that, otherwise point to the material in stock (once).
  if (s.fil >= g) { s.matHint = false; return; }
  const alt = stockedAlternative(s);
  if (!alt) return;
  if (s.autoMat) {
    if (selectMaterial(s, alt)) log(s, ctx, 'matAuto', '/' + alt);
  } else if (!s.matHint) {
    s.matHint = true;
    log(s, ctx, 'matHintM', '/' + alt, '(' + Math.round(materialStock(s, alt)));
  }
}

/** For the offline summary: are printers standing still for lack of filament right now? */
/** Filament warning for the notification centre and the filament alert: out, running low, or fine (null). */
export function filamentWarning(s: GameState): 'out' | 'low' | null {
  if (s.ph !== 1 || s.total === 0) return null;
  if (s.fil < gpu(s)) return 'out';
  return filamentRunway(s) < BAL.filamentWarnSeconds && !autobuyOn(s) ? 'low' : null;
}

export const idleForFilament = (s: GameState) => s.ph === 1 && rate1(s) > 0 && s.fil < gpu(s);

export const materialName = (id: string, lang: 0 | 1) => MATERIAL[id]?.name[lang] ?? id;
