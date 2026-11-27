// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { BAL } from '../src/content/balance';
import { createGame } from '../src/core/game';
import { migrate, serialize } from '../src/core/save';
import { createState, type GameState } from '../src/core/state';
import { renderHealthyApp, setupAppRenderTests } from './uiHarness';

setupAppRenderTests();

const order = { n: 20, got: 5, time: 100, left: 80, offer: 0, acc: true, c: 1, pay: 123.5 };
const shop = (over: Partial<GameState> = {}) => createGame({ state: { ...createState(), goal: 4, auto: 3, fil: 1e6, ...over } });

describe('Instant delivery', () => {
  it('finishes the accepted order, pays it, and starts its cooldown', () => {
    const g = shop({ ord: { ...order } });
    const zl = g.s.zl;
    expect(g.act('adorder')).toBe(true);
    expect(g.s.ord).toBeNull();
    expect(g.s.ordDone).toBe(1);
    expect(g.s.zl).toBeCloseTo(zl + order.pay);
    expect(g.s.adCd.order).toBe(BAL.adOrderCooldown);
    expect(g.s.adCd.repair).toBe(0);
  });

  it('needs an accepted order and no cooldown', () => {
    expect(shop().act('adorder')).toBe(false);
    expect(shop({ ord: { ...order, acc: false } }).act('adorder')).toBe(false);
    const g = shop({ ord: { ...order } });
    g.act('adorder');
    g.s.ord = { ...order };
    expect(g.act('adorder')).toBe(false); // cooling down
    g.tick(BAL.adOrderCooldown);
    expect(g.s.adCd.order).toBe(0);
    g.s.ord = { ...order }; // the old one timed out while we waited
    expect(g.act('adorder')).toBe(true);
  });
});

describe('Skip breakdown', () => {
  it('repairs every printer at once and starts its own cooldown', () => {
    const g = shop({ brk: 0.3, brkC: 1 });
    expect(g.act('adrepair')).toBe(true);
    expect(g.s.brk).toBe(0);
    expect(g.s.adCd.repair).toBe(BAL.adRepairCooldown);
    expect(g.s.adCd.order).toBe(0);
    g.s.brk = 0.2;
    expect(g.act('adrepair')).toBe(false);
  });

  it('does nothing without a breakdown', () => {
    expect(shop().act('adrepair')).toBe(false);
  });
});

describe('cooldowns and cheating', () => {
  it('survive save and load, and old saves start at zero', () => {
    const g = shop({ ord: { ...order } });
    g.act('adorder');
    expect(migrate(JSON.parse(serialize(g.s))).adCd.order).toBe(BAL.adOrderCooldown);
    const old = JSON.parse(serialize(createState())) as Record<string, unknown>;
    delete old.adCd;
    expect(migrate(old).adCd).toEqual({ order: 0, repair: 0 });
  });

  it('reject impossible cooldowns in a save', () => {
    for (const bad of [{ order: -1, repair: 0 }, { order: BAL.adOrderCooldown + 1, repair: 0 }, { order: 0, repair: Infinity }, { order: 'x', repair: 0 }, null]) {
      expect(() => migrate({ ...JSON.parse(serialize(createState())), adCd: bad })).toThrow();
    }
  });

  it('count game time, not the device clock', () => {
    vi.useFakeTimers();
    try {
      const g = shop({ ord: { ...order } });
      g.act('adorder');
      vi.setSystemTime(Date.now() + 24 * 3600 * 1000); // wind the clock forward a day
      expect(g.s.adCd.order).toBe(BAL.adOrderCooldown);
      g.tick(60);
      expect(g.s.adCd.order).toBe(BAL.adOrderCooldown - 60);
    } finally { vi.useRealTimers(); }
  });
});

describe('Workshop rows', () => {
  it('show only while useful, next to Overtime', () => {
    const none = renderHealthyApp({ ...createState(), goal: 4, auto: 3 }, 'en');
    expect(none.textContent).not.toContain('Instant delivery');
    expect(none.textContent).not.toContain('Skip breakdown');
  });

  it('appear for an accepted order and a breakdown, and show the cooldown', () => {
    const c = renderHealthyApp({ ...createState(), goal: 4, auto: 3, ord: { ...order }, brk: 0.3, adCd: { order: 120, repair: 0 } }, 'en');
    expect(c.textContent).toContain('Instant delivery');
    expect(c.textContent).toContain('Skip breakdown');
    const rows = [...c.querySelectorAll('.item.boost')].map(r => r.textContent ?? '');
    expect(rows.some(r => r.includes('Instant delivery') && r.includes('again in'))).toBe(true);
    const skip = [...c.querySelectorAll('.item.boost')].find(r => r.textContent?.includes('Skip breakdown'))!;
    expect(skip.querySelector<HTMLButtonElement>('button')!.disabled).toBe(false);
  });
});
