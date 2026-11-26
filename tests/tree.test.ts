import { describe, expect, it } from 'vitest';
import { AUTOMATIONS, BRANCHES, NODE, TREE, TREE_PAGES } from '../src/content/tree';
import { mod } from '../src/core/mods';
import { createState, type GameState } from '../src/core/state';
import { playthrough } from './bot';

const MOD_KEYS = ['speed', 'demand', 'filament', 'spool', 'click', 'ops', 'opsCap', 'rep', 'orderPay', 'orderTime', 'penalty',
  'dailyPay', 'offer', 'breakdown', 'repair', 'power', 'printerCost', 'farmCost', 'marketingCost', 'design', 'offline', 'mining', 'fab'];

/** Every node in content/tree.ts must pass these, so the tree can keep growing safely. */
describe('research tree registry', () => {
  it('has unique ids, valid branches and no two nodes in one grid cell', () => {
    expect(new Set(TREE.map(n => n.id)).size).toBe(TREE.length);
    const cells = new Set<string>();
    for (const n of TREE) {
      expect(n.col).toBeGreaterThanOrEqual(0);
      expect(n.col).toBeLessThan(BRANCHES.length);
      expect(n.row).toBeGreaterThanOrEqual(1);
      const cell = `${n.col}:${n.row}`;
      expect(cells.has(cell), `cell ${cell} used twice`).toBe(false);
      cells.add(cell);
    }
    expect(TREE_PAGES.flat().sort()).toEqual(BRANCHES.map((_, i) => i));
  });

  it('requirements exist and contain no cycles', () => {
    for (const n of TREE) for (const r of n.req ?? []) expect(NODE[r], `${n.id} requires ${r}`).toBeDefined();
    const seen = new Map<string, number>();
    const visit = (id: string): void => {
      if (seen.get(id) === 2) return;
      expect(seen.get(id), `cycle at ${id}`).not.toBe(1);
      seen.set(id, 1);
      for (const r of NODE[id].req ?? []) visit(r);
      seen.set(id, 2);
    };
    TREE.forEach(n => visit(n.id));
  });

  it.each(TREE.map(n => [n.id, n] as const))('%s has texts, a cost and an effect', (_, n) => {
    for (const pair of [n.n, n.d]) { expect(pair).toHaveLength(2); pair.forEach(x => expect(x.trim()).not.toBe('')); }
    expect(n.ops).toBeGreaterThan(0);
    expect(!!n.fx || Object.keys(n.mods ?? {}).length > 0, 'needs fx or mods').toBe(true);
    for (const [k, v] of Object.entries(n.mods ?? {})) {
      expect(MOD_KEYS).toContain(k);
      expect(v).toBeGreaterThan(0.3);
      expect(v).toBeLessThan(5);
      expect(v).not.toBe(1);
    }
    if (n.automation) { expect(AUTOMATIONS).toContain(n.id); expect(n.fx).toBeDefined(); }
  });

  it('every node gets researched in a full bot game', () => {
    let last: GameState | undefined;
    playthrough(1, 4, 0.25, undefined, s => { last = s; });
    expect(TREE.filter(n => !last!.done.includes(n.id)).map(n => n.id)).toEqual([]);
  });
});

describe('research modifiers', () => {
  it('multiply across researched nodes and are 1 without research', () => {
    const s = createState();
    expect(mod(s, 'demand')).toBe(1);
    s.done.push('marketplace', 'parametr');
    expect(mod(s, 'demand')).toBeCloseTo(1.25 * 1.1);
    s.done.push('studio');
    expect(mod(s, 'demand')).toBeCloseTo(1.25 * 1.1 * 1.2);
  });
});
