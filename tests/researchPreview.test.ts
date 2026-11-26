import { describe, expect, it } from 'vitest';
import { TREE } from '../src/content/tree';
import { opsCap } from '../src/core/formulas';
import { createState } from '../src/core/state';
import { nextResearch, nodeStatus } from '../src/systems/research';

describe('research preview', () => {
  it('puts nodes you can unlock now first', () => {
    const s = { ...createState(), total: 5000, auto: 10, ops: 1e9, zl: 1e9, mem: 50 };
    const picks = nextResearch(s, 3);
    expect(picks.length).toBe(3);
    expect(picks[0].status).toBe('ready');
    const ready = TREE.filter(n => nodeStatus(s, n) === 'ready').length;
    expect(picks.filter(p => p.status === 'ready').length).toBe(Math.min(3, ready));
  });

  it('orders the rest by how close they are, and never shows done, locked or space nodes on Earth', () => {
    const s = { ...createState(), total: 200, ops: 100 };
    const picks = nextResearch(s, 10);
    expect(picks.every(p => p.status !== 'done' && p.status !== 'locked' && p.node.col !== 3)).toBe(true);
    const avail = picks.filter(p => p.status === 'avail').map(p => Math.min(p.ops, p.zl));
    expect([...avail].sort((a, b) => b - a)).toEqual(avail);
  });

  it('flags nodes that need more compute than memory can hold', () => {
    const s = { ...createState(), total: 1e6, done: ['dysza', 'fw', 'hurt'], ops: 0 };
    const big = nextResearch(s, 20).find(p => p.node.ops > opsCap(s));
    if (big) expect(big.memoryShort).toBe(true);
  });
});
