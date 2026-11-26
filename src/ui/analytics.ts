import { analyticsFromEnv, type EventData } from '../platform/analytics';
import { storageGet, storageSet } from '../platform/Platform';
import { prefs } from './i18n';
import { platform } from './platform';

/** Game-level tracking: every event goes to the platform (portal SDK) and to Umami, if configured.
 *  Each event carries context for funnels: minutes played this line, line number, platform and build. */
export const analytics = analyticsFromEnv();

let context: () => EventData = () => ({});
export function setTrackContext(fn: () => EventData) { context = fn; }

export function track(event: string, data: EventData = {}) {
  const full = { ...context(), ...data };
  platform.track(event, full);
  analytics.event(event, full);
}

/** Whole days since this browser first opened the game: day 1 / day 7 retention without any user id. */
export function daysSinceFirstVisit(now = Date.now()): number {
  const key = 'drukarnia-first';
  let first = Number(storageGet(key));
  if (!first) { first = now; storageSet(key, String(now)); }
  return Math.floor((now - first) / 86_400_000);
}

let started = false;
/** Pageview plus uncaught error reporting; call once at boot. */
export function initAnalytics() {
  if (started) return;
  started = true;
  analytics.pageview();
  track('open', { day: daysSinceFirstVisit(), lang: prefs.value.lang });
  if (!analytics.enabled) return;
  let errors = 0;
  const report = (msg: string) => { if (errors++ < 3) analytics.event('error', { msg, build: __BUILD__ }); };
  window.addEventListener('error', e => report(`${e.message} @${e.filename?.split('/').pop()}:${e.lineno}`));
  window.addEventListener('unhandledrejection', e => report(String(e.reason)));
}
