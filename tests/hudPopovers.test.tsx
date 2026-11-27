// @vitest-environment jsdom
import { fireEvent } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { createState } from '../src/core/state';
import { renderHealthyApp, setupAppRenderTests } from './uiHarness';

setupAppRenderTests();

const state = () => ({ ...createState(), goal: 2, total: 400, sold: 40, mdls: ['fig', 'keychain'], materialId: 'pla', materialStock: { petg: 2500 }, fil: 1800 });
const chip = (c: HTMLElement, label: string) => [...c.querySelectorAll<HTMLElement>('.chip.has-pop')].find(x => x.textContent?.includes(label))!;
// jsdom has no PointerEvent, so a plain event carries the pointer type the handlers read.
function hover(el: Element) {
  // Preact keeps the camel-cased name when the DOM has no onpointerenter property (jsdom), so send both spellings.
  for (const name of ['pointerenter', 'PointerEnter']) {
    const e = new Event(name);
    Object.defineProperty(e, 'pointerType', { value: 'mouse' });
    fireEvent(el, e);
  }
}

describe('resource chip panels', () => {
  it('shows the finance chart on hover and closes with the X button', () => {
    const c = renderHealthyApp(state(), 'en');
    expect(c.querySelector('.workshop-stats')).toBeNull(); // no longer at the bottom of the Workshop
    hover(chip(c, 'Funds'));
    expect(c.querySelector('.hud-pop.pop-funds .workshop-stats')).not.toBeNull();
    fireEvent.click(c.querySelector('.pop-x')!);
    expect(c.querySelector('.hud-pop')).toBeNull();
  });

  it('lists stock per project and filament per type', () => {
    const c = renderHealthyApp(state(), 'pl');
    hover(chip(c, 'Na stanie'));
    const rows = [...c.querySelectorAll('.hud-pop .pop-list li')].map(li => li.querySelector('span')?.textContent);
    expect(rows).toHaveLength(2);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(c.querySelector('.hud-pop')).toBeNull();

    hover(chip(c, 'Filament'));
    const mats = [...c.querySelectorAll('.hud-pop .pop-list li')].map(li => li.textContent);
    expect(mats).toHaveLength(2);
    expect(mats.some(m => m?.includes('PETG') && m.includes('2,5 kg'))).toBe(true);
    expect(mats.some(m => m?.includes('PLA') && m.includes('w drukarce'))).toBe(true);
  });

  it('opens with a tap too, and the line playtime chip is gone', () => {
    const c = renderHealthyApp(state(), 'en');
    fireEvent.click(chip(c, 'Funds'));
    expect(c.querySelector('.hud-pop')).not.toBeNull();
    expect(c.textContent).not.toContain('Line time');
    expect(c.textContent).toContain('Total playtime');
  });
});
