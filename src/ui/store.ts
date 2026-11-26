import { signal, useComputed } from '@preact/signals';
import { useRef } from 'preact/hooks';
import { adState } from '../platform/Platform';
import { createGame, type Action } from '../core/game';
import { migrate, serialize } from '../core/save';
import type { GameState } from '../core/state';
import { play } from './audio';
import { prefs } from './i18n';
import { platform } from './platform';
import { serverTime, WorkshopClock } from './workshopClock';

function loadSaved() {
  try { const raw = platform.loadGame(); return raw ? migrate(JSON.parse(raw)) : undefined; } catch { return undefined; }
}

const saved = loadSaved();
export const game = createGame({ state: saved });
export const awayReport = signal<ReturnType<typeof game.catchUp>>(undefined);
let lastT = performance.now();
let clock = new WorkshopClock(saved?.serverThrough ?? 0, lastT);

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

const save = () => {
  game.s.serverThrough = clock.checkpoint(lastT);
  platform.saveGame(serialize(game.s));
};

export function act(a: Action) { const ok = game.act(a); bump(); return ok; }
/** View-only state changes (active tab, research branch). */
export function ui(fn: (s: GameState) => void) { fn(game.s); bump(); }
export function resetGame(logKey?: string) {
  game.reset(logKey);
  restartClock();
  lastT = performance.now();
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
  } finally {
    if (suspendedDuringAd) {
      lastT = performance.now();
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
  if (e.type === 'goal') platform.track('goal', { index: e.index });
  if (e.type === 'phase') platform.track('liftoff');
  if (e.type === 'order') platform.track('order', { result: e.result });
  if (e.type === 'end') platform.track('end', { total: game.s.total });
  if (e.type === 'achievement') { pushToast(e.id); platform.track('achievement', { id: e.id }); }
});

/** Title screen first; the simulation only runs on the game screen. */
export const screen = signal<'title' | 'game'>('title');
/** Open modal dialog, if any. */
export const dialog = signal<null | 'save'>(null);

export function startGame(fresh = false) {
  if (fresh) resetGame('fresh');
  lastT = performance.now();
  screen.value = 'game';
  platform.gameplayStart();
}

/** Replaces the running game with an imported save. */
export function loadImported(s: GameState) {
  lastT = performance.now();
  awayReport.value = undefined;
  game.load(s);
  restartClock();
  save();
  bump();
}

let pendingSync: WorkshopClock | null = null;

function restartClock() {
  clock = new WorkshopClock(0, performance.now());
  void synchronizeClock();
}

async function synchronizeClock() {
  const current = clock;
  if (pendingSync === current) return;
  pendingSync = current;
  try {
    const sample = await serverTime();
    if (sample === null || current !== clock) return;
    const now = performance.now();
    const missing = clock.synchronize(sample, now);
    if (missing > 0 && !adState.playing && !suspendedDuringAd) {
      const report = game.catchUp(missing);
      if (report) awayReport.value = report;
      bump();
    }
    // The next tick still owns the monotonic interval since lastT.
    save();
  } finally {
    if (pendingSync === current) pendingSync = null;
  }
}

export function startLoop() {
  let suspended = false;
  let lastSave = performance.now();
  let lastWall = Date.now();
  let lastClockCheck = lastSave;

  function advance(resuming = false) {
    const now = performance.now();
    const dt = (now - lastT) / 1000;
    // Some mobile clocks pause during sleep. The device date is only a hint
    // to fetch a new sample; its delta never enters the simulation.
    const wall = Date.now();
    const gap = Math.abs((wall - lastWall) / 1000 - dt);
    lastWall = wall;
    if (gap > 5 || now - lastClockCheck > 5 * 60_000) {
      lastClockCheck = now;
      void synchronizeClock();
    }
    lastT = now;
    if (screen.value !== 'game' || adState.playing || dt <= 0) return;

    // A long gap with a visible tab can also mean the device was asleep.
    if (resuming || dt > 2) {
      void synchronizeClock();
      const report = game.catchUp(dt);
      if (report) awayReport.value = report;
    } else {
      game.tick(dt);
    }
    bump();
    if (resuming || performance.now() - lastSave >= 5000) {
      save();
      lastSave = performance.now();
    }
  }

  function suspend() {
    if (suspended) return;
    advance();
    suspended = true;
    suspendedDuringAd = adState.playing;
    if (screen.value === 'game') save();
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
  window.addEventListener('online', synchronizeClock);
  void synchronizeClock();
  if (document.hidden) suspend();
}
