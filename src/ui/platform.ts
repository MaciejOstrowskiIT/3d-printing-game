import type { Platform } from '../platform/Platform';
import { localPlatform } from '../platform/local';

/** Active platform. Portal builds will swap it here (e.g. by detecting the SDK or a build flag). */
export const platform: Platform = localPlatform;
