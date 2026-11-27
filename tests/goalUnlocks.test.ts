import { describe, expect, it } from 'vitest';
import { GOALS } from '../src/content/goals';

describe('goal unlocks', () => {
  it('every goal that opens something says so in both languages', () => {
    const withUnlock = GOALS.filter(g => g.u);
    expect(withUnlock.length).toBeGreaterThan(0);
    for (const g of withUnlock) {
      expect(g.u, g.t[1]).toHaveLength(2);
      for (const text of g.u!) expect(text.trim().length, g.t[1]).toBeGreaterThan(10);
      expect(g.u![0], g.t[1]).not.toBe(g.u![1]);
    }
  });

  it('the first goals tell what they open (the early game is where players get lost)', () => {
    for (let i = 0; i < 5; i++) expect(GOALS[i].u, GOALS[i].t[1]).toBeDefined();
  });
});
