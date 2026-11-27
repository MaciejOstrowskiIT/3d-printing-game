import { describe, expect, it } from 'vitest';
import { REPORT_COOLDOWN_MS, createReporter } from '../src/platform/report';
import { createUmami, noAnalytics, type PageContext } from '../src/platform/analytics';

const page = (): PageContext => ({ hostname: 'h', url: '/', title: 't', referrer: '', language: 'pl', screen: '1x1' });

function setup(endpoint?: string) {
  let clock = 1_000_000, stored = 0;
  const posts: { url: string; body: any }[] = [];
  const hits: any[] = [];
  const analytics = createUmami({ host: 'https://s.example.com', website: 'w' }, page, (_u, b) => hits.push(JSON.parse(b)));
  const r = createReporter({ endpoint, analytics, now: () => clock, load: () => stored, save: t => { stored = t; }, post: (url, b) => posts.push({ url, body: JSON.parse(b) }) });
  return { r, posts, hits, tick: (ms: number) => { clock += ms; } };
}

describe('bug reporter', () => {
  it('posts the description and context to the endpoint', () => {
    const { r, posts } = setup('https://x.example.com/report');
    expect(r.send('  the counter shows NaN after printing  ', { build: '1.0', min: 4 })).toEqual({ ok: true });
    expect(posts[0].url).toBe('https://x.example.com/report');
    expect(posts[0].body).toMatchObject({ type: 'bug_report', description: 'the counter shows NaN after printing', build: '1.0', min: 4 });
  });

  it('falls back to an Umami event, splitting long text into 200-char parts', () => {
    const { r, hits } = setup();
    r.send('x'.repeat(450));
    const d = hits[0].payload.data;
    expect(hits[0].payload.name).toBe('bug_report');
    expect([d.d1.length, d.d2.length, d.d3.length]).toEqual([200, 200, 50]);
  });

  it('rejects too short text without starting the cooldown', () => {
    const { r } = setup('https://x.example.com');
    expect(r.send('short')).toEqual({ ok: false, reason: 'short' });
    expect(r.wait()).toBe(0);
  });

  it('allows one report per 15 seconds', () => {
    const { r, posts, tick } = setup('https://x.example.com');
    r.send('first report, long enough');
    tick(5000);
    expect(r.send('second report, too soon')).toEqual({ ok: false, reason: 'cooldown', waitMs: REPORT_COOLDOWN_MS - 5000 });
    tick(REPORT_COOLDOWN_MS - 5000);
    expect(r.send('second report, now fine')).toEqual({ ok: true });
    expect(posts).toHaveLength(2);
  });

  it('is unavailable with neither an endpoint nor analytics', () => {
    const r = createReporter({ analytics: noAnalytics });
    expect(r.enabled).toBe(false);
    expect(r.send('a perfectly valid description')).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('caps the description length', () => {
    const { r, posts } = setup('https://x.example.com');
    r.send('y'.repeat(5000));
    expect(posts[0].body.description).toHaveLength(600);
  });
});
