import { adState, GAME_KEY, loadScript, PREF_KEY, storageGet, storageSet, type Platform } from './Platform';

/** Minimal typing of the CrazyGames HTML5 SDK v3 surface we use. Docs: https://docs.crazygames.com/sdk/html5-v3/intro */
interface CrazySdk {
  init(): Promise<void>;
  ad: { requestAd(type: 'rewarded' | 'midgame', cb: { adStarted?(): void; adFinished?(): void; adError?(e: unknown): void }): void };
  game: { gameplayStart(): void; gameplayStop(): void; loadingStop?(): void; happytime?(): void };
}
declare global { interface Window { CrazyGames?: { SDK: CrazySdk } } }

let sdk: CrazySdk | null = null;
const safe = (fn: () => void) => { try { fn(); } catch { /* SDK hiccups must not break the game */ } };

export const crazyGamesPlatform: Platform = {
  name: 'crazygames',
  async init() {
    if (!(await loadScript('https://sdk.crazygames.com/crazygames-sdk-v3.js'))) return;
    try { await window.CrazyGames!.SDK.init(); sdk = window.CrazyGames!.SDK; } catch { sdk = null; }
  },
  loadingFinished: () => safe(() => sdk?.game.loadingStop?.()),
  // Progress stays in localStorage for now; CrazyGames cloud data can be added here later.
  loadGame: () => storageGet(GAME_KEY),
  saveGame: json => storageSet(GAME_KEY, json),
  loadPrefs: () => storageGet(PREF_KEY),
  savePrefs: json => storageSet(PREF_KEY, json),
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
