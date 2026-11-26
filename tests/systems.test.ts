import { describe, expect, it } from 'vitest';
import { seededRng } from '../src/core/ctx';
import { demand, eff, rate1, unitCost } from '../src/core/formulas';
import { createGame } from '../src/core/game';
import { EXPORT_PREFIX, exportSave, importSave, migrate } from '../src/core/save';
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
    expect(s.v).toBe(5);
    expect(s.ordFail).toBe(0);
    expect(s.col).toBe(0);
  });

  it('empty or broken save starts a new game', () => {
    expect(migrate(null).total).toBe(0);
    expect(migrate('x').total).toBe(0);
  });
});

describe('offline', () => {
  it('simulates short absences without a report', () => {
    const g = newGame();
    g.s.auto = 1;
    expect(g.catchUp(30)).toBeUndefined();
    expect(g.s.total).toBeGreaterThan(0);
  });

  it('reports sales from existing stock even when production is idle', () => {
    const g = newGame();
    g.s.inv = 3;
    g.s.goal = 2;
    expect(g.catchUp(120)).toEqual({ k: 'offSales', a: ['~120', 3] });
    expect(g.s.total).toBe(0);
  });

  it('caps simulation and reported time at eight hours', () => {
    const capped = newGame();
    const longer = newGame();
    for (const g of [capped, longer]) { g.s.auto = 1; g.s.fil = 1000; }
    const report = longer.catchUp(9 * 3600);
    expect(report?.a[0]).toBe('~28800');
    capped.catchUp(8 * 3600);
    expect(longer.s).toEqual(capped.s);
  });

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

describe('achievements', () => {
  it('unlocks on the first print and logs it once', () => {
    const g = newGame();
    g.act('print');
    g.tick(0.6);
    g.tick(0.6);
    expect(g.s.ach).toContain('first');
    expect(g.s.ach.filter(id => id === 'first')).toHaveLength(1);
  });

  it('tracks every colour used for the rainbow achievement', () => {
    const g = newGame();
    for (let i = 0; i < 6; i++) { g.s.col = i; g.tick(0.6); }
    expect(g.s.ach).toContain('rainbow');
  });

  it('grants earned achievements silently when loading an older save', () => {
    const s = migrate({ v: 4, total: 2e6, auto: 60, farm: 1 });
    expect(s.ach).toEqual(expect.arrayContaining(['first', 'k1', 'm1', 'auto1', 'auto50', 'farm1']));
    expect(s.ach).not.toContain('b1');
  });
});

describe('filament auto-buy', () => {
  it('keeps large farms supplied within a single tick', () => {
    const g = newGame();
    g.s.done.push('autobuy'); g.s.amOn.autobuy = true;
    g.s.farm = 20; g.s.panels = 20; g.s.spd = 8; g.s.zl = 1e7; g.s.fil = 0; g.s.brkT = 1e9;
    const before = g.s.total;
    g.tick(1);
    expect(g.s.total - before).toBeGreaterThan(9000);
  });
});

describe('save export and import', () => {
  it('round-trips a save through the text code', () => {
    const g = newGame();
    Object.assign(g.s, { total: 12345, auto: 7, zl: 99.5, col: 4 });
    g.s.done.push('dysza');
    g.s.meta.patents = 3;
    g.s.meta.earned = 3;
    const code = exportSave(g.s);
    expect(code.startsWith(EXPORT_PREFIX)).toBe(true);
    const s = importSave(code)!;
    expect(s.total).toBe(12345);
    expect(s.auto).toBe(7);
    expect(s.col).toBe(4);
    expect(s.done).toContain('dysza');
    expect(s.meta.patents).toBe(3);
  });

  it('accepts codes with whitespace and raw JSON saves', () => {
    const code = exportSave(createState());
    expect(importSave(`  ${code.slice(0, 20)}\n${code.slice(20)}  `)).not.toBeNull();
    expect(importSave(JSON.stringify({ total: 5, done: [] }))!.total).toBe(5);
  });

  it('rejects impossible patents, boost duration and research prerequisites', () => {
    for (const overrides of [
      { meta: { patents: 10, earned: 1, runs: 1, pat: {} } },
      { meta: { patents: 0, earned: 99, runs: 1, pat: { speed: 99 } } },
      { boostT: 9999 }, { done: ['fw'] }, { rep: -1 }, { goal: -1 },
    ]) {
      expect(importSave(JSON.stringify({ ...createState(), ...overrides }))).toBeNull();
    }
  });

  it('derives production speed from purchased research on load and import', () => {
    const raw = { ...createState(), done: ['dysza', 'fw'], spd: 999 };
    expect(migrate(raw).spd).toBe(1.25);
    expect(importSave(JSON.stringify(raw))?.spd).toBe(1.25);
  });

  it('accepts automation inherited from a previous line', () => {
    const s = createState();
    s.meta = { patents: 0, earned: 3, runs: 1, pat: { keep: 1 } };
    s.done = ['kamera', 'autobuy'];
    expect(importSave(exportSave(s))?.meta).toEqual(s.meta);
  });

  it('rejects garbage', () => {
    for (const bad of ['', 'hello', 'DRK1:@@@', 'DRK1:' + btoa('{"x":1}'), '{"total":"1","done":[]}']) expect(importSave(bad)).toBeNull();
  });

  it('handles non-ASCII text in the save', () => {
    const s = createState();
    s.log.unshift({ k: 'goal', a: ['Wyjdź poza Ziemię|Leave Earth'] });
    expect(importSave(exportSave(s))!.log[0].a[0]).toBe('Wyjdź poza Ziemię|Leave Earth');
  });
});
