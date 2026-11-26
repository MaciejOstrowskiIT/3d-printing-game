import { crazyGamesPlatform } from '../platform/crazygames';
import { localPlatform } from '../platform/local';
import type { Platform } from '../platform/Platform';
import { pokiPlatform } from '../platform/poki';

/** Active platform, chosen at build time: `npm run build:crazygames` / `build:poki` set VITE_PLATFORM.
 *  Vite replaces the env value with a literal, so unused adapters are tree-shaken out of each build. */
const target = import.meta.env.VITE_PLATFORM as string | undefined;

export const platform: Platform =
  target === 'crazygames' ? crazyGamesPlatform : target === 'poki' ? pokiPlatform : localPlatform;
