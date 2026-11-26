/// <reference types="vite/client" />

/** Build id injected by vite.config.ts (package version + git short sha). */
declare const __BUILD__: string;

interface ImportMetaEnv {
  readonly VITE_PLATFORM?: 'crazygames' | 'poki';
  readonly VITE_UMAMI_HOST?: string;
  readonly VITE_UMAMI_WEBSITE_ID?: string;
  readonly VITE_UMAMI_ENDPOINT?: string;
  readonly VITE_UMAMI_DEV?: string;
}
