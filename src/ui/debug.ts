import type { Action } from '../core/game';
import { migrate } from '../core/save';
import type { GameState } from '../core/state';
import { act, game, loadDebugState, stepDebugState } from './store';

interface DebugHook {
  load(json: string | object): void;
  step(seconds: number): void;
  act(action: Action): boolean;
  state(): GameState;
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
}
