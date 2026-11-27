import { expect, type Page } from '@playwright/test';
import { seededRng } from '../src/core/ctx';
import { loadStage, type Stage } from './fixtures';
import { test } from './helpers';

const stages: Stage[] = ['garage', 'workshop', 'factory', 'research', 'space'];
const IDLE_SECONDS = 20;
const MAX_CLS = 0.02;
const MAX_VERTICAL_SHIFT = 2;
const WATCHED = '.content .card, .content .buy, .hud, .hud .tabs, .dock, .side > .pbtn, .dock .pbtn';

async function measureIdleLayout(page: Page) {
  return page.evaluate(async ({ seconds, watched }) => {
    type ShiftEntry = PerformanceEntry & {
      value: number;
      hadRecentInput: boolean;
      sources?: { node: Node | null }[];
    };

    const root = document.documentElement;
    const ids = new WeakMap<Element, number>();
    let nextId = 0;
    const measure = (element: Element) => element.getBoundingClientRect();
    const label = (element: Element) => {
      const name = element.matches('.buy')
        ? element.closest('.item')?.querySelector('.it > *')?.textContent
        : element.querySelector('h2')?.textContent;
      return name?.trim() || element.id || element.getAttribute('class') || element.localName;
    };
    const rendered = (element: Element) =>
      element.getClientRects().length > 0 && getComputedStyle(element).visibility === 'visible';

    function overflow(element: Element) {
      let { left, right } = measure(element);
      if (left >= -0.5 && right <= root.clientWidth + 0.5) return false;

      // A scroller can contain wider content without letting it escape into the page.
      for (let parent = element.parentElement; parent && parent !== document.body && parent !== root; parent = parent.parentElement) {
        if (getComputedStyle(parent).overflowX === 'visible') continue;
        const edge = measure(parent).left + parent.clientLeft;
        left = Math.max(left, edge);
        right = Math.min(right, edge + parent.clientWidth);
      }
      return right > left && (left < -0.5 || right > root.clientWidth + 0.5);
    }

    function sample() {
      const state = window.__drk!.state();
      const boxes = Array.from(document.querySelectorAll(watched)).filter(rendered).map(element => {
        let id = ids.get(element);
        if (id === undefined) ids.set(element, id = nextId++);
        const { x, y, width, height } = measure(element);
        return { id, name: label(element), x, y, width, height };
      });
      const offenders = Array.from(document.body.querySelectorAll('*'))
        .filter(element => (element instanceof HTMLElement || element instanceof SVGSVGElement) && rendered(element) && overflow(element))
        .map(label);
      return {
        play: state.play,
        progression: {
          goal: state.goal, phase: state.ph, research: state.done.length, models: state.mdls.length,
          printers: state.auto, farms: state.farm, panels: state.panels, drones: state.drones, factories: state.fabs,
        },
        boxes,
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        offenders,
      };
    }

    const shifts: { time: number; value: number; sources: string[] }[] = [];
    function collect(entries: PerformanceEntry[]) {
      for (const entry of entries as ShiftEntry[]) {
        if (entry.hadRecentInput) continue;
        shifts.push({
          time: entry.startTime,
          value: entry.value,
          sources: entry.sources?.flatMap(({ node }) => node instanceof Element ? [label(node)] : []) ?? [],
        });
      }
    }
    if (!PerformanceObserver.supportedEntryTypes.includes('layout-shift')) throw new Error('Chromium layout-shift entries are unavailable');
    const observer = new PerformanceObserver(list => collect(list.getEntries()));
    observer.observe({ type: 'layout-shift' });

    try {
      const samples = [sample()];
      const start = performance.now();
      for (let second = 1; second <= seconds; second++) {
        await new Promise<void>(resolve => setTimeout(resolve, Math.max(0, start + second * 1000 - performance.now())));
        samples.push(sample());
      }
      collect(observer.takeRecords());
      return { samples, shifts };
    } finally {
      observer.disconnect();
    }
  }, { seconds: IDLE_SECONDS, watched: WATCHED });
}

function clsScore(shifts: { time: number; value: number }[]) {
  let score = 0, session = 0, start = -Infinity, previous = -Infinity;
  for (const { time, value } of shifts) {
    if (time - previous >= 1000 || time - start >= 5000) {
      start = time;
      session = 0;
    }
    session += value;
    score = Math.max(score, session);
    previous = time;
  }
  return score;
}

test.describe.configure({ mode: 'parallel' });

for (const stage of stages) {
  test(`${stage} stays stable during 20 seconds of live play`, async ({ page, isMobile }, testInfo) => {
    test.setTimeout(45_000);
    await page.setViewportSize(isMobile ? { width: 390, height: 844 } : { width: 1280, height: 800 });
    await page.addInitScript({ content: `Math.random = (${seededRng.toString()})(1);` });
    await page.clock.setFixedTime(new Date('2026-02-03T12:00:00Z'));
    await page.goto('/#debug');
    await expect(page.locator('.title-screen')).toBeVisible();
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await loadStage(page, stage);
    await expect(page.locator('.app')).toBeVisible();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    });

    const { samples, shifts } = await measureIdleLayout(page);
    const first = samples[0];
    const last = samples[samples.length - 1];
    const cls = clsScore(shifts);
    const baseline = new Map(first.boxes.map(box => [box.id, box.y]));
    const movements = new Map<number, { name: string; px: number; second: number }>();
    const unlocksAndPurchases: { second: number; changes: string[] }[] = [];
    const progressionKeys = Object.keys(first.progression) as (keyof typeof first.progression)[];
    for (const [second, sample] of samples.entries()) {
      // Compare each control to its position since the last explicit unlock or purchase.
      // The full idle window still counts toward CLS and overflow.
      const before = samples[second - 1]?.progression;
      const changes = before ? progressionKeys.filter(key => before[key] !== sample.progression[key]) : [];
      if (changes.length) {
        unlocksAndPurchases.push({ second, changes });
        baseline.clear();
      }
      for (const { id, name, y } of sample.boxes) {
        if (!baseline.has(id)) baseline.set(id, y);
        const px = Math.abs(y - baseline.get(id)!);
        if (px > MAX_VERTICAL_SHIFT && px > (movements.get(id)?.px ?? 0)) movements.set(id, { name, px, second });
      }
    }
    const overflows = new Map<string, number>();
    for (const [second, sample] of samples.entries()) {
      if (sample.scrollWidth > sample.clientWidth) overflows.set(`document ${sample.scrollWidth}px > ${sample.clientWidth}px`, second);
      for (const element of sample.offenders) if (!overflows.has(element)) overflows.set(element, second);
    }
    const violations = [...movements.values()].sort((a, b) => b.px - a.px);
    await testInfo.attach('layout measurements', {
      body: JSON.stringify({ cls, shifts, samples, unlocksAndPurchases, violations, overflows: [...overflows] }, null, 2),
      contentType: 'application/json',
    });

    expect.soft(last.play - first.play, 'The game must actually tick during the idle window').toBeGreaterThanOrEqual(19);
    expect.soft(first.boxes.length, 'Expected visible layout targets').toBeGreaterThan(0);
    expect.soft(cls, `CLS sources: ${[...new Set(shifts.flatMap(shift => shift.sources))].join(', ')}`).toBeLessThan(MAX_CLS);
    expect.soft(violations.slice(0, 8), 'Visible controls and cards moved by more than 2px').toEqual([]);
    expect.soft([...overflows].slice(0, 8), 'Horizontal overflow (element and sample second)').toEqual([]);
  });
}
