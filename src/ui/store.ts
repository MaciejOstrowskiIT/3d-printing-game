import { signal, useComputed } from '@preact/signals';
import { useRef } from 'preact/hooks';
import { adState } from '../platform/Platform';
import { createGame, type Action } from '../core/game';
import { migrate, serialize } from '../core/save';
import type { GameState } from '../core/state';
import { play } from './audio';
import { prefs } from './i18n';
import { platform } from './platform';
import { setTrackContext, track } from './analytics';

function loadSaved() {
  try { const raw = platform.loadGame(); return raw ? migrate(JSON.parse(raw)) : undefined; } catch { return undefined; }
}

const saved = loadSaved();
export const game = createGame({ state: saved });
export const awayReport = signal<ReturnType<typeof game.catchUp>>(undefined);
let lastT = Date.now();
if (saved?.ts) {
  awayReport.value = game.catchUp((lastT - saved.ts) / 1000);
  platform.saveGame(serialize(game.s, lastT));
}

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

const save = () => platform.saveGame(serialize(game.s, lastT));

export function act(a: Action) { const ok = game.act(a); bump(); return ok; }
/** View-only state changes (active tab, research branch). */
export function ui(fn: (s: GameState) => void) { fn(game.s); bump(); }
export function resetGame(logKey?: string) {
  game.reset(logKey);
  lastT = Date.now();
  awayReport.value = undefined;
  save();
  bump();
}

/** Achievement toasts currently on screen. */
export const toasts = signal<{ id: string; key: number }[]>([]);
let toastKey = 0;
function pushToast(id: string) {
  const key = ++toastKey;
  toasts.value = [...toasts.value, { id, key }].slice(-3);
  setTimeout(() => { toasts.value = toasts.value.filter(x => x.key !== key); }, 4200);
}

/** True while a rewarded ad is being requested or shown. */
export const adPending = signal(false);
let suspendedDuringAd = false;

/** Shows a rewarded ad and grants the boost only if the platform confirms it was watched. */
export async function watchAdForBoost() {
  if (adPending.value || !platform.rewardedAvailable) return;
  adPending.value = true;
  try {
    const ok = await platform.showRewardedAd();
    act(ok ? 'boost' : 'adfail');
    track('ad', { placement: 'boost', watched: ok });
  } finally {
    if (suspendedDuringAd) {
      lastT = Date.now();
      save();
      suspendedDuringAd = false;
    }
    adPending.value = false;
  }
}

/** Core event listeners: sound, printer animation and analytics. */
export const printedListeners = new Set<() => void>();
game.on(e => {
  if (e.type === 'sfx') play(e.name);
  if (e.type === 'printed') printedListeners.forEach(fn => fn());
  if (e.type === 'goal') track('goal', { index: e.index });
  if (e.type === 'phase') track('liftoff');
  if (e.type === 'order') track('order', { result: e.result });
  if (e.type === 'end') track('end', { total: Math.floor(game.s.total) });
  if (e.type === 'prestige') track('prestige', { gain: e.gain });
  if (e.type === 'achievement') { pushToast(e.id); track('achievement', { id: e.id }); }
});

/** Context attached to every analytics event: where in the run the player is. */
setTrackContext(() => ({
  min: Math.floor(game.s.play / 60),
  line: game.s.meta.runs + 1,
  goal: game.s.goal,
  platform: platform.name,
  build: __BUILD__,
}));

/** Title screen first; the simulation only runs on the game screen. */
export const screen = signal<'title' | 'game'>('title');
/** Open modal dialog, if any. */
export const dialog = signal<null | 'save'>(null);

export function startGame(fresh = false) {
  const resumed = game.s.total > 0 || game.s.meta.runs > 0;
  if (fresh) resetGame('fresh');
  lastT = Date.now();
  screen.value = 'game';
  track('session', { kind: fresh ? 'new' : resumed ? 'continue' : 'first' });
  platform.gameplayStart();
}

/** Replaces the running game with an imported save. */
export function loadImported(s: GameState) {
  lastT = Date.now();
  awayReport.value = undefined;
  game.load(s);
  save();
  bump();
  track('import');
}

/** Count only foreground simulation time toward the active-play heartbeat. */
const HEARTBEAT_S = 300;

export function startLoop() {
  let suspended = false;
  let lastSave = lastT;
  let sinceBeat = 0;

  function advance(resuming = false) {
    const now = Date.now();
    const dt = (now - lastT) / 1000;
    lastT = now;
    if (screen.value !== 'game' || adState.playing || dt <= 0) return;

    // A long gap with a visible tab can also mean the device was asleep.
    if (resuming || dt > 2) {
      const report = game.catchUp(dt);
      if (report) awayReport.value = report;
    } else {
      game.tick(dt);
      sinceBeat += dt;
      if (sinceBeat >= HEARTBEAT_S) {
        sinceBeat -= HEARTBEAT_S;
        track('heartbeat');
      }
    }
    bump();
    if (resuming || now - lastSave >= 5000) {
      save();
      lastSave = now;
    }
  }

  function suspend() {
    if (suspended) return;
    advance();
    suspended = true;
    suspendedDuringAd = adState.playing;
    save();
  }

  function resume() {
    if (!suspended || document.hidden) return;
    suspended = false;
    advance(true);
  }

  setInterval(() => { if (!suspended && !document.hidden) advance(); }, 100);
  document.addEventListener('visibilitychange', () => document.hidden ? suspend() : resume());
  window.addEventListener('pagehide', suspend);
  window.addEventListener('pageshow', resume);
  if (document.hidden) suspend();
}
