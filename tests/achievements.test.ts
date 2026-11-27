import { describe, expect, it } from 'vitest';
import { gpu } from '../src/core/formulas';
import { createGame } from '../src/core/game';
import { migrate, serialize } from '../src/core/save';
import { createState } from '../src/core/state';

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
