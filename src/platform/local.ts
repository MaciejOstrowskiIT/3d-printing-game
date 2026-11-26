import type { Platform } from './Platform';

// Keys match the single-file version so players keep their progress.
const GAME_KEY = 'drukarnia-v3';
const PREF_KEY = 'drukarnia-pref';

const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode or storage full */ } };

export const localPlatform: Platform = {
  name: 'local',
  loadGame: () => get(GAME_KEY),
  saveGame: json => set(GAME_KEY, json),
  loadPrefs: () => get(PREF_KEY),
  savePrefs: json => set(PREF_KEY, json),
  showRewardedAd: async () => false,
  track: (event, data) => { if (import.meta.env.DEV) console.debug('[track]', event, data ?? ''); },
  gameplayStart: () => {},
  gameplayStop: () => {},
};
