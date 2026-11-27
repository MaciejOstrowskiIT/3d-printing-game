// @vitest-environment jsdom
import { fireEvent, waitFor } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { createState, type GameState } from '../src/core/state';
import { notifications } from '../src/ui/notifications';
import { loadDebugState } from '../src/ui/store';
import { renderHealthyApp, setupAppRenderTests } from './uiHarness';

setupAppRenderTests();

const order = { n: 20, got: 0, time: 100, left: 100, offer: 30, acc: false, c: 1, pay: 120 };
const shop = (over: Partial<GameState> = {}): GameState => ({ ...createState(), goal: 4, auto: 3, fil: 1e6, total: 1000, ...over });
const kinds = (s: GameState) => notifications(s).map(n => n.kind).sort();

describe('notifications()', () => {
  it('lists what wants attention and nothing else', () => {
    expect(notifications(shop())).toEqual([]);
    expect(kinds(shop({ msg: 'mum' }))).toEqual(['story']);
    expect(kinds(shop({ ord: { ...order }, brk: 0.3, mev: { id: 'viral', offer: 10, cost: 50 } as never }))).toEqual(['breakdown', 'market', 'order']);
    expect(kinds(shop({ fil: 1 }))).toEqual(['filament']);
  });

  it('keeps the id of an order when it is accepted, so it does not toast twice', () => {
    const offered = notifications(shop({ ord: { ...order } }))[0];
    const accepted = notifications(shop({ ord: { ...order, acc: true } }))[0];
    expect(accepted.id).toBe(offered.id);
    expect(offered.urgent).toBe(true);
    expect(accepted.urgent).toBe(false);
  });

  it('ignores a delivered order of the day and, in space, everything but messages', () => {
    const dord = { day: 3, n: 10, pay: 5, c: 0, done: true };
    expect(notifications(shop({ dday: 3, today: 3, dord }))).toEqual([]);
    expect(kinds(shop({ dday: 3, today: 3, dord: { ...dord, done: false } }))).toEqual(['daily']);
    expect(kinds(shop({ ph: 2, msg: 'mum', brk: 0.5, ord: { ...order } }))).toEqual(['story']);
  });
});

describe('notification centre in the HUD', () => {
  it('counts what is open, shows it in a hover panel, and leaves the Workshop page without an events block', () => {
    const c = renderHealthyApp(shop({ msg: 'mum', ord: { ...order } }), 'en');
    expect(c.querySelector('.workshop-layout .events')).toBeNull();
    const bell = c.querySelector<HTMLElement>('.hud-notif .chip')!;
    expect(bell.textContent).toContain('2');
    for (const name of ['pointerenter', 'PointerEnter']) { // jsdom keeps Preact's camel-cased event name
      const e = new Event(name); Object.defineProperty(e, 'pointerType', { value: 'mouse' }); fireEvent(bell, e);
    }
    const panel = c.querySelector('.hud-pop.pop-notif')!;
    expect(panel.textContent).toContain('Notifications');
    expect(panel.querySelector('.order-card')).not.toBeNull();
    expect(panel.querySelector('.ev.story')).not.toBeNull();
    fireEvent.click([...panel.querySelectorAll('button')].find(b => b.textContent === 'OK')!);
    return waitFor(() => expect(c.querySelector('.hud-pop.pop-notif .ev.story')).toBeNull());
  });

  it('says so when nothing is open', () => {
    const c = renderHealthyApp(shop(), 'en');
    fireEvent.click(c.querySelector('.hud-notif .chip')!);
    expect(c.querySelector('.hud-pop.pop-notif')?.textContent).toContain('No active events');
    expect(c.querySelector('.hud-notif .chip')!.textContent).toContain('0');
  });

  it('shows a toast when something new arrives, but not for what was already open on load', async () => {
    const c = renderHealthyApp(shop({ msg: 'mum' }), 'en');
    expect(c.querySelector('.toast.note')).toBeNull();
    loadDebugState(structuredClone(shop({ msg: 'mum', ord: { ...order } })));
    await waitFor(() => expect(c.querySelector('.toast.note')?.textContent).toContain('New order'));
  });
});
