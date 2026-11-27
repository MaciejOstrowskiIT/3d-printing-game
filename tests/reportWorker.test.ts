import { describe, expect, it } from 'vitest';
import { MODERATION_MODEL, fence, handle, moderationOk, issueFrom, originAllowed, parseReport, type Env } from '../infra/report-worker/src/index';

const env: Env = { GITHUB_TOKEN: 't0ken', GITHUB_REPO: 'me/game', ALLOWED_ORIGINS: 'https://me.github.io,*.crazygames.com' };
const post = (body: unknown, origin = 'https://me.github.io') =>
  new Request('https://w.example.com', { method: 'POST', headers: { Origin: origin }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const ghOk = (calls: { url: string; init: RequestInit }[]) =>
  (async (url: unknown, init?: RequestInit) => { calls.push({ url: String(url), init: init! }); return new Response('{}', { status: 201 }); }) as typeof fetch;

describe('report worker', () => {
  it('opens a labelled issue for a valid report', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const res = await handle(post({ description: 'Counter shows NaN after printing', build: '0.5.0+abc', min: 12, evil: 'x' }), env, ghOk(calls));
    expect(res.status).toBe(202);
    expect(calls[0].url).toBe('https://api.github.com/repos/me/game/issues');
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer t0ken');
    const issue = JSON.parse(calls[0].init.body as string);
    expect(issue.labels).toEqual(['bug-report']);
    expect(issue.body).toContain('| build | 0.5.0+abc |');
    expect(issue.body).not.toContain('evil');
  });

  it('rejects foreign origins, bad JSON, short text and big bodies without calling GitHub', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const f = ghOk(calls);
    expect((await handle(post({ description: 'long enough text' }, 'https://evil.example'), env, f)).status).toBe(403);
    expect((await handle(post('not json'), env, f)).status).toBe(400);
    expect((await handle(post({ description: 'short' }), env, f)).status).toBe(400);
    expect((await handle(post({ description: 'x'.repeat(5000) }), env, f)).status).toBe(413);
    expect(calls).toHaveLength(0);
  });

  it('answers preflight, refuses other methods, honours the rate limiter', async () => {
    const pre = await handle(new Request('https://w', { method: 'OPTIONS', headers: { Origin: 'https://me.github.io' } }), env);
    expect(pre.status).toBe(204);
    expect(pre.headers.get('Access-Control-Allow-Origin')).toBe('https://me.github.io');
    expect((await handle(new Request('https://w', { method: 'GET' }), env)).status).toBe(405);
    const limited: Env = { ...env, LIMITER: { limit: async () => ({ success: false }) } };
    expect((await handle(post({ description: 'long enough text' }), limited)).status).toBe(429);
  });

  it('reports 502 when GitHub fails and leaks nothing', async () => {
    const res = await handle(post({ description: 'long enough text' }), env, (async () => new Response('secret detail', { status: 401 })) as typeof fetch);
    expect(res.status).toBe(502);
    expect(await res.text()).toBe('');
  });

  it('matches origins by exact value or wildcard subdomain', () => {
    expect(originAllowed('https://games.crazygames.com', env.ALLOWED_ORIGINS)).toBe(true);
    expect(originAllowed('https://crazygames.com.evil.io', env.ALLOWED_ORIGINS)).toBe(false);
    expect(originAllowed(null, env.ALLOWED_ORIGINS)).toBe(false);
    expect(originAllowed('https://anything.io', '')).toBe(true);
  });

  it('neutralises markdown and mentions in the issue', () => {
    expect(fence('a ``` b')).toMatch(/^````text\n/);
    const issue = issueFrom(parseReport({ description: '@everyone [click](http://x) ```\nhi there friend' })!);
    expect(issue.title.replace('[Bug report] ', '')).not.toMatch(/[@\[\]`]/);
    expect(issue.body.startsWith('````text')).toBe(true);
  });

  it('keeps only whitelisted, sanitised context', () => {
    const r = parseReport({ description: 'a valid description', build: '1.0 <script>', min: NaN, goal: 3, other: 'x' })!;
    expect(r.context).toEqual({ build: '1.0 script', goal: 3 });
  });

  describe('moderation', () => {
    const ai = (response: unknown): Env['AI'] => ({ run: async () => ({ response }) });

    it('holds back a report Llama Guard marks unsafe and does not call GitHub', async () => {
      const calls: { url: string; init: RequestInit }[] = [];
      const res = await handle(post({ description: 'long enough hateful text' }), { ...env, AI: ai({ safe: false, categories: ['S10'] }) }, ghOk(calls));
      expect(res.status).toBe(422);
      expect(calls).toHaveLength(0);
    });

    it('lets safe reports through, in both answer formats', async () => {
      for (const response of [{ safe: true, categories: [] }, 'safe']) {
        const calls: { url: string; init: RequestInit }[] = [];
        expect((await handle(post({ description: 'long enough bug text' }), { ...env, AI: ai(response) }, ghOk(calls))).status).toBe(202);
        expect(calls).toHaveLength(1);
      }
      expect(await moderationOk('x', ai('unsafe\nS1'))).toBe(false);
    });

    it('sends the text to the free model as a user message', async () => {
      let seen: unknown[] = [];
      await moderationOk('hello there', { run: async (m, i) => { seen = [m, i]; return { response: { safe: true } }; } });
      expect(seen).toEqual([MODERATION_MODEL, { messages: [{ role: 'user', content: 'hello there' }] }]);
    });

    it('fails open without a binding, on errors, on timeouts and on odd answers', async () => {
      expect(await moderationOk('x')).toBe(true);
      expect(await moderationOk('x', { run: async () => { throw new Error('down'); } })).toBe(true);
      expect(await moderationOk('x', ai(undefined))).toBe(true);
      expect(await moderationOk('x', { run: async () => null })).toBe(true);
    });
  });
});
