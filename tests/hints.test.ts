import { describe, expect, it } from 'vitest';
import { BAL } from '../src/content/balance';
import { HINTS, type HintId } from '../src/content/hints';
import { seededRng } from '../src/core/ctx';
import { createGame } from '../src/core/game';
import { migrate, serialize } from '../src/core/save';
import { createState } from '../src/core/state';
import { researchUnlocked } from '../src/systems/research';
import { botDecision } from './bot';

describe('onboarding hints', () => {
  it('shows the bot each early hint once, in order', () => {
    const shown: HintId[] = [];
    let previous: HintId | null = null;
    const game = createGame({ rng: seededRng(1) });
    // The general bot can buy a node before the player's Research tab is available.
    const playerBot = { s: game.s, act: (action: Parameters<typeof game.act>[0]) =>
      (!action.startsWith('t:') || researchUnlocked(game.s)) && game.act(action) };
    for (let t = 0; t < BAL.onboardingSeconds * BAL.pace; t += 0.25) {
      if (Number.isInteger(t)) botDecision(playerBot, t);
      game.tick(0.25);
      const active = game.s.hints.active;
      if (active && active !== previous) shown.push(active);
      previous = active;
    }
    expect(shown).toEqual(['print', 'sell', 'spool', 'printer', 'research']);
  });

  it('provides Polish and English text for each hint', () => {
    for (const { text } of HINTS) {
      expect(text).toHaveLength(2);
      for (const translation of text) expect(translation.trim()).not.toBe('');
    }
  });

  it('remembers the current hint and a dismissal across save loads', () => {
    const game = createGame();
    game.tick(0.25);
    game.load(migrate(JSON.parse(serialize(game.s))));
    expect(game.s.hints.active).toBe('print');
    expect(game.act('hint-dismiss')).toBe(true);
    game.load(migrate(JSON.parse(serialize(game.s))));
    game.tick(1);
    expect(game.s.hints).toMatchObject({ active: null, seen: ['print'] });
  });

  it('skips offline catch-up and stops after the onboarding window', () => {
    const game = createGame();
    game.catchUp(60);
    expect(game.s.hints.seen).toEqual([]);
    game.tick(0.25);
    expect(game.s.hints.active).toBe('print');
    game.s.play = BAL.onboardingSeconds * BAL.pace - 0.25;
    game.tick(0.25);
    expect(game.s.hints.active).toBeNull();
  });

  it('retires hints at prestige, including after restarting', () => {
    const game = createGame({ state: { ...createState(), ph: 2, total: 1e9 } });
    expect(game.act('prestige')).toBe(true);
    game.tick(1);
    expect(game.s.hints.active).toBeNull();
    game.reset();
    game.tick(1);
    expect(game.s.hints).toEqual({ active: null, seen: [], retired: true });
  });

  it('defaults older saves and rejects unknown hint IDs', () => {
    const { hints, ...older } = createState();
    expect(migrate(older).hints).toEqual(hints);
    expect(() => migrate({ ...older, hints: { ...hints, seen: ['unknown'] } })).toThrow('Invalid saved progress');
  });
});
