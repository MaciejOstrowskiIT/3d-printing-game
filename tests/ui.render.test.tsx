// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/preact';
import { computeAccessibleName } from 'dom-accessibility-api';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { GOALS } from '../src/content/goals';
import { en } from '../src/content/i18n/en';
import { pl } from '../src/content/i18n/pl';
import { createGame } from '../src/core/game';
import { createState, type GameState } from '../src/core/state';
import { App } from '../src/ui/components/App';
import { prefs } from '../src/ui/i18n';
import { loadDebugState, screen } from '../src/ui/store';
import { playthrough } from './bot';

const goalStages = GOALS.map((_, index) => `goal ${index + 1}`);
const stages = ['title', ...goalStages, 'liftoff', 'research', 'finished', 'after prestige', 'achievements'];
const states = new Map<string, GameState>();
const dictionaries = { pl, en };

beforeAll(() => {
  vi.stubGlobal('matchMedia', (media: string) => ({
    media, matches: media === '(prefers-reduced-motion: reduce)' || media.startsWith('(min-width:'),
    addEventListener() {}, removeEventListener() {},
  }));
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  });

  const capture = (name: string, state: GameState) => {
    if (!states.has(name)) states.set(name, structuredClone(state));
  };
  capture('title', createState());
  capture(goalStages[0], createState());
  let nextGoal = 1;
  const run = playthrough(1, 6, 0.25, undefined, state => {
    // One tick can satisfy several goals. Use that tick's state to exercise each goal's UI.
    while (nextGoal <= state.goal && nextGoal < GOALS.length) {
      capture(goalStages[nextGoal], { ...state, goal: nextGoal });
      nextGoal++;
    }
    if (state.goal >= 5 && state.ph === 1) capture('research', { ...state, tab: 'r' });
    if (state.ph === 2) capture('liftoff', state);
    if (state.end) capture('finished', state);
  });
  expect(run.ended).toBe(true);
  const finished = states.get('finished');
  if (!finished) throw new Error('The bot did not capture the end screen');
  const game = createGame({ state: structuredClone(finished) });
  expect(game.act('prestige')).toBe(true);
  capture('after prestige', game.s);
  capture('achievements', { ...game.s, tab: 'a' });
});

afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());

for (const lang of ['pl', 'en'] as const) {
  describe(`App renders in ${lang}`, () => {
    const dictionary = dictionaries[lang];
    const keys = new Set([...Object.keys(dictionary), ...Object.keys(dictionary.L)]);
    const translatedLabels = new Set(Object.values(dictionary).filter(value => typeof value === 'string'));

    function checkText(text: string) {
      expect(text).not.toMatch(/\b(?:NaN|undefined|Infinity)\b|\{\d+\}/);
      const label = text.trim();
      if (keys.has(label)) expect(translatedLabels.has(label), `Raw translation key: ${label}`).toBe(true);
      for (const token of label.match(/[A-Za-z][A-Za-z0-9_]*/g) ?? []) {
        if (/[A-Z0-9_]/.test(token.slice(1)) && keys.has(token)) {
          expect(translatedLabels.has(token), `Raw translation key: ${token}`).toBe(true);
        }
      }
    }

    it.each(stages)('%s has clean text and named buttons', stage => {
      const state = states.get(stage);
      if (!state) throw new Error(`Missing bot checkpoint: ${stage}`);
      loadDebugState(structuredClone(state));
      if (stage === 'title') screen.value = 'title';
      prefs.value = { lang, mute: true };

      const { container } = render(<App />);
      expect(document.documentElement.lang).toBe(lang);
      expect(container.textContent?.trim()).toBeTruthy();
      const goalIndex = goalStages.indexOf(stage);
      if (goalIndex >= 0) expect(container.querySelector('.goal-title')?.textContent).toBe(GOALS[goalIndex].t[lang === 'pl' ? 0 : 1]);
      const textNodes = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      for (let node = textNodes.nextNode(); node; node = textNodes.nextNode()) checkText(node.nodeValue ?? '');

      const buttons = [...container.querySelectorAll('button')];
      expect(buttons.length).toBeGreaterThan(0);
      for (const button of buttons) {
        // Include controls in closed dialogs and responsive layouts.
        const name = computeAccessibleName(button, { hidden: true });
        expect(name.trim(), button.outerHTML).not.toBe('');
        checkText(name);
      }
    });
  });
}
