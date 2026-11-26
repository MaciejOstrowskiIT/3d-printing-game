import { describe, expect, it } from 'vitest';
import { seededRng } from '../src/core/ctx';
import { demand, eff, unitCost } from '../src/core/formulas';
import { createGame } from '../src/core/game';
import { migrate } from '../src/core/save';
import { createState } from '../src/core/state';

const newGame = () => createGame({ rng: seededRng(3) });

describe('produkcja i sprzedaż', () => {
  it('ręczny druk zużywa filament i dodaje figurkę', () => {
    const g = newGame();
    expect(g.act('print')).toBe(true);
    expect(g.s.total).toBe(1);
    expect(g.s.fil).toBe(980);
  });

  it('bez filamentu nie da się drukować', () => {
    const g = newGame();
    g.s.fil = 5;
    expect(g.act('print')).toBe(false);
  });

  it('niższa cena daje większy popyt', () => {
    const s = createState();
    const high = demand(s);
    s.price = 2;
    expect(demand(s)).toBeGreaterThan(high);
  });

  it('modny kolor daje +30% popytu', () => {
    const s = createState();
    s.goal = 3; s.trend = 2; s.col = 0;
    const base = demand(s);
    s.col = 2;
    expect(demand(s) / base).toBeCloseTo(1.3);
  });
});

describe('zamówienia', () => {
  it('przyjęte zamówienie dostaje figurki przed sprzedażą i płaci po zrealizowaniu', () => {
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

describe('energia', () => {
  it('farmy bez paneli pracują wolniej', () => {
    const s = createState();
    s.farm = 4; // pobór 80 kW, garaż daje 40
    expect(eff(s)).toBe(0.5);
    s.panels = 2;
    expect(eff(s)).toBe(1);
  });
});

describe('automatyka', () => {
  it('dynamiczne ceny nie schodzą poniżej kosztu filamentu', () => {
    const g = newGame();
    g.s.done.push('autobuy', 'tiktok', 'autocena');
    g.s.amOn.autocena = true;
    g.s.inv = 1e6;
    for (let i = 0; i < 600; i++) g.tick(0.1);
    expect(g.s.price).toBeGreaterThanOrEqual(unitCost(g.s));
  });
});

describe('zapis', () => {
  it('wczytuje zapis z wersji jednoplikowej (v3)', () => {
    const s = migrate({ total: 1234, zl: 50, auto: 3, done: ['dysza'] });
    expect(s.total).toBe(1234);
    expect(s.auto).toBe(3);
    expect(s.v).toBe(4);
    expect(s.ordFail).toBe(0);
    expect(s.col).toBe(0);
  });

  it('pusty albo zepsuty zapis daje nową grę', () => {
    expect(migrate(null).total).toBe(0);
    expect(migrate('x').total).toBe(0);
  });
});

describe('offline', () => {
  it('nadrabia produkcję automatów bez losowych zdarzeń', () => {
    const g = newGame();
    g.s.auto = 5; g.s.fil = 1e6; g.s.goal = 5;
    g.catchUp(600);
    expect(g.s.total).toBeGreaterThan(2000);
    expect(g.s.ord).toBeNull();
    expect(g.s.brk).toBe(0);
    expect(g.s.log[0].k).toMatch(/^off/);
  });
});
