import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../src/content/achievements';
import { BAL } from '../src/content/balance';
import { gpu } from '../src/core/formulas';
import { createGame } from '../src/core/game';
import { migrate, serialize } from '../src/core/save';
import { createState } from '../src/core/state';
import { playthrough } from './bot';

/** Challenges outside the bot's scripted strategies or single-line runs. */
const manualAchievements: Record<string, string> = {
  auto50: 'Keep buying individual printers instead of moving on to farms.',
  streak7: 'Ship orders on seven consecutive calendar days.',
  sisyphus: 'Finish without letting Self-replication build mining drones.',
  line2: 'Start a new production line through prestige.',
  threeCrowns: 'Finish three games on the same save.',
  patents20: 'Collect patents by prestiging.',
  skywalker: 'Complete a speedrun under the active-time threshold.',
  splitFleet: 'Assign a printer to a secondary model.',
};

describe('achievement registry', () => {
  it('covers every achievement with a bot run or a manual challenge', () => {
    const unlocked = new Set<string>();
    for (const { seed, slow, quantum } of [
      { seed: 1, slow: 1, quantum: false },
      { seed: 7, slow: 1, quantum: true },
      { seed: 1, slow: BAL.realisticSlow, quantum: false },
    ]) {
      const run = playthrough(seed, 12, 0.5, undefined, s => {
        if (s.end) for (const id of s.ach) unlocked.add(id);
      }, { slow }, { quantum });
      expect(run.ended).toBe(true);
    }

    const ids = ACHIEVEMENTS.map(achievement => achievement.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of Object.keys(manualAchievements)) expect(ids).toContain(id);
    const uncovered = ids.filter(id => !unlocked.has(id) && !Object.hasOwn(manualAchievements, id));
    expect(uncovered).toEqual([]);
  });
});

describe('SkyWalker and play time', () => {
  it.each([[1799.75, true], [1800, false], [1800.25, false]])(
    'finishing at %s active seconds unlocks SkyWalker: %s',
    (finishTime, unlocked) => {
      const g = createGame({ state: { ...createState(), ph: 2, mat: 0, ft: 0.001, fabs: 1, play: finishTime - 0.25 } });
      expect(g.s.ach).not.toContain('skywalker');
      g.tick(0.25);
      expect(g.s.end).toBe(true);
      expect(g.s.ach.includes('skywalker')).toBe(unlocked);
      g.tick(10);
      expect(g.s.play).toBe(finishTime);
    },
  );

  it('retains active seconds across prestige, restart and a save round trip', () => {
    const g = createGame({ state: { ...createState(), ph: 2, total: 1e9 } });
    g.tick(20);
    g.catchUp(60);
    expect(g.s.play).toBe(20);
    expect(g.act('prestige')).toBe(true);
    expect(g.s).toMatchObject({ play: 0, priorPlay: 20 });
    g.tick(10);
    g.reset('again');
    expect(migrate(JSON.parse(serialize(g.s)))).toMatchObject({ play: 0, priorPlay: 30 });
  });

  it('uses the recorded current line time for saves without prior play time', () => {
    const { priorPlay, ...oldSave } = createState();
    expect(migrate({ ...oldSave, play: 120 })).toMatchObject({ play: 120, priorPlay: 0 });
  });
});

describe('Clicker achievement', () => {
  it('unlocks once at 1,000 figurines of manual work, excluding fleet production', () => {
    const g = createGame({ state: { ...createState(), auto: 10, fil: 1e6 }, rng: () => 0.5 });
    const unlocked: string[] = [];
    g.on(event => {
      if (event.type === 'achievement') unlocked.push(event.id);
    });

    for (let i = 0; i < 999; i++) expect(g.act('print')).toBe(true);
    g.tick(1);
    expect(g.s.total).toBeGreaterThanOrEqual(1000);
    expect(g.s.manualWork).toBe(999);
    expect(g.s.ach).not.toContain('clicker');

    expect(g.act('print')).toBe(true);
    g.tick(0.5);
    g.tick(0.5);
    expect(g.s.ach).toContain('clicker');
    expect(unlocked.filter(id => id === 'clicker')).toEqual(['clicker']);
  });

  it('credits upgraded clicks only for the work the filament allows', () => {
    const g = createGame({ state: { ...createState(), clk: 2 } });
    g.s.fil = gpu(g.s) * 2;

    expect(g.act('print')).toBe(true);
    expect(g.s.manualWork).toBeCloseTo(1.5);
    expect(g.act('print')).toBe(true);
    expect(g.s.manualWork).toBeCloseTo(2);
    expect(g.act('print')).toBe(false);
    expect(g.s.manualWork).toBeCloseTo(2);
  });

  it('persists manual progress across saves and new lines', () => {
    const state = { ...createState(), ph: 2 as const, total: 1e9, manualWork: 999 };
    const g = createGame({ state: migrate(JSON.parse(serialize(state))) });

    expect(g.act('prestige')).toBe(true);
    expect(g.s.manualWork).toBe(999);
    expect(g.act('print')).toBe(true);
    g.tick(0.5);
    expect(g.s.ach).toContain('clicker');

    g.reset();
    expect(g.s.manualWork).toBe(0);
  });

  it('defaults missing progress to zero and rejects negative progress', () => {
    const { manualWork, ...oldSave } = createState();
    expect(migrate({ ...oldSave, total: 1e9 }).manualWork).toBe(0);
    expect(() => migrate({ ...oldSave, manualWork: -1 })).toThrow('Invalid saved progress');
  });
});

describe('Quantum investor achievement', () => {
  it('unlocks on the first research node bought with quantum points, not before', () => {
    const g = createGame({ state: { ...createState(), qOn: true, qLvl: 1, qp: 100, mem: 5, rep: 5 }, rng: () => 0.5 });
    g.tick(1);
    expect(g.s.ach).not.toContain('qspent');
    g.act('t:qstart');
    g.tick(1);
    expect(g.s.done).toContain('qstart');
    expect(g.s.ach).toContain('qspent');
  });
});
