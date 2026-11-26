import { adState, GAME_KEY, PREF_KEY, storageGet, storageSet, type Platform } from './Platform';

/** Mock ads for testing the reward flow without a portal: dev mode, or #mockads in the URL. */
const mockAds = () => import.meta.env.DEV || location.hash.includes('mockads');

export const localPlatform: Platform = {
  name: 'local',
  init: async () => {},
  loadingFinished: () => {},
  loadGame: () => storageGet(GAME_KEY),
  saveGame: json => storageSet(GAME_KEY, json),
  loadPrefs: () => storageGet(PREF_KEY),
  savePrefs: json => storageSet(PREF_KEY, json),
  get rewardedAvailable() { return mockAds(); },
  showRewardedAd: async () => {
    if (!mockAds()) return false;
    adState.playing = true;
    await new Promise(r => setTimeout(r, 1200));
    adState.playing = false;
    return true;
  },
  track: (event, data) => { if (import.meta.env.DEV) console.debug('[track]', event, data ?? ''); },
  gameplayStart: () => {},
  gameplayStop: () => {},
};
