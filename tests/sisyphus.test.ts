import { expect, it } from 'vitest';
import { createGame } from '../src/core/game';
import { migrate, serialize } from '../src/core/save';
import { createState } from '../src/core/state';

it.each([false, true])('awards Sisyphus according to whether Self-replication built a drone (%s)', autoBuilt => {
  const g = createGame({ state: { ...createState(), ph: 2, total: 1e9, inv: 1e8, fabs: 1, done: ['autobud'] } });
  expect(g.act('drone')).toBe(true);
  expect(g.s.autoDroneBuilt).toBe(false);
  if (autoBuilt) {
    expect(g.act('am:autobud:1')).toBe(true);
    g.tick(0.25);
    expect(g.act('am:autobud:0')).toBe(true);
    expect(g.s.drones).toBe(2);
  }
  expect(JSON.parse(serialize(g.s)).autoDroneBuilt).toBe(autoBuilt);
  Object.assign(g.s, { mat: 0, ft: 0.001 });
  g.tick(0.25);
  expect(g.s.end).toBe(true);
  expect(g.s.ach.includes('sisyphus')).toBe(!autoBuilt);
  expect(g.act('prestige')).toBe(true);
  expect(g.s.autoDroneBuilt).toBe(false);
});

it('defaults an old save without Self-replication to eligible', () => {
  const { autoDroneBuilt, ...oldSave } = createState();
  expect(migrate(oldSave).autoDroneBuilt).toBe(false);
});
