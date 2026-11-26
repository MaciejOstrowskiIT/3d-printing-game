import { adState, GAME_KEY, loadScript, PREF_KEY, storageGet, storageSet, type Platform } from './Platform';

/** Minimal typing of the CrazyGames HTML5 SDK v3 surface we use. Docs: https://docs.crazygames.com/sdk/html5-v3/intro */
interface CrazySdk {
  init(): Promise<void>;
  ad: { requestAd(type: 'rewarded' | 'midgame', cb: { adStarted?(): void; adFinished?(): void; adError?(e: unknown): void }): void };
  game: { gameplayStart(): void; gameplayStop(): void; loadingStop?(): void; happytime?(): void };
  /** Data module: localStorage-like, synced to the player's CrazyGames account (guests: kept in localStorage). */
  data?: KeyValue;
}

export interface KeyValue { getItem(key: string): string | null; setItem(key: string, value: string): void }

/** Account-synced storage with a safe path for existing players:
 *  - reads from the data module; the first time, copies an existing localStorage save into it (returning players
 *    keep their progress, as CrazyGames asks);
 *  - if the module is missing or throws (e.g. dataModuleDisabled when the submission did not enable it),
 *    falls back to localStorage so the game still saves. */
export function accountStorage(data: KeyValue | null | undefined, local: { get(k: string): string | null; set(k: string, v: string): void }) {
  let broken = !data;
  return {
    get(key: string): string | null {
      if (broken) return local.get(key);
      try {
        const v = data!.getItem(key);
        if (v !== null) return v;
        const old = local.get(key);
        if (old !== null) data!.setItem(key, old);
        return old;
      } catch { broken = true; return local.get(key); }
    },
    set(key: string, value: string) {
      if (!broken) { try { data!.setItem(key, value); return; } catch { broken = true; } }
      local.set(key, value);
    },
  };
}

const local = { get: storageGet, set: storageSet };
let store = accountStorage(null, local);
declare global { interface Window { CrazyGames?: { SDK: CrazySdk } } }

let sdk: CrazySdk | null = null;
const safe = (fn: () => void) => { try { fn(); } catch { /* SDK hiccups must not break the game */ } };

export const crazyGamesPlatform: Platform = {
  name: 'crazygames',
  async init() {
    if (!(await loadScript('https://sdk.crazygames.com/crazygames-sdk-v3.js'))) return;
    try { await window.CrazyGames!.SDK.init(); sdk = window.CrazyGames!.SDK; } catch { sdk = null; }
    // On a login the portal reloads the game, so the data module never changes under a running session.
    store = accountStorage(sdk?.data, local);
  },
  loadingFinished: () => safe(() => sdk?.game.loadingStop?.()),
  loadGame: () => store.get(GAME_KEY),
  saveGame: json => store.set(GAME_KEY, json),
  loadPrefs: () => store.get(PREF_KEY),
  savePrefs: json => store.set(PREF_KEY, json),
  get rewardedAvailable() { return !!sdk; },
  showRewardedAd() {
    if (!sdk) return Promise.resolve(false);
    return new Promise(resolve => {
      const done = (ok: boolean) => { adState.playing = false; resolve(ok); };
      safe(() => sdk!.ad.requestAd('rewarded', {
        adStarted: () => { adState.playing = true; },
        adFinished: () => done(true),
        adError: () => done(false), // also fires when no ad was available
      }));
    });
  },
  track: event => { if (event === 'goal' || event === 'liftoff') safe(() => sdk?.game.happytime?.()); },
  gameplayStart: () => safe(() => sdk?.game.gameplayStart()),
  gameplayStop: () => safe(() => sdk?.game.gameplayStop()),
};
