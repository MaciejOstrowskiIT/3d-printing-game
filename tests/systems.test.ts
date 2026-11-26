import { describe, expect, it } from 'vitest';
import { seededRng } from '../src/core/ctx';
import { demand, eff, rate1, unitCost } from '../src/core/formulas';
import { createGame } from '../src/core/game';
import { migrate } from '../src/core/save';
import { createState } from '../src/core/state';

const newGame = () => createGame({ rng: seededRng(3) });

describe('production and sales', () => {
  it('manual print uses filament and adds a figurine', () => {
    const g = newGame();
    expect(g.act('print')).toBe(true);
    expect(g.s.total).toBe(1);
    expect(g.s.fil).toBe(980);
  });

  it('cannot print without filament', () => {
    const g = newGame();
    g.s.fil = 5;
    expect(g.act('print')).toBe(false);
  });

  it('lower price raises demand', () => {
    const s = createState();
    const high = demand(s);
    s.price = 2;
    expect(demand(s)).toBeGreaterThan(high);
  });

  it('trending colour gives +30% demand', () => {
    const s = createState();
    s.goal = 3; s.trend = 2; s.col = 0;
    const base = demand(s);
    s.col = 2;
    expect(demand(s) / base).toBeCloseTo(1.3);
  });
});

describe('orders', () => {
  it('accepted order gets figurines before sales and pays on delivery', () => {
    const g = newGame();
    g.s.goal = 3; g.s.ordT = 0.01;
    g.tick(0.1);
    expect(g.s.ord).not.toBeNull();
    g.act('oacc');
    const { n, pay } = g.s.ord!;
    const zl = g.s.zl;
    g.s.fil = 1e6;
    for (let i = 0; i < n; i++) g.act('print');
    expect(g.s.ord).toBeNull();
    expect(g.s.ordDone).toBe(1);
    expect(g.s.zl).toBeGreaterThanOrEqual(zl + pay);
  });
});

describe('power', () => {
  it('farms without panels run slower', () => {
    const s = createState();
    s.farm = 4; // draws 80 kW, the garage supplies 40
    expect(eff(s)).toBe(0.5);
    s.panels = 2;
    expect(eff(s)).toBe(1);
  });
});

describe('automation', () => {
  it('dynamic pricing never goes below filament cost', () => {
    const g = newGame();
    g.s.done.push('autobuy', 'tiktok', 'autocena');
    g.s.amOn.autocena = true;
    g.s.inv = 1e6;
    for (let i = 0; i < 600; i++) g.tick(0.1);
    expect(g.s.price).toBeGreaterThanOrEqual(unitCost(g.s));
  });
});

describe('save', () => {
  it('loads a save from the single-file version (v3)', () => {
    const s = migrate({ total: 1234, zl: 50, auto: 3, done: ['dysza'] });
    expect(s.total).toBe(1234);
    expect(s.auto).toBe(3);
    expect(s.v).toBe(4);
    expect(s.ordFail).toBe(0);
    expect(s.col).toBe(0);
  });

  it('empty or broken save starts a new game', () => {
    expect(migrate(null).total).toBe(0);
    expect(migrate('x').total).toBe(0);
  });
});

describe('offline', () => {
  it('catches up auto production without random events', () => {
    const g = newGame();
    g.s.auto = 5; g.s.fil = 1e6; g.s.goal = 5;
    g.catchUp(600);
    expect(g.s.total).toBeGreaterThan(2000);
    expect(g.s.ord).toBeNull();
    expect(g.s.brk).toBe(0);
    expect(g.s.log[0].k).toMatch(/^off/);
  });
});

describe('rewarded boost', () => {
  it('doubles production for its duration, then has a cooldown', () => {
    const g = newGame();
    g.s.auto = 10; g.s.goal = 3; g.s.brkT = 1e9; // keep breakdowns out of the comparison
    const base = rate1(g.s);
    expect(g.act('boost')).toBe(true);
    expect(rate1(g.s)).toBeCloseTo(base * 2);
    expect(g.act('boost')).toBe(false);
    for (let i = 0; i < 301; i++) g.tick(1);
    expect(g.s.boostT).toBe(0);
    expect(rate1(g.s)).toBeCloseTo(base);
    expect(g.act('boost')).toBe(false);
    for (let i = 0; i < 300; i++) g.tick(1);
    expect(g.act('boost')).toBe(true);
  });

  it('is not available before the player automates production', () => {
    const g = newGame();
    expect(g.act('boost')).toBe(false);
  });
});
