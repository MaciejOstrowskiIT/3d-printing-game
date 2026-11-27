/** In-game bug reports: a free-text description plus anonymous context (build, minutes played, language).
 *  No contact details are asked for or sent. Sent to VITE_REPORT_ENDPOINT as JSON when set; otherwise falls back to
 *  an Umami `bug_report` event, so reports work with the existing analytics and no extra backend. */
import type { Analytics, EventData } from './analytics';

export const REPORT_COOLDOWN_MS = 15_000;
export const REPORT_MIN = 10;
export const REPORT_MAX = 600;
const KEY = 'drukarnia-report-at';

export type ReportResult = { ok: true } | { ok: false; reason: 'short' | 'cooldown' | 'unavailable'; waitMs?: number };

export interface Reporter {
  readonly enabled: boolean;
  /** Milliseconds until the next report is allowed; 0 when the player can send now. */
  wait(): number;
  send(description: string, context?: EventData): ReportResult;
}

export interface ReporterDeps {
  endpoint?: string;
  analytics: Analytics;
  now?: () => number;
  /** Persisted so a page reload does not reset the cooldown. */
  load?: () => number;
  save?: (t: number) => void;
  post?: (url: string, body: string) => void;
}

const browserPost = (url: string, body: string) => {
  fetch(url, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
};

export function createReporter(d: ReporterDeps): Reporter {
  const now = d.now ?? Date.now;
  const load = d.load ?? (() => { try { return Number(localStorage.getItem(KEY)) || 0; } catch { return 0; } });
  const save = d.save ?? (t => { try { localStorage.setItem(KEY, String(t)); } catch { /* private mode */ } });
  const post = d.post ?? browserPost;
  const enabled = !!d.endpoint || d.analytics.enabled;
  const wait = () => Math.max(0, load() + REPORT_COOLDOWN_MS - now());
  return {
    enabled,
    wait,
    send(description, context = {}) {
      const text = description.trim().slice(0, REPORT_MAX);
      if (!enabled) return { ok: false, reason: 'unavailable' };
      if (text.length < REPORT_MIN) return { ok: false, reason: 'short' };
      const w = wait();
      if (w > 0) return { ok: false, reason: 'cooldown', waitMs: w };
      save(now());
      try {
        if (d.endpoint) post(d.endpoint, JSON.stringify({ type: 'bug_report', description: text, ...context, at: new Date(now()).toISOString() }));
        else d.analytics.event('bug_report', { ...context, d1: text.slice(0, 200), d2: text.slice(200, 400), d3: text.slice(400, 600) });
      } catch { /* reporting must never break the game */ }
      return { ok: true };
    },
  };
}
