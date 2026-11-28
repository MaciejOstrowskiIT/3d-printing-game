import { describe, expect, it } from 'vitest';
import { BAL } from '../src/content/balance';
import { MODEL } from '../src/content/models';
import { PRINTER_TYPES, typeOf } from '../src/content/printerTypes';
import { eff, unitCost } from '../src/core/formulas';
import type { GameState } from '../src/core/state';
import { playthrough, printerPrice } from './bot';

/** Trade-off between printer types (issue #94): in the bot economy no type may dominate another at any stage.
 *
 *  A stage is a STAGE-second window of the workshop phase. For every type that had printers through the whole window
 *  we measure profit per slot (sales of its models minus their feedstock, per printer-second; FDM slots are the garage
 *  printer, the auto printers and the farm printers) and return per money (profit per slot / price of its next
 *  printer). A type dominates another when it is MARGIN× better on both: then the other type would be pointless.
 *  Industrial printers are meant to win on profit per slot and lose on return; FDM farms the other way round. */
const STAGE = 180;
const MARGIN = 1.5;

interface Stage { minute: number; types: Record<string, { perSlot: number; ret: number }> }

function stages(seed: number): Stage[] {
  const out: Stage[] = [];
  let acc: Record<string, { profit: number; slotSec: number; seconds: number }> = {};
  const last = { rev: {} as Record<string, number>, printed: {} as Record<string, number> };
  const slots = (s: GameState, id: string) => id === 'fdm' ? BAL.basePrinters + s.auto + s.farm * BAL.farmPrinters * eff(s) : s.printers[id] ?? 0;
  playthrough(seed, 6, 0.25, undefined, (s, t) => {
    if (s.ph !== 1 || Math.abs(t - Math.round(t)) > 1e-6) return;
    for (const type of PRINTER_TYPES) {
      const n = slots(s, type.id);
      if (n > 0) { const a = acc[type.id] ??= { profit: 0, slotSec: 0, seconds: 0 }; a.slotSec += n; a.seconds++; }
    }
    for (const [id, revenue] of Object.entries(s.modelRev)) {
      const m = MODEL[id], printed = s.modelStock[id]?.printed ?? 0;
      const cost = (printed - (last.printed[id] ?? 0)) * m.seconds * unitCost(s, m);
      const a = acc[typeOf(m).id];
      if (a) a.profit += revenue - (last.rev[id] ?? 0) - cost;
      last.printed[id] = printed;
    }
    last.rev = { ...s.modelRev };
    if (Math.round(t) % STAGE !== 0) return;
    const types: Stage['types'] = {};
    for (const type of PRINTER_TYPES) {
      const a = acc[type.id];
      if (!a || a.seconds < STAGE) continue; // only types that printed through the whole stage
      const perSlot = a.profit / a.slotSec;
      types[type.id] = { perSlot, ret: perSlot / printerPrice(s, type) };
    }
    out.push({ minute: t / 60, types });
    acc = {};
  });
  return out;
}

describe('printer types: trade-off in the bot economy', () => {
  for (const seed of [1, 7, 42]) {
    it(`seed ${seed}: no type dominates another on profit per slot and return at any stage`, () => {
      const all = stages(seed);
      const shared = all.filter(st => Object.keys(st.types).length >= 2);
      // The bot runs every type side by side for a good part of the workshop phase, so the check is not empty.
      for (const type of PRINTER_TYPES) expect(shared.some(st => type.id in st.types), type.id).toBe(true);
      expect(shared.length).toBeGreaterThanOrEqual(8);
      const dominated: string[] = [];
      for (const st of shared) {
        for (const [a, x] of Object.entries(st.types)) for (const [b, y] of Object.entries(st.types)) {
          if (a !== b && x.perSlot > 0 && x.perSlot > y.perSlot * MARGIN && x.ret > y.ret * MARGIN) {
            dominated.push(`min ${st.minute}: ${a} (${x.perSlot.toFixed(1)}/slot, ${(x.ret * 3600).toFixed(2)}/h) over ${b} (${y.perSlot.toFixed(1)}/slot, ${(y.ret * 3600).toFixed(2)}/h)`);
          }
        }
      }
      expect(dominated).toEqual([]);
      // Industrial printers are the big machines: more profit per slot than FDM, but a slower return on the money.
      const late = shared.filter(st => st.types.industrial && st.types.fdm);
      expect(late.length).toBeGreaterThan(0);
      for (const st of late) {
        expect(st.types.industrial.perSlot).toBeGreaterThan(st.types.fdm.perSlot);
        expect(st.types.industrial.ret).toBeLessThan(st.types.fdm.ret);
      }
    }, 120_000);
  }
});
