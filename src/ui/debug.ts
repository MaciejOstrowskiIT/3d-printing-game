import { botDecision } from '../../tests/bot';
import type { Action } from '../core/game';
import { migrate } from '../core/save';
import type { GameState } from '../core/state';
import { act, game, loadDebugState, pauseDebugLoop, stepDebugState } from './store';

const BOT_TICK_SECONDS = 0.25;
const BOT_TICKS_PER_SECOND = 1 / BOT_TICK_SECONDS;

interface BotCheckpoint {
  tick: number;
  goal: number;
  phase: GameState['ph'];
  end: boolean;
}

interface DebugHook {
  load(json: string | object): void;
  step(seconds: number): void;
  act(action: Action): boolean;
  state(): GameState;
  advanceBot?(seconds: number): BotCheckpoint;
}

declare global {
  interface Window {
    __drk?: DebugHook;
  }
}

export function installDebugHook() {
  window.__drk = {
    load(json) {
      const raw: unknown = typeof json === 'string' ? JSON.parse(json) : structuredClone(json);
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError('Expected a game save object');
      loadDebugState(migrate(raw));
    },
    step: stepDebugState,
    act,
    state: () => structuredClone(game.s),
  };

  if (import.meta.env.MODE === 'qa') {
    let tick = 0;
    // Keep batches in the browser and stop at the exact tick of any milestone so
    // Playwright can inspect the rendered UI before any more game time passes.
    window.__drk.advanceBot = seconds => {
      pauseDebugLoop();
      const { goal, ph } = game.s;
      const until = tick + seconds * BOT_TICKS_PER_SECOND;
      while (tick < until && !game.s.end) {
        if (tick % BOT_TICKS_PER_SECOND === 0) botDecision(game, tick * BOT_TICK_SECONDS);
        stepDebugState(BOT_TICK_SECONDS);
        tick++;
        if (game.s.goal !== goal || game.s.ph !== ph) break;
      }
      return { tick, goal: game.s.goal, phase: game.s.ph, end: game.s.end };
    };
  }
}
