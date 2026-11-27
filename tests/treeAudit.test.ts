import { describe, expect, it } from 'vitest';
import { TREE } from '../src/content/tree';
import { branchShapes, depths } from './treeAudit';

describe('tree audit helpers', () => {
  it('computes depth from the longest prerequisite chain', () => {
    const g = [{ id: 'a', col: 0, row: 1 }, { id: 'b', col: 0, row: 2, req: ['a'] }, { id: 'c', col: 1, row: 1, req: ['a', 'b'] }];
    const { depth, broken } = depths(g);
    expect(depth).toEqual({ a: 1, b: 2, c: 3 });
    expect(broken).toEqual([]);
  });

  it('reports cycles and missing prerequisites', () => {
    const { broken } = depths([{ id: 'a', col: 0, row: 1, req: ['b'] }, { id: 'b', col: 0, row: 2, req: ['a'] }, { id: 'c', col: 0, row: 3, req: ['zzz'] }]);
    expect(broken.sort()).toEqual(['a', 'b', 'c', 'zzz']);
  });

  it('classifies joins, forks, links and pure chains', () => {
    const g = [{ id: 'a', col: 0, row: 1 }, { id: 'b', col: 0, row: 2, req: ['a'] }, { id: 'x', col: 1, row: 1 }, { id: 'y', col: 1, row: 2, req: ['x', 'a'] }, { id: 'z', col: 1, row: 3, req: ['x'] }];
    const [c0, c1] = branchShapes(g, depths(g).depth);
    expect(c0).toMatchObject({ chain: true, forks: 0, crossOut: 1 });
    expect(c1).toMatchObject({ joins: 1, forks: 1, crossIn: 1 });
    expect(branchShapes([g[0], g[1]], { a: 1, b: 2 })[0].chain).toBe(true);
  });

  it('the real tree has no cycles or dangling prerequisites', () => {
    expect(depths(TREE).broken).toEqual([]);
  });
});
