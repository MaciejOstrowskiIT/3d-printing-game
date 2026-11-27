// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createState, type GameState } from '../src/core/state';
import { renderHealthyApp, setupAppRenderTests } from './uiHarness';

setupAppRenderTests();

const split = (fleet: Record<string, number>): GameState => ({
  ...createState(), goal: 4, auto: 4, total: 5000, fil: 1e6, zl: 1e5,
  mdls: ['fig', 'keychain', 'bust'], fleet,
  modelStock: { keychain: { pieces: 0, price: 0, premium: 0, saleCarry: 0, progress: 0.25, progressPremium: 0, printed: 0 } },
});

describe('Production line tiles', () => {
  it('show a progress bar on every owned model once printers are split, and keep the rate line from resizing the tile', () => {
    for (const fleet of [{} as Record<string, number>, { keychain: 2 }]) {
      const c = renderHealthyApp(split(fleet), 'en');
      const owned = [...c.querySelectorAll('.mtile')].filter(t => !t.classList.contains('locked') && !t.classList.contains('next'));
      expect(owned).toHaveLength(3);
      for (const tile of owned) {
        expect(tile.querySelector('.meter'), 'progress bar').not.toBeNull();
        expect(tile.querySelector('.mt-rate'), 'rate line is always there, so a tile never grows').not.toBeNull();
      }
    }
  });

  it('shows the progress of the piece being printed on a dedicated model', () => {
    const c = renderHealthyApp(split({ keychain: 2 }), 'en');
    const tile = [...c.querySelectorAll('.mtile')].find(t => t.textContent?.includes('Keychain'))!;
    const bar = tile.querySelector<HTMLElement>('.meter i')!;
    expect(parseFloat(bar.style.width)).toBeGreaterThan(0);
  });
});
