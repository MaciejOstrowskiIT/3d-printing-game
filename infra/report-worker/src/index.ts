/** Cloudflare Worker: receives in-game bug reports (see src/platform/report.ts) and opens a GitHub issue.
 *  The GitHub token lives only here as a secret, never in the game build. Setup: infra/report-worker/README.md. */

import { containsProfanity } from './profanity';

export interface Env {
  GITHUB_TOKEN: string;
  /** "owner/repo" that receives the issues. */
  GITHUB_REPO: string;
  /** Comma-separated origins allowed to call the worker; "*.example.com" matches subdomains. Empty = any origin. */
  ALLOWED_ORIGINS?: string;
  /** Optional Workers Rate Limiting binding (see wrangler.toml); keyed by client IP. */
  LIMITER?: { limit(opts: { key: string }): Promise<{ success: boolean }> };
  /** Optional Workers AI binding (free tier) used to moderate the text before it becomes a public issue. */
  AI?: { run(model: string, input: unknown): Promise<unknown> };
}

export const MODERATION_MODEL = '@cf/meta/llama-guard-3-8b';
const MODERATION_TIMEOUT_MS = 4000;

/** Asks Llama Guard whether the text is safe to publish (hate, harassment, threats, sexual or violent content...).
 *  Fails open: with no AI binding, an error or a timeout the report is let through, because losing a real bug report
 *  is worse than a rare rude one; the rate limit and GitHub's own moderation still apply. */
export async function moderationOk(text: string, ai?: Env['AI']): Promise<boolean> {
  if (!ai) return true;
  try {
    const out = await Promise.race([
      ai.run(MODERATION_MODEL, { messages: [{ role: 'user', content: text }], temperature: 0 }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), MODERATION_TIMEOUT_MS)),
    ]) as { response?: unknown } | null;
    const r = out?.response;
    if (r && typeof r === 'object') return (r as { safe?: unknown }).safe !== false;
    if (typeof r === 'string') return !/^\s*unsafe/i.test(r);
    return true;
  } catch { return true; }
}

const MAX_BODY = 4096;
const MAX_TEXT = 600;
const MIN_TEXT = 10;
const CONTEXT_KEYS = ['lang', 'build', 'min', 'line', 'goal', 'phase', 'view', 'at'] as const;

export function originAllowed(origin: string | null, list?: string): boolean {
  const rules = (list ?? '').split(',').map(s => s.trim()).filter(Boolean);
  if (!rules.length) return true;
  if (!origin) return false;
  let host: string;
  try { host = new URL(origin).hostname; } catch { return false; }
  return rules.some(r => {
    if (r.startsWith('*.')) return host.endsWith(r.slice(1));
    try { return new URL(r).origin === new URL(origin).origin; } catch { return r === host; }
  });
}

/** Wraps the text in a code fence longer than any backtick run inside, so the player's text cannot inject markdown,
 *  links or @mentions into the issue. */
export function fence(text: string): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map(m => m.length));
  const f = '`'.repeat(Math.max(3, longest + 1));
  return `${f}text\n${text}\n${f}`;
}

export interface Report { description: string; context: Record<string, string | number> }

/** Validates the untrusted JSON body; returns null when it is not a usable report. */
export function parseReport(raw: unknown): Report | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.description !== 'string') return null;
  const description = o.description.replace(/\r\n?/g, '\n').trim().slice(0, MAX_TEXT);
  if (description.length < MIN_TEXT) return null;
  const context: Report['context'] = {};
  for (const k of CONTEXT_KEYS) {
    const v = o[k];
    if (typeof v === 'string') context[k] = v.replace(/[^\w .:+\-/]/g, '').slice(0, 40);
    else if (typeof v === 'number' && Number.isFinite(v)) context[k] = v;
  }
  return { description, context };
}

export function issueFrom(r: Report): { title: string; body: string; labels: string[] } {
  const first = r.description.split('\n')[0].replace(/[@#`\[\]]/g, '').slice(0, 60).trim();
  const rows = Object.entries(r.context).map(([k, v]) => `| ${k} | ${v} |`).join('\n');
  return {
    title: `[Bug report] ${first}`,
    body: `${fence(r.description)}\n\n| Context | |\n|---|---|\n${rows}\n\n_Sent from the in-game form._`,
    labels: ['bug-report'],
  };
}

export async function handle(req: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const origin = req.headers.get('Origin');
  const cors: Record<string, string> = {
    'Access-Control-Allow-Origin': origin && originAllowed(origin, env.ALLOWED_ORIGINS) ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  const reply = (status: number) => new Response(null, { status, headers: cors });

  if (req.method === 'OPTIONS') return reply(204);
  if (req.method !== 'POST') return reply(405);
  if (!originAllowed(origin, env.ALLOWED_ORIGINS)) return reply(403);

  if (env.LIMITER) {
    const ip = req.headers.get('CF-Connecting-IP') ?? 'unknown';
    if (!(await env.LIMITER.limit({ key: ip })).success) return reply(429);
  }

  const text = await req.text();
  if (text.length > MAX_BODY) return reply(413);
  let report: Report | null = null;
  try { report = parseReport(JSON.parse(text)); } catch { /* falls through to 400 */ }
  if (!report) return reply(400);
  if (containsProfanity(report.description) || !(await moderationOk(report.description, env.AI))) return reply(422);

  const res = await fetchFn(`https://api.github.com/repos/${env.GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'drukarnia-report-worker',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify(issueFrom(report)),
  });
  // Do not leak GitHub's answer to the client; the game does not show the result anyway.
  return reply(res.ok ? 202 : 502);
}

export default { fetch: (req: Request, env: Env) => handle(req, env) };
