// @vitest-environment jsdom
import { fireEvent } from '@testing-library/preact';
import { computeAccessibleName } from 'dom-accessibility-api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createState } from '../src/core/state';
import { createAnnouncer } from '../src/ui/announce';
import { game } from '../src/ui/store';
import { renderHealthyApp, setupAppRenderTests } from './uiHarness';

setupAppRenderTests();

const researchState = () => ({ ...createState(), goal: 5, total: 5000, zl: 100 });

describe('main tabs', () => {
  it('are a tablist with one tab in the Tab order and a labelled tab panel', () => {
    const c = renderHealthyApp(researchState(), 'en');
    const list = c.querySelector('.hud [role="tablist"]')!;
    expect(computeAccessibleName(list)).toBe('Game views');
    const tabs = [...list.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    expect(tabs.map(tab => tab.textContent)).toEqual(['Workshop', 'Research', 'Achievements']);
    expect(tabs.map(tab => tab.tabIndex)).toEqual([0, -1, -1]);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    const panel = c.querySelector('[role="tabpanel"]')!;
    expect(tabs[0].getAttribute('aria-controls')).toBe(panel.id);
    expect(computeAccessibleName(panel)).toBe('Workshop');
  });

  it('move with the arrow keys, Home and End', () => {
    const c = renderHealthyApp(researchState(), 'en');
    const list = c.querySelector<HTMLElement>('.hud [role="tablist"]')!;
    const tab = (name: string) => [...list.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(b => b.textContent === name)!;
    tab('Workshop').focus();
    fireEvent.keyDown(tab('Workshop'), { key: 'ArrowRight' });
    expect(game.s.tab).toBe('r');
    expect(document.activeElement).toBe(tab('Research'));
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(game.s.tab).toBe('a');
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(game.s.tab).toBe('w');
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
    expect(game.s.tab).toBe('a');
    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(game.s.tab).toBe('w');
  });

  it('on the phone dock are navigation buttons with aria-current, not tabs', () => {
    const c = renderHealthyApp(researchState(), 'en');
    const dock = c.ownerDocument.querySelector('.dock')!;
    expect(dock.tagName).toBe('NAV');
    expect(dock.querySelector('[role="tab"], [role="tablist"]')).toBeNull();
    const current = [...dock.querySelectorAll('[aria-current="page"]')];
    expect(current.map(b => computeAccessibleName(b))).toEqual(['Production']);
  });

  it('read badges as text instead of a bare "!" or number', () => {
    const c = renderHealthyApp({ ...researchState(), ops: 1e9 }, 'en');
    const dots = [...c.ownerDocument.querySelectorAll('.tab .dot')];
    expect(dots.length).toBeGreaterThan(0);
    for (const dot of dots) expect(dot.getAttribute('aria-hidden')).toBe('true');
    const research = c.querySelector('.hud [role="tab"].tabR')!;
    expect(computeAccessibleName(research)).toMatch(/^Research \(\d+ ready\)$/);
  });
});

describe('HUD chips', () => {
  it('open their panel with Enter or Space', () => {
    const c = renderHealthyApp({ ...researchState(), zl: 50 }, 'en');
    const funds = c.querySelector<HTMLElement>('.chips .chip.has-pop')!;
    expect(funds.getAttribute('role')).toBe('button');
    expect(funds.tabIndex).toBe(0);
    fireEvent.keyDown(funds, { key: ' ' });
    expect(funds.getAttribute('aria-expanded')).toBe('true');
    expect(c.querySelector('.hud-pop[role="dialog"]')).not.toBeNull();
    fireEvent.keyDown(funds, { key: 'Enter' });
    expect(c.querySelector('.hud-pop')).toBeNull();
  });
});

describe('log announcements', () => {
  it('has a polite live region', () => {
    const c = renderHealthyApp(researchState(), 'en');
    const region = c.ownerDocument.querySelector('[role="log"][aria-live="polite"]');
    expect(region).not.toBeNull();
  });
});

describe('createAnnouncer', () => {
  afterEach(() => vi.useRealTimers());

  it('says the first message at once and batches the rest, at most every interval', () => {
    vi.useFakeTimers();
    const said: string[] = [];
    const a = createAnnouncer(text => said.push(text), { interval: 4000, max: 2 });
    a.push('one');
    expect(said).toEqual(['one']);
    a.push('two'); a.push('three'); a.push('four');
    expect(said).toEqual(['one']);
    vi.advanceTimersByTime(3999);
    expect(said).toEqual(['one']);
    vi.advanceTimersByTime(1);
    expect(said).toEqual(['one', 'three four']);
    vi.advanceTimersByTime(10_000);
    a.push('five');
    expect(said).toEqual(['one', 'three four', 'five']);
    a.push('six');
    a.dispose();
    vi.advanceTimersByTime(10_000);
    expect(said).toHaveLength(3);
  });

  it('ignores empty text', () => {
    const said: string[] = [];
    createAnnouncer(text => said.push(text)).push('');
    expect(said).toEqual([]);
  });
});
