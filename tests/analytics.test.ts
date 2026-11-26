import { describe, expect, it } from 'vitest';
import { createUmami, type PageContext } from '../src/platform/analytics';
import { createGame } from '../src/core/game';

const page = (): PageContext => ({ hostname: 'example.github.io', url: '/game/', title: 'Drukarnia', referrer: '', language: 'pl-PL', screen: '1920x1080' });

function capture() {
  const sent: { url: string; body: any }[] = [];
  return { sent, send: (url: string, body: string) => sent.push({ url, body: JSON.parse(body) }) };
}

describe('umami sender', () => {
  it('posts events in the Umami collect format', () => {
    const { sent, send } = capture();
    const a = createUmami({ host: 'https://stats.example.com/', website: 'abc' }, page, send);
    a.event('goal', { index: 3, min: 12 });
    expect(sent[0].url).toBe('https://stats.example.com/api/send');
    expect(sent[0].body).toEqual({
      type: 'event',
      payload: { website: 'abc', ...page(), name: 'goal', data: { index: 3, min: 12 } },
    });
  });

  it('sends pageviews without a name and honours a renamed endpoint', () => {
    const { sent, send } = capture();
    createUmami({ host: 'https://s.example.com', website: 'abc', endpoint: '/api/collect' }, page, send).pageview();
    expect(sent[0].url).toBe('https://s.example.com/api/collect');
    expect(sent[0].body.payload.name).toBeUndefined();
  });

  it('clips long names and values and never throws', () => {
    const { sent, send } = capture();
    const a = createUmami({ host: 'https://s', website: 'w' }, page, send);
    a.event('x'.repeat(80), { msg: 'y'.repeat(500) });
    expect(sent[0].body.payload.name).toHaveLength(50);
    expect(sent[0].body.payload.data.msg).toHaveLength(200);
    const broken = createUmami({ host: 'https://s', website: 'w' }, page, () => { throw new Error('offline'); });
    expect(() => broken.event('goal')).not.toThrow();
  });
});

describe('play time', () => {
  it('counts only online ticks', () => {
    const g = createGame({ rng: () => 0.5 });
    g.tick(1); g.tick(1);
    expect(g.s.play).toBe(2);
    g.catchUp(3600);
    expect(g.s.play).toBe(2);
  });
});
