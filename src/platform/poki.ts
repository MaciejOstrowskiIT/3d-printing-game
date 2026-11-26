import { adState, GAME_KEY, loadScript, PREF_KEY, storageGet, storageSet, type Platform } from './Platform';

/** Minimal typing of the Poki HTML5 SDK surface we use. Docs: https://sdk.poki.com/html5.html */
interface PokiSdk {
  init(): Promise<void>;
  gameLoadingFinished(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  rewardedBreak(opts?: { size?: 'small' | 'medium' | 'large'; onStart?(): void }): Promise<boolean>;
}
declare global { interface Window { PokiSDK?: PokiSdk } }

let sdk: PokiSdk | null = null;
const safe = (fn: () => void) => { try { fn(); } catch { /* SDK hiccups must not break the game */ } };

export const pokiPlatform: Platform = {
  name: 'poki',
  async init() {
    if (!(await loadScript('https://game-cdn.poki.com/scripts/v2/poki-sdk.js'))) return;
    // Poki asks games to keep working when init fails (e.g. adblock), so we only drop the SDK reference.
    try { await window.PokiSDK!.init(); sdk = window.PokiSDK!; } catch { sdk = window.PokiSDK ?? null; }
  },
  loadingFinished: () => safe(() => sdk?.gameLoadingFinished()),
  loadGame: () => storageGet(GAME_KEY),
  saveGame: json => storageSet(GAME_KEY, json),
  loadPrefs: () => storageGet(PREF_KEY),
  savePrefs: json => storageSet(PREF_KEY, json),
  get rewardedAvailable() { return !!sdk; },
  async showRewardedAd() {
    if (!sdk) return false;
    // Poki requires gameplayStop before an ad break and gameplayStart after it.
    safe(() => sdk!.gameplayStop());
    try {
      return await sdk.rewardedBreak({ size: 'medium', onStart: () => { adState.playing = true; } });
    } catch {
      return false;
    } finally {
      adState.playing = false;
      safe(() => sdk!.gameplayStart());
    }
  },
  track: () => {},
  gameplayStart: () => safe(() => sdk?.gameplayStart()),
  gameplayStop: () => safe(() => sdk?.gameplayStop()),
};
