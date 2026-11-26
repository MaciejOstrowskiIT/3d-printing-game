/** Product analytics: sends game events to a self-hosted Umami instance (https://umami.is).
 *  Cookieless and anonymous: Umami derives a daily-rotating visitor hash server-side, the game sends no ids.
 *  Disabled unless VITE_UMAMI_HOST and VITE_UMAMI_WEBSITE_ID are set at build time. */

export type EventData = Record<string, string | number | boolean>;

export interface Analytics {
  readonly enabled: boolean;
  pageview(): void;
  event(name: string, data?: EventData): void;
}

export interface UmamiConfig {
  /** Base URL of the Umami instance, e.g. https://stats.example.com */
  host: string;
  /** Website id from Umami settings. */
  website: string;
  /** Collect path; Umami lets you rename it (COLLECT_API_ENDPOINT) to get past ad blockers. */
  endpoint?: string;
}

/** Page context Umami expects with every hit. Injected so the sender can be tested outside a browser. */
export interface PageContext {
  hostname: string;
  url: string;
  title: string;
  referrer: string;
  language: string;
  screen: string;
}

export type Send = (url: string, body: string) => void;

const browserPage = (): PageContext => ({
  hostname: location.hostname,
  url: location.pathname,
  title: document.title,
  referrer: document.referrer,
  language: navigator.language,
  screen: `${screen.width}x${screen.height}`,
});

const browserSend: Send = (url, body) => {
  // keepalive lets the last event (e.g. on pagehide) finish after the tab closes.
  fetch(url, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
};

export const noAnalytics: Analytics = { enabled: false, pageview() {}, event() {} };

/** Umami event names are limited to 50 characters; keep data values short too. */
const clip = (v: string | number | boolean) => (typeof v === 'string' ? v.slice(0, 200) : v);

export function createUmami(cfg: UmamiConfig, page: () => PageContext = browserPage, send: Send = browserSend): Analytics {
  const url = cfg.host.replace(/\/+$/, '') + (cfg.endpoint || '/api/send');
  const hit = (extra: { name?: string; data?: EventData }) => {
    try {
      const payload = { website: cfg.website, ...page(), ...extra };
      send(url, JSON.stringify({ type: 'event', payload }));
    } catch { /* analytics must never break the game */ }
  };
  return {
    enabled: true,
    pageview: () => hit({}),
    event: (name, data) => {
      const clean = data && Object.fromEntries(Object.entries(data).map(([k, v]) => [k, clip(v)]));
      hit({ name: name.slice(0, 50), data: clean });
    },
  };
}

/** Players (and the developer) can opt out with #notrack in the URL; the choice is remembered. */
export function optedOut(): boolean {
  try {
    if (location.hash.includes('notrack')) localStorage.setItem('drukarnia-notrack', '1');
    if (location.hash.includes('track=on')) localStorage.removeItem('drukarnia-notrack');
    return localStorage.getItem('drukarnia-notrack') === '1' || navigator.doNotTrack === '1';
  } catch {
    return false;
  }
}

/** Analytics for this build, chosen from env at build time. Dev builds stay silent unless VITE_UMAMI_DEV is set. */
export function analyticsFromEnv(): Analytics {
  const env = import.meta.env;
  const host = env.VITE_UMAMI_HOST as string | undefined;
  const website = env.VITE_UMAMI_WEBSITE_ID as string | undefined;
  if (!host || !website) return noAnalytics;
  if (env.DEV && !env.VITE_UMAMI_DEV) return noAnalytics;
  if (optedOut()) return noAnalytics;
  return createUmami({ host, website, endpoint: env.VITE_UMAMI_ENDPOINT as string | undefined });
}
