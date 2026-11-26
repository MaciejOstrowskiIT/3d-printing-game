import { describe, expect, it } from 'vitest';
import { STORY } from '../src/content/story';
import { createGame } from '../src/core/game';
import { migrate } from '../src/core/save';
import { createState, type GameState } from '../src/core/state';
import { validStoryState } from '../src/systems/story';
import { playthrough } from './bot';

describe('story registry', () => {
  it('has unique ids', () => expect(new Set(STORY.map(m => m.id)).size).toBe(STORY.length));

  it.each(STORY.map(m => [m.id, m] as const))('%s has short PL/EN texts and a sender', (_, m) => {
    for (const pair of [m.from, m.text]) { expect(pair).toHaveLength(2); pair.forEach(x => expect(x.trim()).not.toBe('')); }
    m.text.forEach(x => expect(x.length).toBeLessThanOrEqual(140));
  });

  it('every message shows up during a full game', () => {
    const seen = new Set<string>();
    playthrough(1, 4, 0.25, undefined, (s: GameState) => s.story.forEach(id => seen.add(id)));
    expect(STORY.filter(m => !seen.has(m.id)).map(m => m.id)).toEqual([]);
  });
});

describe('story messages', () => {
  it('show one at a time, in list order, and wait for OK', () => {
    const g = createGame({ state: { ...createState(), total: 100, sold: 100, auto: 5 } });
    g.tick(1);
    expect(g.s.msg).toBe(STORY[0].id);
    g.tick(5);
    expect(g.s.story).toEqual([STORY[0].id]); // next one waits for OK
    expect(g.act('msgok')).toBe(true);
    g.tick(1);
    expect(g.s.msg).toBe(STORY[1].id);
    expect(g.act('msgok')).toBe(true);
    expect(g.act('msgok')).toBe(false);
  });

  it('do not show while catching up offline', () => {
    const g = createGame({ state: { ...createState(), total: 100 } });
    g.catchUp(600);
    expect(g.s.story).toEqual([]);
  });

  it('save validation', () => {
    const ok = { ...createState(), story: ['mum'], msg: 'mum' };
    expect(validStoryState(ok)).toBe(true);
    expect(validStoryState({ ...ok, story: ['nope'] })).toBe(false);
    expect(validStoryState({ ...ok, msg: 'viral' })).toBe(false); // open message must have been shown
    expect(validStoryState({ ...ok, story: ['mum', 'mum'] })).toBe(false);
    const old = JSON.parse(JSON.stringify(createState())) as Record<string, unknown>;
    delete old.story; delete old.msg; delete old.msgT;
    expect(migrate(old).story).toEqual([]);
    // a save from mid-game: passed milestones count as read
    const mid = JSON.parse(JSON.stringify({ ...createState(), total: 50000, sold: 40000, auto: 30 })) as Record<string, unknown>;
    delete mid.story; delete mid.msg;
    const s = migrate(mid);
    expect(s.story).toEqual(expect.arrayContaining(['mum', 'firstClient', 'neighbour', 'rival']));
    expect(s.msg).toBeNull();
  });
});
