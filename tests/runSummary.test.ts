import { describe, expect, it } from 'vitest';
import { GOALS } from '../src/content/goals';
import { PATENT } from '../src/content/patents';
import { createGame } from '../src/core/game';
import { exportSave, importSave, migrate } from '../src/core/save';
import { validSave } from '../src/core/saveValidation';
import { createState, type GameState } from '../src/core/state';
import { recordGoal, validRunStats } from '../src/systems/runStats';
import { patentPreview, runSummary } from '../src/systems/runSummary';
import { bookCash } from '../src/systems/workshopStats';
import { setPrefs } from '../src/ui/i18n';
import { shareText } from '../src/ui/runShare';
import { playthrough } from './bot';

describe('run statistics', () => {
  it('counts money coming in, per model for sales, and ignores spending', () => {
    const s = createState();
    bookCash(s, 'sales', 30, { modelId: 'fig', pieces: 30 });
    bookCash(s, 'sales', 50, { modelId: 'bust', pieces: 2 });
    bookCash(s, 'orders', 100);
    bookCash(s, 'bonus', 5);
    bookCash(s, 'equipment', 70);
    bookCash(s, 'filament', 12);
    expect(s.runEarned).toBe(185);
    expect(s.modelRev).toEqual({ fig: 30, bust: 50 });
  });

  it('also counts money earned in space, where finance periods stop', () => {
    const s = createState();
    s.ph = 2;
    bookCash(s, 'bonus', 500);
    expect(s.runEarned).toBe(500);
    expect(s.finance).toEqual([]);
  });

  it('stamps each goal with the line play time when it is reached', () => {
    const g = createGame();
    g.s.play = 42.4;
    g.s.total = 10;
    g.tick(0);
    expect(g.s.goal).toBeGreaterThanOrEqual(1);
    expect(g.s.goalAt[0]).toBe(42);
  });

  it('marks goals reached before tracking as unknown and keeps later ones aligned', () => {
    const s = createState();
    s.goal = 3;
    s.play = 600;
    recordGoal(s);
    expect(s.goalAt).toEqual([-1, -1, -1, 600]);
    // A second call for the same goal does not add another entry.
    recordGoal(s);
    expect(s.goalAt).toHaveLength(4);
    s.goal = 4;
    const r = runSummary(s);
    expect(r.goals.map(x => x.at)).toEqual([null, null, null, 600]);
  });

  it('validates saved run statistics', () => {
    const s = createState();
    expect(validRunStats(s)).toBe(true);
    expect(validRunStats({ ...s, runEarned: -1 })).toBe(false);
    expect(validRunStats({ ...s, modelRev: { nope: 5 } })).toBe(false);
    expect(validRunStats({ ...s, modelRev: { fig: -5 } })).toBe(false);
    expect(validRunStats({ ...s, goalAt: [10] })).toBe(false); // more stamps than reached goals
    expect(validRunStats({ ...s, goal: 1, goalAt: [10] })).toBe(true);
    expect(validRunStats({ ...s, goal: 1, goalAt: [-2] })).toBe(false);
    expect(validRunStats({ ...s, goalAt: {} as unknown as number[] })).toBe(false);
  });

  it('survives export and import, and old saves get empty statistics', () => {
    const s = createState();
    bookCash(s, 'sales', 20, { modelId: 'fig', pieces: 20 });
    s.goal = 1; s.goalAt = [15];
    const back = importSave(exportSave(s))!;
    expect(back).toMatchObject({ runEarned: 20, modelRev: { fig: 20 }, goalAt: [15] });
    const raw = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
    delete raw.runEarned; delete raw.modelRev; delete raw.goalAt;
    const old = migrate(raw);
    expect(old).toMatchObject({ runEarned: 0, modelRev: {}, goalAt: [] });
    expect(validSave(old, createState())).toBe(true);
  });

  it('a new line starts the statistics from zero', () => {
    const g = createGame();
    Object.assign(g.s, { ph: 2, total: 1e9, runEarned: 5e6, modelRev: { fig: 5e6 }, goal: 2, goalAt: [5, 9] });
    expect(g.act('prestige')).toBe(true);
    expect(g.s).toMatchObject({ runEarned: 0, modelRev: {}, goalAt: [] });
  });
});

describe('run summary', () => {
  it('picks the model that earned the most', () => {
    const s = createState();
    expect(runSummary(s).best).toBeNull();
    s.modelRev = { fig: 100, dragon: 400, bust: 399 };
    expect(runSummary(s).best).toEqual({ id: 'dragon', revenue: 400 });
  });

  it('previews patents within reach of the current plus earned patents, cheapest first', () => {
    const s = createState();
    expect(patentPreview(s, 0)).toEqual([]);
    const picks = patentPreview(s, 2);
    expect(picks.length).toBeGreaterThan(0);
    expect(picks.every(p => p.cost <= 2 && p.level === 1)).toBe(true);
    expect(picks.map(p => p.cost)).toEqual([...picks.map(p => p.cost)].sort((a, b) => a - b));
    // A maxed patent is never offered.
    s.meta.pat.start = PATENT.start.max;
    expect(patentPreview(s, 50).some(p => p.id === 'start')).toBe(false);
    // Patents already in the bank count too.
    s.meta.patents = 3;
    expect(patentPreview(s, 0).some(p => p.cost === 3)).toBe(true);
  });

  it('builds a shareable text in both languages', () => {
    const s = createState();
    Object.assign(s, { total: 2e12, play: 3725, runEarned: 1234567, goal: GOALS.length, modelRev: { dragon: 10 }, meta: { ...s.meta, runs: 1 } });
    setPrefs({ lang: 'en', notation: 'short' });
    const en = shareText(runSummary(s));
    expect(en).toContain('Line 2 · 1:02:05 of play');
    expect(en).toContain('Best model: Articulated dragon');
    expect(en).toContain(`Goals: ${GOALS.length}/${GOALS.length}`);
    expect(en).toContain('$1.23M');
    setPrefs({ lang: 'pl' });
    const pl = shareText(runSummary(s));
    expect(pl).toContain('Linia 2');
    expect(pl).toContain('Najlepszy model: Smok przegubowy');
    s.modelRev = {};
    expect(shareText(runSummary(s))).not.toContain('Najlepszy');
  });

  it('a full bot game ends with every goal stamped in order and money earned', () => {
    let last: GameState | undefined;
    const r = playthrough(1, 6, 0.25, undefined, s => { last = s; });
    expect(r.ended).toBe(true);
    const s = last!;
    expect(s.goalAt).toHaveLength(GOALS.length);
    expect(s.goalAt.every((t, i) => t >= 0 && (i === 0 || t >= s.goalAt[i - 1]))).toBe(true);
    const sum = runSummary(s);
    expect(sum.earned).toBeGreaterThan(0);
    expect(sum.best).not.toBeNull();
  }, 120_000);
});
