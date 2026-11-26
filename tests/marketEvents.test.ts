import { describe, expect, it } from 'vitest';
import { BAL } from '../src/content/balance';
import { MARKET_EVENT } from '../src/content/events';
import type { Ctx, GameEvent } from '../src/core/ctx';
import { demand, marketMul, spoolPrice } from '../src/core/formulas';
import { createGame } from '../src/core/game';
import { migrate } from '../src/core/save';
import { createState, type GameState } from '../src/core/state';
import { acceptMarketEvent, marketEventsSystem, offerCost } from '../src/systems/marketEvents';

function ctx(rng = () => 0, offline = false) {
  const events: GameEvent[] = [];
  const c: Ctx = { rng, offline, emit: e => events.push(e) };
  return { c, events };
}

const midGame = (): GameState => ({ ...createState(), goal: 6, auto: 20, zl: 1e6, inv: 1e5, fil: 1e5, mevT: 0 });

/** Puts a specific event on the table, as the system would. */
function offer(s: GameState, id: string) {
  const e = MARKET_EVENT[id];
  if (e.counter) s.mfx.push({ id, t: e.seconds });
  s.mev = { id, offer: BAL.marketEventOffer, cost: offerCost(s, e) };
}

describe('market events', () => {
  it('appear only after goal 3, only online, and not in space', () => {
    const early = { ...createState(), goal: 2, mevT: 0 };
    marketEventsSystem(early, 1, ctx().c);
    expect(early.mev || early.mfx.length).toBeFalsy();

    const away = midGame();
    marketEventsSystem(away, 1, ctx(() => 0, true).c);
    expect(away.mev || away.mfx.length).toBeFalsy();

    const s = midGame();
    const { c, events } = ctx();
    marketEventsSystem(s, 1, c);
    expect(s.mev || s.mfx.length).toBeTruthy();
    expect(events.some(e => e.type === 'market')).toBe(true);
    expect(s.mevT).toBeGreaterThanOrEqual(BAL.marketEventEvery[0]);
  });

  it('a running effect changes demand and expires', () => {
    const s = midGame();
    const before = demand(s);
    s.mfx = [{ id: 'holiday', t: 2 }];
    s.mevT = 999; // no new event during this test
    expect(demand(s)).toBeCloseTo(before * 2);
    marketEventsSystem(s, 3, ctx().c);
    expect(s.mfx).toHaveLength(0);
    expect(demand(s)).toBeCloseTo(before);
  });

  it('shortage raises the spool price; stacked effects are clamped', () => {
    const s = midGame();
    const p = spoolPrice(s);
    s.mfx = [{ id: 'shortage', t: 10 }];
    expect(spoolPrice(s)).toBeCloseTo(p * 1.4);
    s.mfx = [{ id: 'viral', t: 10 }, { id: 'holiday', t: 10 }, { id: 'influencer', t: 10 }];
    expect(marketMul(s, 'demand')).toBe(BAL.marketMulRange[1]);
  });

  it('a counter offer starts bad and paying cancels it', () => {
    const s = midGame();
    offer(s, 'dumping');
    expect(marketMul(s, 'demand')).toBeCloseTo(0.6);
    const zl = s.zl, cost = s.mev!.cost;
    expect(acceptMarketEvent(s, ctx().c)).toBe(true);
    expect(s.zl).toBeCloseTo(zl - cost);
    expect(s.mfx).toHaveLength(0);
    expect(s.mev).toBeNull();
  });

  it('clearance sells 5 spools at half price', () => {
    const s = midGame();
    offer(s, 'clearance');
    expect(s.mev!.cost).toBeCloseTo(spoolPrice(s) * 2.5, 1);
    const fil = s.fil;
    acceptMarketEvent(s, ctx().c);
    expect(s.fil).toBe(fil + 5 * s.spoolG);
  });

  it('an offer costs seconds of income, and an unaffordable one cannot be taken', () => {
    const s = midGame();
    s.price = 2;
    offer(s, 'influencer');
    expect(s.mev!.cost).toBeGreaterThanOrEqual(BAL.marketMinMoney);
    s.zl = s.mev!.cost - 1;
    expect(acceptMarketEvent(s, ctx().c)).toBe(false);
    s.zl = s.mev!.cost;
    expect(acceptMarketEvent(s, ctx().c)).toBe(true);
    expect(s.zl).toBe(0);
    expect(s.mfx.map(f => f.id)).toEqual(['influencer']);
  });

  it('offers expire; actions go through the game', () => {
    const g = createGame({ state: midGame(), rng: () => 0.99 });
    offer(g.s, 'expo');
    expect(g.act('mevno')).toBe(true);
    expect(g.s.mev).toBeNull();
    offer(g.s, 'expo');
    marketEventsSystem(g.s, BAL.marketEventOffer + 1, ctx().c);
    expect(g.s.mev).toBeNull();
    expect(g.s.mfx).toHaveLength(0);
  });

  it('old saves load with empty market state', () => {
    const old = JSON.parse(JSON.stringify(createState())) as Record<string, unknown>;
    delete old.mev; delete old.mevT; delete old.mfx;
    const s = migrate(old);
    expect(s.mfx).toEqual([]);
    expect(s.mev).toBeNull();
    expect(marketMul(s, 'demand')).toBe(1);
  });
});
