// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { GOALS } from '../src/content/goals';
import { createGame } from '../src/core/game';
import { createState, type GameState } from '../src/core/state';
import { playthrough } from './bot';
import { renderHealthyApp, setupAppRenderTests } from './uiHarness';

const goalStages = GOALS.map((_, index) => `goal ${index + 1}`);
const stages = ['title', ...goalStages, 'liftoff', 'research', 'finished', 'after prestige', 'achievements'];
const states = new Map<string, GameState>();
setupAppRenderTests();

beforeAll(() => {
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

for (const lang of ['pl', 'en'] as const) {
  describe(`App renders in ${lang}`, () => {
    it.each(stages)('%s has clean text and named buttons', stage => {
      const state = states.get(stage);
      if (!state) throw new Error(`Missing bot checkpoint: ${stage}`);
      const container = renderHealthyApp(state, lang, stage === 'title' ? 'title' : 'game');
      const goalIndex = goalStages.indexOf(stage);
      if (goalIndex >= 0) expect(container.querySelector('.goal-title')?.textContent).toBe(GOALS[goalIndex].t[lang === 'pl' ? 0 : 1]);
    });
  });
}
