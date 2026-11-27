import { describe, expect, it } from 'vitest';
import { AUTOMATIONS, BRANCHES, NODE, prereqs, TREE, TREE_PAGES } from '../src/content/tree';
import { mod } from '../src/core/mods';
import { createState, type GameState } from '../src/core/state';
import { validSave } from '../src/core/saveValidation';
import { nodeStatus } from '../src/systems/research';
import { playthrough } from './bot';
import { depths } from './treeAudit';

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
    for (const n of TREE) for (const r of prereqs(n)) expect(NODE[r], `${n.id} requires ${r}`).toBeDefined();
    const seen = new Map<string, number>();
    const visit = (id: string): void => {
      if (seen.get(id) === 2) return;
      expect(seen.get(id), `cycle at ${id}`).not.toBe(1);
      seen.set(id, 1);
      for (const r of prereqs(NODE[id])) visit(r);
      seen.set(id, 2);
    };
    TREE.forEach(n => visit(n.id));
  });

  it('rows follow the graph: every node sits below all its prerequisites and no higher than its depth allows', () => {
    const { depth } = depths(TREE);
    for (const n of TREE) {
      expect(n.row, `${n.id} row vs depth`).toBeGreaterThanOrEqual(depth[n.id]);
      for (const r of prereqs(n)) expect(n.row, `${n.id} must be below ${r}`).toBeGreaterThan(NODE[r].row);
    }
  });

  it('research goes step by step: only roots are free of prerequisites, and nothing opens on compute alone', () => {
    const roots = TREE.filter(n => !prereqs(n).length);
    for (const n of roots) expect(n.row, `root ${n.id} sits in the first row`).toBe(1);
    expect(roots.length).toBeLessThanOrEqual(BRANCHES.length);
    // A gate beyond compute: a stage condition, money or figurines, or several prerequisites.
    for (const n of TREE.filter(n => prereqs(n).length)) {
      const gated = !!n.need || !!n.zl || !!n.wyd || prereqs(n).length > 1;
      expect(gated, `${n.id} opens as soon as its prerequisite is bought and compute allows`).toBe(true);
    }
  });

  it('the tree is a graph: joins across branches and alternative routes', () => {
    const joins = TREE.filter(n => (n.req ?? []).length > 1 && (n.req ?? []).some(r => NODE[r].col !== n.col));
    expect(joins.length).toBeGreaterThanOrEqual(8);
    const alt = TREE.filter(n => n.reqAny);
    expect(alt.length).toBeGreaterThanOrEqual(2);
    expect(alt.length).toBeLessThanOrEqual(3);
    for (const n of alt) {
      expect(n.reqAny!.length, `${n.id} alternatives`).toBeGreaterThanOrEqual(2);
      expect(new Set(n.reqAny!.map(r => NODE[r].col)).size, `${n.id} alternatives come from different branches`).toBeGreaterThan(1);
    }
    for (const n of TREE) for (const r of n.reqNew ?? []) expect(n.req, `${n.id} reqNew must be part of req`).toContain(r);
  });

  it('with an alternative route one prerequisite is enough, and none is not', () => {
    const n = NODE.autooffer;
    const s = createState();
    expect(nodeStatus(s, n)).toBe('locked');
    s.done = ['automkt'];
    expect(nodeStatus(s, n)).not.toBe('locked');
    s.done = ['negocjator'];
    expect(nodeStatus(s, n)).not.toBe('locked');
  });

  it('a join needs every prerequisite', () => {
    const s = createState();
    s.done = ['hotend'];
    expect(nodeStatus(s, NODE.corexy)).toBe('locked');
    s.done = ['hotend', 'baterie'];
    expect(nodeStatus(s, NODE.corexy)).not.toBe('locked');
  });

  it('old saves stay valid: a bought node does not need joins added later, but still needs its original prerequisites', () => {
    const fresh = () => createState();
    const old = fresh();
    old.done = ['dysza', 'fw', 'hurt', 'shaping', 'hotend', 'corexy'];
    expect(validSave(old, fresh())).toBe(true);
    const forged = fresh();
    forged.done = ['fw'];
    expect(validSave(forged, fresh())).toBe(false);
    const alt = fresh();
    alt.done = ['automkt', 'autooffer'];
    expect(validSave(alt, fresh())).toBe(false); // automkt itself is missing its own prerequisites
  });

  it('every reachable node can be researched: no node is blocked by a missing branch', () => {
    const done = new Set<string>();
    let grew = true;
    while (grew) {
      grew = false;
      for (const n of TREE) {
        if (done.has(n.id)) continue;
        if ((n.req ?? []).every(r => done.has(r)) && (!n.reqAny || n.reqAny.some(r => done.has(r)))) { done.add(n.id); grew = true; }
      }
    }
    expect(TREE.filter(n => !done.has(n.id)).map(n => n.id)).toEqual([]);
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
