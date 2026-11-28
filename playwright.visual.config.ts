import { defineConfig, devices } from '@playwright/test';

// Opt-in visual regression suite (`npm run e2e:visual`), kept apart from `npm run e2e` and the CI e2e job.
// The project has no @types/node; the config runs in Node, so declare the globals it reads.
declare const process: { env: Record<string, string | undefined>; platform: string };

const baseURL = 'http://127.0.0.1:4175';
const ci = Boolean(process.env.CI);
const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } };
const mobile = { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

// Committed baselines come only from the Playwright Docker image (scripts/visual-docker.mjs sets VISUAL_DOCKER),
// locally or in the Visual regression workflow, so text rendering matches wherever they are checked. Any other
// machine writes its own git-ignored baselines under local-<platform>/ for before/after checks on that machine.
const baselines = process.env.VISUAL_DOCKER ? 'linux' : `local-${process.platform}`;

export default defineConfig({
  testDir: './e2e/visual',
  testMatch: '**/*.visual.ts',
  outputDir: './e2e/out/visual',
  snapshotPathTemplate: `{testDir}/../__screenshots__/${baselines}/{projectName}/{arg}{ext}`,
  forbidOnly: ci,
  reporter: ci ? [['github'], ['list'], ['html', { open: 'never' }]] : 'list',
  expect: {
    // Same image, same fonts, frozen game: renders should match exactly. The small allowance absorbs
    // anti-aliasing noise only, not a changed number or a moved card.
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', scale: 'css', maxDiffPixels: 20 },
  },
  use: {
    baseURL,
    locale: 'en-US',
    timezoneId: 'UTC',
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: desktop },
    { name: 'mobile', use: mobile },
  ],
  webServer: {
    command: `npm run build:qa && npm run preview -- --mode qa --outDir dist-qa --host 127.0.0.1 --port 4175 --strictPort`,
    url: baseURL,
    stdout: 'pipe',
  },
});
