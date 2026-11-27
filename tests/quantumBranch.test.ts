import { describe, expect, it } from 'vitest';
import { BRANCHES, NODE, prereqs, QUANTUM_BRANCH, TREE, TREE_PAGES } from '../src/content/tree';
import { mod } from '../src/core/mods';
import { createGame } from '../src/core/game';
import { migrate } from '../src/core/save';
import { validSave } from '../src/core/saveValidation';
import { createState, type GameState } from '../src/core/state';
import { canBuy, nextResearch, nodeShown, nodeStatus } from '../src/systems/research';

const Q = TREE.filter(n => n.col === QUANTUM_BRANCH);
/** A quiet game with the machine switched on and everything non-quantum bought. */
const lab = (over: Partial<GameState> = {}) => {
  const game = createGame();
  Object.assign(game.s, { mem: 200, rep: 300, ops: 0, brkT: 1e9, mevT: 1e9, ordT: 1e9, qOn: true, qLvl: 1, ...over });
  return game;
};

describe('quantum branch', () => {
  it('is the last branch and has its own page', () => {
    expect(QUANTUM_BRANCH).toBe(BRANCHES.length - 1);
    expect(TREE_PAGES[TREE_PAGES.length - 1]).toEqual([QUANTUM_BRANCH]);
    expect(Q.length).toBeGreaterThanOrEqual(8);
    expect(Q.length).toBeLessThanOrEqual(10);
  });

  it('is paid in quantum points only, with one entry point', () => {
    for (const n of Q) { expect(n.ops, n.id).toBe(0); expect(n.zl, n.id).toBeUndefined(); expect(n.qp, n.id).toBeGreaterThan(0); }
    const roots = Q.filter(n => !prereqs(n).length);
    expect(roots.map(n => n.id)).toEqual(['qstart']);
    expect(roots[0].need?.value(createState())).toBe(0);
  });

  it('has at least two joins and 2 or 3 links to regular nodes', () => {
    const joins = Q.filter(n => (n.req ?? []).filter(r => NODE[r].col === QUANTUM_BRANCH).length >= 2);
    expect(joins.length).toBeGreaterThanOrEqual(2);
    const links = Q.filter(n => prereqs(n).some(r => NODE[r].col !== QUANTUM_BRANCH));
    expect(links.length).toBeGreaterThanOrEqual(2);
    expect(links.length).toBeLessThanOrEqual(3);
  });

  it('is never needed: no regular node or the end of the game depends on it', () => {
    for (const n of TREE.filter(n => n.col !== QUANTUM_BRANCH)) for (const r of prereqs(n)) expect(NODE[r].col, `${n.id} needs ${r}`).not.toBe(QUANTUM_BRANCH);
  });

  it('is hidden until the machine is in reach', () => {
    const s = createState();
    expect(Q.some(n => nodeShown(s, n))).toBe(false);
    expect(nextResearch(s, 100).some(p => p.node.col === QUANTUM_BRANCH)).toBe(false);
    expect(Q.every(n => nodeShown({ ...s, qOn: true }, n))).toBe(true);
  });

  it('opens with the machine, costs QP and not compute', () => {
    const game = lab({ qOn: false, qLvl: 0, ops: 1e9 });
    const first = NODE.qstart;
    expect(nodeStatus(game.s, first)).toBe('need');
    game.s.qOn = true; game.s.qLvl = 1;
    expect(nodeStatus(game.s, first)).toBe('avail');
    expect(game.act('t:qstart')).toBeFalsy();
    expect(game.s.done).not.toContain('qstart');
    game.s.qp = first.qp! + 5;
    expect(canBuy(game.s, first)).toBe(true);
    game.act('t:qstart');
    expect(game.s.done).toContain('qstart');
    expect(game.s.qp).toBeCloseTo(5);
    expect(game.s.ops).toBe(1e9);
    expect(mod(game.s, 'speed')).toBeCloseTo(1.25);
  });

  it('keeps joins and regular links locked until every prerequisite is researched', () => {
    const game = lab({ qp: 1e6 });
    game.s.done.push('qstart', 'qspeed', 'qdemand', 'qorders', 'qcompute');
    expect(nodeStatus(game.s, NODE.qlogi)).toBe('ready');
    expect(nodeStatus(game.s, NODE.qoffline)).toBe('locked');
    game.s.done.push('chmura');
    expect(nodeStatus(game.s, NODE.qoffline)).toBe('ready');
    expect(nodeStatus(game.s, NODE.qtop)).toBe('locked');
    game.s.done.push('qlogi');
    expect(nodeStatus(game.s, NODE.qtop)).toBe('locked');
    game.s.done.push('baterie', 'qpower');
    expect(nodeStatus(game.s, NODE.qtop)).toBe('ready');
  });

  it('can be researched end to end with the QP the machine makes', () => {
    const game = lab({ qLvl: 5 });
    game.s.done.push('chmura', 'baterie', 'neuro');
    for (let i = 0; i < 4 * 3600 * 10; i++) {
      game.tick(0.1);
      for (const n of Q) if (nodeStatus(game.s, n) === 'ready') game.act(`t:${n.id}`);
    }
    expect(Q.filter(n => !game.s.done.includes(n.id)).map(n => n.id)).toEqual([]);
  });

  it('survives a save round trip', () => {
    const s = { ...createState(), mem: 200, rep: 300, ops: 0, qOn: true, qLvl: 1, qp: 12, done: ['qstart'] };
    expect(validSave(migrate(JSON.parse(JSON.stringify(s))), createState())).toBe(true);
    // Branch nodes bought without their prerequisites are rejected like any other node.
    expect(validSave({ ...s, done: ['qlogi'] }, createState())).toBe(false);
  });
});
