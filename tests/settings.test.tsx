// @vitest-environment jsdom
import { fireEvent, waitFor, within } from '@testing-library/preact';
import { afterEach, describe, expect, it } from 'vitest';
import { createState } from '../src/core/state';
import { fmt, fmtAs, prefs, reducedMotion, setPrefs } from '../src/ui/i18n';
import { dialog, game as currentGame } from '../src/ui/store';
import { renderHealthyApp, setupAppRenderTests } from './uiHarness';

setupAppRenderTests();
// jsdom has no modal dialogs: open/close just toggle the attribute.
HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
afterEach(() => { dialog.value = null; prefs.value = { lang: 'en', mute: true }; });

describe('number notation', () => {
  it('short, scientific and full read the same number differently, in one place', () => {
    expect(fmtAs(1234567, 'short')).toBe('1.23M');
    expect(fmtAs(1234567, 'scientific')).toBe('1.23e+6');
    expect(fmtAs(1234567, 'full')).toBe('1,234,567');
    expect(fmtAs(1234, 'scientific')).toBe('1,234'); // small numbers stay readable
    prefs.value = { lang: 'en', mute: true, notation: 'scientific' };
    expect(fmt(5e9)).toBe('5.00e+9');
    prefs.value = { lang: 'en', mute: true };
    expect(fmt(5e9)).toBe('5.00B');
  });
});

describe('reduced motion', () => {
  it('follows the player choice over the system setting', () => {
    prefs.value = { lang: 'en', mute: true, motion: true };
    expect(reducedMotion()).toBe(true);
    prefs.value = { lang: 'en', mute: true, motion: false };
    expect(reducedMotion()).toBe(false);
  });
});

describe('Settings dialog', () => {
  const game = () => ({ ...createState(), goal: 1 });

  it('opens from the labeled Settings button and changes the preferences', () => {
    const c = renderHealthyApp(game(), 'en');
    const actions = within(c.querySelector('.side .settings')!);
    fireEvent.click(actions.getByRole('button', { name: 'Settings' }));
    expect(dialog.value).toBe('settings');
    const box = c.querySelector('.settings-dialog')!;
    fireEvent.change(box.querySelector('input[type=range]')!, { target: { value: '40' } });
    fireEvent.input(box.querySelector('input[type=range]')!, { target: { value: '40' } });
    expect(prefs.value.volume).toBeCloseTo(0.4);
    const full = [...box.querySelectorAll('.set-choice button')].find(b => b.textContent?.includes('Full'))!;
    fireEvent.click(full);
    expect(prefs.value.notation).toBe('full');
    fireEvent.click([...box.querySelectorAll('.set-choice button')].find(b => b.textContent === 'Polski')!);
    expect(prefs.value.lang).toBe('pl');
  });

  it('requires confirmation each time Settings opens before resetting the workshop', async () => {
    const c = renderHealthyApp({ ...game(), total: 42 }, 'en');
    const open = within(c.querySelector('.side .settings')!).getByRole('button', { name: 'Settings' });
    fireEvent.click(open);
    const settings = within(c.querySelector('.settings-dialog')!);
    fireEvent.click(settings.getByRole('button', { name: 'Start over' }));
    expect(currentGame.s.total).toBe(42);
    fireEvent.click(settings.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(c.querySelector('.settings-dialog[open]')).toBeNull());

    fireEvent.click(open);
    fireEvent.click(await settings.findByRole('button', { name: 'Start over' }));
    expect(currentGame.s.total).toBe(42);
    fireEvent.click(settings.getByRole('button', { name: 'Sure? Click again' }));
    expect(currentGame.s.total).toBe(0);
    expect(dialog.value).toBeNull();
  });

  it('turns the onboarding hints off and the motion switch on', async () => {
    const c = renderHealthyApp({ ...createState(), hints: { active: 'print', seen: [] } as never }, 'en');
    expect(c.querySelector('.onboarding-hint')).not.toBeNull();
    setPrefs({ hints: false, motion: true });
    await waitFor(() => expect(c.querySelector('.onboarding-hint')).toBeNull());
    await waitFor(() => expect(document.documentElement.dataset.motion).toBe('reduced'));
  });
});
