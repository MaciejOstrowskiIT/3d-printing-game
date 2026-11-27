// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { seededRng } from '../src/core/ctx';
import { createGame } from '../src/core/game';
import { migrate } from '../src/core/save';
import { validSave } from '../src/core/saveValidation';
import { createState, SAVE_VERSION } from '../src/core/state';
import { renderHealthyApp, setupAppRenderTests } from './uiHarness';

type SaveFixture = Partial<ReturnType<typeof createState>> & {
  fleetModel?: string;
  fleetPrinters?: number;
};

const fixtures = Object.entries(import.meta.glob<SaveFixture>('./fixtures/saves/*.json', {
  eager: true,
  import: 'default',
})).map(([path, raw]) => ({ name: path.split('/').at(-1)!.replace(/\.json$/, ''), raw }));

setupAppRenderTests();

function firstNonFinite(value: unknown, path = 'state'): string | undefined {
  if (typeof value === 'number' && !Number.isFinite(value)) return path;
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const invalid = firstNonFinite(child, `${path}.${key}`);
      if (invalid) return invalid;
    }
  }
}

describe('save compatibility', () => {
  it('includes a fixture for every supported save version and both late-game cases', () => {
    const names = fixtures.map(({ name }) => name);
    for (let v = 3; v <= SAVE_VERSION; v++) {
      const fixture = fixtures.find(({ name }) => name === `v${v}`);
      expect(fixture, `Missing v${v} save fixture`).toBeDefined();
      expect(fixture?.raw.v ?? 3).toBe(v);
    }
    expect(names).toEqual(expect.arrayContaining(['mid-space', 'after-prestige']));
  });

  const locales = ['pl', 'en'] as const;
  const renderCases = fixtures.flatMap(fixture => locales.map(lang => ({ ...fixture, lang })));
  it.each(renderCases)('$name migrates, simulates ten minutes and renders in $lang', ({ name, raw, lang }) => {
    const defaults = createState();
    const state = migrate(structuredClone(raw));
    expect(validSave(state, defaults)).toBe(true);
    expect(state.v).toBe(SAVE_VERSION);
    expect(state).toMatchObject({
      ph: raw.ph, goal: raw.goal, total: raw.total, inv: raw.inv, sold: raw.sold, done: raw.done,
      auto: raw.auto, zl: raw.zl, fil: raw.fil,
    });
    if (name === 'v5') {
      expect(raw.mp).toBeGreaterThan(0);
      expect(state).toMatchObject({ acc: 0, mp: 0, mdl: raw.mdl });
    }
    if (name === 'v6') {
      expect(raw.fleetPrinters).toBeGreaterThan(0);
      expect(state.fleet).toEqual({ [raw.fleetModel!]: raw.fleetPrinters });
      expect(state).not.toHaveProperty('fleetModel');
      expect(state).not.toHaveProperty('fleetPrinters');
    }
    if (name === 'mid-space') {
      expect(state.ph).toBe(2);
      expect(state.mat).toBeGreaterThan(0);
      expect(state.mat).toBeLessThan(state.mat0);
    }
    if (name === 'after-prestige') {
      expect(state.ph).toBe(1);
      expect(state.meta.runs).toBeGreaterThan(0);
      expect(state.meta.earned).toBeGreaterThan(0);
    }

    const game = createGame({ state, rng: seededRng(1) });
    expect(firstNonFinite(game.s)).toBeUndefined();
    for (let second = 1; second <= 600; second++) {
      game.tick(1);
      const invalid = firstNonFinite(game.s);
      if (invalid) throw new Error(`${invalid} became non-finite at ${second} seconds`);
    }
    expect(validSave(game.s, defaults)).toBe(true);

    renderHealthyApp(game.s, lang);
  });
});
