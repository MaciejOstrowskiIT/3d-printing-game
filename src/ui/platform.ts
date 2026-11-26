import type { Platform } from '../platform/Platform';
import { localPlatform } from '../platform/local';

/** Aktywna platforma. Na portalu podmienimy ją tutaj (np. po wykryciu SDK albo zmiennej builda). */
export const platform: Platform = localPlatform;
