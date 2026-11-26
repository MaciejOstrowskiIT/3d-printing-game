import { signal, useComputed } from '@preact/signals';
import { useRef } from 'preact/hooks';
import { createGame, type Action } from '../core/game';
import { migrate, serialize } from '../core/save';
import type { GameState } from '../core/state';
import { play } from './audio';
import { prefs } from './i18n';
import { platform } from './platform';

function loadSaved() {
  try { const raw = platform.loadGame(); return raw ? migrate(JSON.parse(raw)) : undefined; } catch { return undefined; }
}

const saved = loadSaved();
export const game = createGame({ state: saved });
if (saved?.ts) game.catchUp((Date.now() - saved.ts) / 1000);

/** State version counter, bumped after every tick and action. Components read state through useS, which depends on it. */
export const ver = signal(0);
const bump = () => { ver.value++; };

/** State selector: the component re-renders only when the returned value changes. */
export function useS<T>(fn: (s: GameState) => T): T {
  const ref = useRef(fn);
  ref.current = fn;
  const c = useComputed(() => { void ver.value; void prefs.value; return ref.current(game.s); });
  return c.value;
}

export const save = () => platform.saveGame(serialize(game.s));

export function act(a: Action) { const ok = game.act(a); bump(); return ok; }
/** View-only state changes (active tab, research branch). */
export function ui(fn: (s: GameState) => void) { fn(game.s); bump(); }
export function resetGame(logKey?: string) { game.reset(logKey); save(); bump(); }

/** Core event listeners: sound, printer animation and analytics. */
export const printedListeners = new Set<() => void>();
game.on(e => {
  if (e.type === 'sfx') play(e.name);
  if (e.type === 'printed') printedListeners.forEach(fn => fn());
  if (e.type === 'goal') platform.track('goal', { index: e.index });
  if (e.type === 'phase') platform.track('liftoff');
  if (e.type === 'order') platform.track('order', { result: e.result });
  if (e.type === 'end') platform.track('end', { total: game.s.total });
});

let lastT = performance.now(), sinceSave = 0;
export function startLoop() {
  setInterval(() => {
    const now = performance.now(), dt = Math.min(1, (now - lastT) / 1000);
    lastT = now;
    game.tick(dt);
    bump();
    sinceSave += dt;
    if (sinceSave > 5) { sinceSave = 0; save(); }
  }, 100);
  document.addEventListener('visibilitychange', save);
  window.addEventListener('pagehide', save);
  platform.gameplayStart();
}
