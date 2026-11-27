import { cleanup, render } from '@testing-library/preact';
import { computeAccessibleName } from 'dom-accessibility-api';
import { afterAll, afterEach, beforeAll, expect, vi } from 'vitest';
import { en } from '../src/content/i18n/en';
import { pl } from '../src/content/i18n/pl';
import type { GameState } from '../src/core/state';
import { App } from '../src/ui/components/App';
import { prefs, type Lang } from '../src/ui/i18n';
import { loadDebugState, screen } from '../src/ui/store';

const dictionaries = { pl, en };

export function setupAppRenderTests() {
  beforeAll(() => {
    vi.stubGlobal('matchMedia', (media: string) => ({
      media, matches: media === '(prefers-reduced-motion: reduce)' || media.startsWith('(min-width:'),
      addEventListener() {}, removeEventListener() {},
    }));
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    });
  });
  afterEach(cleanup);
  afterAll(() => vi.unstubAllGlobals());
}

export function renderHealthyApp(state: GameState, lang: Lang, view: 'game' | 'title' = 'game') {
  const dictionary = dictionaries[lang];
  const keys = new Set([...Object.keys(dictionary), ...Object.keys(dictionary.L)]);
  const translatedLabels = new Set(Object.values(dictionary).filter(value => typeof value === 'string'));

  function checkText(text: string) {
    expect(text).not.toMatch(/\b(?:NaN|undefined|Infinity)\b|\{\d+\}/);
    const label = text.trim();
    if (keys.has(label)) expect(translatedLabels.has(label), `Raw translation key: ${label}`).toBe(true);
    for (const token of label.match(/[A-Za-z][A-Za-z0-9_]*/g) ?? []) {
      if (/[A-Z0-9_]/.test(token.slice(1)) && keys.has(token)) {
        expect(translatedLabels.has(token), `Raw translation key: ${token}`).toBe(true);
      }
    }
  }

  loadDebugState(structuredClone(state));
  if (view === 'title') screen.value = 'title';
  prefs.value = { lang, mute: true };

  const { container } = render(<App />);
  expect(document.documentElement.lang).toBe(lang);
  expect(container.textContent?.trim()).toBeTruthy();
  const textNodes = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  for (let node = textNodes.nextNode(); node; node = textNodes.nextNode()) checkText(node.nodeValue ?? '');

  const buttons = [...container.querySelectorAll('button')];
  expect(buttons.length).toBeGreaterThan(0);
  for (const button of buttons) {
    // Include controls in closed dialogs and responsive layouts.
    const name = computeAccessibleName(button, { hidden: true });
    expect(name.trim(), button.outerHTML).not.toBe('');
    checkText(name);
  }
  return container;
}
