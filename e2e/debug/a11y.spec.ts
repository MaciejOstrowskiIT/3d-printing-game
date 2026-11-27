import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';
import { loadStage, type Stage } from '../fixtures';
import { test } from '../helpers';

/** WCAG 2.2 A and AA rules. Best-practice rules (landmark nesting and the like) are left out on purpose. */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoViolations(page: Page, where: string) {
  // Let entrance animations finish, so colours are measured at rest.
  await page.waitForTimeout(600);
  // Left out: the faint ALPHA corner badge (decorative, aria-hidden, goes away after alpha) and the "+$5" floats that
  // fade out over the funds chip (aria-hidden, measured mid-animation).
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).exclude('.alpha-badge').exclude('.gain-float').analyze();
  const report = violations.map(v => `${v.id} (${v.impact}): ${v.help}\n` + v.nodes.slice(0, 5).map(n => '  ' + n.target.join(' ') + ' ' + (n.any[0]?.message ?? '')).join('\n'));
  expect(report, `axe violations on ${where}`).toEqual([]);
}

test.describe('axe', () => {
  test('title screen', async ({ page }) => {
    await page.goto('/#debug');
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    await expectNoViolations(page, 'the title screen');
  });

  for (const stage of ['garage', 'factory', 'research', 'space'] as Stage[]) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${stage} save, ${theme} theme`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme });
        await page.goto('/#debug');
        await loadStage(page, stage);
        await expectNoViolations(page, `the ${stage} save (${theme})`);
      });
    }
  }

  test('research tab and the open notification panel', async ({ page, isMobile }) => {
    await page.goto('/#debug');
    await loadStage(page, 'research');
    await (isMobile ? page.locator('.dock') : page.locator('.hud')).getByRole(isMobile ? 'button' : 'tab', { name: /^Research/ }).click();
    await expect(page.getByRole('heading', { name: 'Computer', exact: true })).toBeVisible();
    await expectNoViolations(page, 'the research tab');
    await page.locator('.chip.notif:visible').click();
    await expect(page.locator('.hud-pop.pop-notif')).toBeVisible();
    await expectNoViolations(page, 'the notification panel');
  });
});

test.describe('keyboard', () => {
  test.skip(({ isMobile }) => isMobile, 'Keyboard navigation is checked on desktop');

  test('every stop in the Tab order shows a focus ring', async ({ page }) => {
    await page.goto('/#debug');
    await loadStage(page, 'factory');
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    const seen: string[] = [];
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        return { name: el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 40) ?? el.tagName, ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 };
      });
      if (!focus) continue;
      expect(focus.ring, `focus ring on "${focus.name}"`).toBe(true);
      seen.push(focus.name);
    }
    expect(seen.length).toBeGreaterThan(20);
  });

  test('tabs move with the arrow keys and a HUD panel opens from the keyboard', async ({ page }) => {
    await page.goto('/#debug');
    await loadStage(page, 'research');
    const workshop = page.locator('.hud').getByRole('tab', { name: /^Workshop/ });
    await workshop.focus();
    await page.keyboard.press('ArrowRight');
    const research = page.locator('.hud').getByRole('tab', { name: /^Research/ });
    await expect(research).toBeFocused();
    await expect(research).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: 'Computer', exact: true })).toBeVisible();

    const funds = page.locator('.chips .chip.has-pop').first();
    await funds.focus();
    await page.keyboard.press('Enter');
    const panel = page.locator('.hud-pop');
    await expect(panel).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(funds).toBeFocused();
  });
});
