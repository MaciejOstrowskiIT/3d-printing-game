import { expect, it } from 'vitest';
import { createGame } from '../src/core/game';
import { migrate, serialize } from '../src/core/save';
import { createState } from '../src/core/state';

it('unlocks Three Crowns on the third finish across prestige, restart and reload', () => {
  const g = createGame();
  const finish = () => {
    Object.assign(g.s, { ph: 2, total: 1e9, mat: 0, ft: 0.001, fabs: 1 });
    g.tick(0.25);
    expect(g.s.end).toBe(true);
  };

  Object.assign(g.s, { ph: 2, total: 1e9 });
  expect(g.act('prestige')).toBe(true);
  expect(g.s.priorCompletions).toBe(0);
  finish();
  expect(g.act('prestige')).toBe(true);
  finish();
  expect(g.s.ach).not.toContain('threeCrowns');
  g.reset('again');
  g.load(migrate(JSON.parse(serialize(g.s))));
  expect(g.s.priorCompletions).toBe(2);
  finish();
  g.tick(1);
  expect(g.s.ach.filter(id => id === 'threeCrowns')).toHaveLength(1);
  g.reset('again');
  expect(g.s.priorCompletions).toBe(3);
  expect(g.s.ach).toContain('threeCrowns');
});

it('counts a finished line in an older save when starting the next line', () => {
  const { priorCompletions, ...oldSave } = createState();
  const g = createGame({ state: migrate({ ...oldSave, ph: 2, end: true, total: 1e9 }) });
  expect(g.act('prestige')).toBe(true);
  expect(g.s.priorCompletions).toBe(1);
});
