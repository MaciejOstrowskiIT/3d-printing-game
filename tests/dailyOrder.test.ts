import { describe, expect, it } from 'vitest';
import { BAL } from '../src/content/balance';
import { createGame } from '../src/core/game';
import { migrate } from '../src/core/save';
import { createState, type GameState } from '../src/core/state';
import { streakMul, validDailyState } from '../src/systems/dailyOrder';

const shop = (over: Partial<GameState> = {}): GameState => ({ ...createState(), goal: 5, auto: 10, inv: 1e6, ...over });
const DAY = 20500;

/** Runs the order of the day for `days`, shipping on the days listed in `ship`. Returns the game. */
function run(days: number[], ship: number[]) {
  const g = createGame({ state: shop(), rng: () => 0.3 });
  for (const d of days) {
    g.act(`day:${d}`);
    if (ship.includes(d)) expect(g.act('daily')).toBe(true);
  }
  return g;
}

describe('order of the day', () => {
  it('appears once per day, after the orders goal, not in space', () => {
    expect(createGame({ state: shop({ goal: BAL.dailyFromGoal - 1 }) }).act(`day:${DAY}`)).toBe(false);
    expect(createGame({ state: shop({ ph: 2 }) }).act(`day:${DAY}`)).toBe(false);
    const g = createGame({ state: shop() });
    expect(g.act(`day:${DAY}`)).toBe(true);
    expect(g.act(`day:${DAY}`)).toBe(false);
    expect(g.s.dord?.n).toBeGreaterThanOrEqual(BAL.dailyMinSize);
  });

  it('ships from stock and pays', () => {
    const g = createGame({ state: shop({ inv: 0 }) });
    g.act(`day:${DAY}`);
    expect(g.act('daily')).toBe(false); // not enough stock
    g.s.inv = g.s.dord!.n;
    const zl = g.s.zl, pay = g.s.dord!.pay;
    expect(pay).toBeCloseTo(g.s.dord!.n * g.s.price * BAL.dailyPayMultiplier, 1);
    expect(g.act('daily')).toBe(true);
    expect(g.s.zl).toBeCloseTo(zl + pay);
    expect(g.s.inv).toBe(0);
    expect(g.act('daily')).toBe(false); // once a day
  });

  it('days in a row build a streak that raises pay; a missed day resets it', () => {
    const g = run([DAY, DAY + 1, DAY + 2], [DAY, DAY + 1]);
    expect(g.s.dstreak).toBe(2);
    const base = g.s.dord!.n * g.s.price * BAL.dailyPayMultiplier;
    expect(g.s.dord!.pay).toBeCloseTo(base * streakMul(3), 1);

    const broken = run([DAY, DAY + 1, DAY + 3], [DAY, DAY + 1]);
    expect(broken.s.dstreak).toBe(0);
    expect(broken.s.dbest).toBe(2);

    const lazy = run([DAY, DAY + 1, DAY + 2], [DAY, DAY + 2]); // skipped shipping on day 2
    expect(lazy.s.dstreak).toBe(1);
  });

  it('pay bonus stops growing after a week', () => {
    expect(streakMul(1)).toBe(1);
    expect(streakMul(BAL.dailyStreakMax)).toBeCloseTo(1 + BAL.dailyStreakStep * (BAL.dailyStreakMax - 1));
    expect(streakMul(30)).toBe(streakMul(BAL.dailyStreakMax));
  });

  it('turning the date back gives nothing', () => {
    const g = run([DAY], [DAY]);
    expect(g.act(`day:${DAY - 5}`)).toBe(false);
    expect(g.act('daily')).toBe(false);
  });

  it('save validation', () => {
    const g = run([DAY], []);
    expect(validDailyState(g.s)).toBe(true);
    expect(validDailyState({ ...g.s, dord: { ...g.s.dord!, pay: -5 } })).toBe(false);
    expect(validDailyState({ ...g.s, dord: { ...g.s.dord!, day: DAY + 9 } })).toBe(false);
    expect(validDailyState({ ...g.s, dstreak: 50, dbest: 2 })).toBe(false);
    expect(() => migrate(JSON.parse(JSON.stringify({ ...g.s, dord: { ...g.s.dord, pay: -5 } })))).toThrow();
    const old = JSON.parse(JSON.stringify(createState())) as Record<string, unknown>;
    delete old.dday; delete old.dord; delete old.dstreak; delete old.dbest;
    expect(migrate(old).dord).toBeNull();
  });
});
