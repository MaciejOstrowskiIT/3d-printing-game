/** Everything that depends on where the game runs. Locally: localStorage. On a portal: the Poki or CrazyGames SDK.
 *  The game only knows this interface, so supporting a new portal means a new file in platform/, with no changes to core or UI. */
export interface Platform {
  name: 'local' | 'crazygames' | 'poki';
  /** Loads and initialises the SDK. Must resolve even if the SDK fails, so the game always starts. */
  init(): Promise<void>;
  /** The game finished loading and is ready to play. */
  loadingFinished(): void;
  loadGame(): string | null;
  saveGame(json: string): void;
  loadPrefs(): string | null;
  savePrefs(json: string): void;
  /** Whether rewarded ads can be offered at all on this platform. */
  readonly rewardedAvailable: boolean;
  /** Rewarded ad. Resolves to true only when the player watched it to the end. */
  showRewardedAd(): Promise<boolean>;
  /** Analytics event (goals, orders, liftoff). */
  track(event: string, data?: Record<string, unknown>): void;
  /** Portal signals: gameplay started or stopped. */
  gameplayStart(): void;
  gameplayStop(): void;
}

/** Shared localStorage helpers. Keys match the single-file version so players keep their progress. */
export const GAME_KEY = 'drukarnia-v3';
export const PREF_KEY = 'drukarnia-pref';
export const storageGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
export const storageSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode or storage full */ } };

/** Injects an SDK script and resolves when it has loaded (or failed, so the game never hangs). */
export function loadScript(src: string, timeoutMs = 8000): Promise<boolean> {
  return new Promise(resolve => {
    const el = document.createElement('script');
    const timer = setTimeout(() => resolve(false), timeoutMs);
    el.src = src;
    el.async = true;
    el.onload = () => { clearTimeout(timer); resolve(true); };
    el.onerror = () => { clearTimeout(timer); resolve(false); };
    document.head.appendChild(el);
  });
}

/** Set while an ad is playing; the audio module stays silent meanwhile, as both portals require. */
export const adState = { playing: false };
