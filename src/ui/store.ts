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
import { serverTime, WorkshopClock } from './workshopClock';

function loadSaved() {
  try { const raw = platform.loadGame(); return raw ? migrate(JSON.parse(raw)) : undefined; } catch { return undefined; }
}

/** The game starts empty; loadSavedGame() fills it once the platform is ready (a portal SDK may hold the save). */
export const game = createGame();
export const awayReport = signal<ReturnType<typeof game.catchUp>>(undefined);
let lastT = performance.now();
let clock = new WorkshopClock(0, lastT);

/** Loads the save through the platform. Call after platform.init(), before the first render. */
export function loadSavedGame() {
  const saved = loadSaved();
  if (!saved) return;
  game.load(saved);
  lastT = performance.now();
  clock = new WorkshopClock(saved.serverThrough ?? 0, lastT);
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

let debugStateLoaded = false;

const save = () => {
  if ((import.meta.env.DEV || import.meta.env.MODE === 'qa') && debugStateLoaded) return;
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

/** Toasts currently on screen: achievements and new notifications. */
export interface Toast { key: number; id?: string; note?: { icon: string; title: string; body: string } }
export const toasts = signal<Toast[]>([]);
let toastKey = 0;
function addToast(toast: Omit<Toast, 'key'>, ms: number) {
  const key = ++toastKey;
  toasts.value = [...toasts.value, { ...toast, key }].slice(-3);
  setTimeout(() => { toasts.value = toasts.value.filter(x => x.key !== key); }, ms);
}
function pushToast(id: string) { addToast({ id }, 4200); }
/** A notification arrived (message, order, breakdown...): a toast the player can click to open the notification panel. */
export const pushNote = (note: NonNullable<Toast['note']>) => addToast({ note }, 6500);
/** Bumped to ask the HUD to open the notification panel (a toast was clicked). */
export const notifRequest = signal(0);

/** True while a rewarded ad is being requested or shown. */
export const adPending = signal(false);

/** Workshop view on phones: production or sales (bottom nav). Desktop shows both. */
export const mobileView = signal<'p' | 's'>('p');
let suspendedDuringAd = false;

/** Shows a rewarded ad and runs `reward` only if the platform confirms it was watched. */
export async function watchAd(placement: string, reward: Action, failed?: Action) {
  if (adPending.value || !platform.rewardedAvailable) return;
  adPending.value = true;
  try {
    const ok = await platform.showRewardedAd();
    if (ok) act(reward);
    else if (failed) act(failed);
    track('ad', { placement, watched: ok });
  } finally {
    if (suspendedDuringAd) {
      lastT = performance.now();
      save();
      suspendedDuringAd = false;
    }
    adPending.value = false;
  }
}

export const watchAdForBoost = () => watchAd('boost', 'boost', 'adfail');
/** "Instant delivery" of the accepted special order, and "Skip breakdown". */
export const watchAdForOrder = () => watchAd('order', 'adorder', 'adfail');
export const watchAdForRepair = () => watchAd('repair', 'adrepair', 'adfail');
/** "Watch an ad: ×2" on the away report. */
export const watchAdForOfflineBonus = () => watchAd('offline', 'offx2');

/** Core event listeners: sound, printer animation and analytics. */
/** Called with the share of a piece each manual click printed (1 = a whole piece). */
export const printedListeners = new Set<(share: number) => void>();
game.on(e => {
  if (e.type === 'sfx') play(e.name);
  if (e.type === 'printed') printedListeners.forEach(fn => fn(e.share ?? 1));
  if (e.type === 'goal') track('goal', { index: e.index });
  if (e.type === 'phase') track('liftoff');
  if (e.type === 'order') track('order', { result: e.result });
  if (e.type === 'end') track('end', { total: Math.floor(game.s.total) });
  if (e.type === 'prestige') track('prestige', { gain: e.gain, realistic: !!e.realistic });
  if (e.type === 'market') track('market', { id: e.id, result: e.result });
  if (e.type === 'model') track('model', { id: e.id, action: e.action });
  if (e.type === 'daily') track('daily', { result: e.result, streak: e.streak });
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
export const dialog = signal<null | 'save' | 'report' | 'settings'>(null);

/** Local calendar day number, for the order of the day. The core only accepts days moving forward. */
export const localDay = (now = new Date()) => Math.floor((now.getTime() - now.getTimezoneOffset() * 60_000) / 86_400_000);
const reportDay = () => act(`day:${localDay()}`);

export function startGame(fresh = false) {
  const resumed = game.s.total > 0 || game.s.meta.runs > 0;
  if (fresh) resetGame('fresh');
  reportDay();
  lastT = performance.now();
  screen.value = 'game';
  track('session', { kind: fresh ? 'new' : resumed ? 'continue' : 'first' });
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
  track('import');
}

/** Load a fixture for this page. Keep the player's persisted save intact. */
export function loadDebugState(s: GameState) {
  debugStateLoaded = true;
  lastT = performance.now();
  clock = new WorkshopClock(0, lastT);
  game.load(s);
  awayReport.value = undefined;
  toasts.value = [];
  dialog.value = null;
  mobileView.value = 'p';
  screen.value = 'game';
  bump();
}

function tickGame(seconds: number, maxStep = seconds) {
  for (let remaining = seconds; remaining > 0;) {
    const dt = Math.min(remaining, maxStep);
    game.tick(dt);
    remaining -= dt;
  }
}

export function stepDebugState(seconds: number) {
  if (!Number.isSafeInteger(Math.ceil(seconds * 4)) || seconds < 0) {
    throw new RangeError('Expected a finite, non-negative step duration');
  }
  tickGame(seconds, 0.25);
  lastT = performance.now();
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

/** Count only foreground simulation time toward the active-play heartbeat. */
const HEARTBEAT_S = 300;

let manualDebugTime = false;
export const pauseDebugLoop = () => { manualDebugTime = true; };

export function startLoop() {
  let suspended = false;
  let lastSave = performance.now();
  let lastWall = Date.now();
  let lastClockCheck = lastSave;
  let sinceBeat = 0, sinceDay = 0;

  function advance(resuming = false) {
    if (import.meta.env.MODE === 'qa' && manualDebugTime) return;
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
      tickGame(dt);
      sinceBeat += dt;
      if (sinceBeat >= HEARTBEAT_S) {
        sinceBeat -= HEARTBEAT_S;
        track('heartbeat');
      }
      // New day after midnight, or the order of the day just unlocked: check every 30 s of play.
      sinceDay += dt;
      if (sinceDay >= 30) { sinceDay = 0; reportDay(); }
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
