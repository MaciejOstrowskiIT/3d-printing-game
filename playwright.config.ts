import { defineConfig, devices } from '@playwright/test';

// The project has no @types/node; the config runs in Node, so declare the one global it reads.
declare const process: { env: Record<string, string | undefined> };

const baseURL = 'http://127.0.0.1:4173';
const qaBaseURL = 'http://127.0.0.1:4174';
const debugSpecs = ['**/debug/*.spec.ts', '**/e2e/layout.spec.ts'];
const playthroughSpec = '**/playthrough.spec.ts';
const qaSpecs = [...debugSpecs, playthroughSpec];
const desktop = devices['Desktop Chrome'];
const mobile = { ...desktop, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const ci = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/out',
  forbidOnly: ci,
  // CI prints failures inline on the PR and keeps an HTML report for the uploaded artifact.
  reporter: ci ? [['github'], ['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, locale: 'en-US', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium-desktop', testIgnore: qaSpecs, use: desktop },
    { name: 'chromium-mobile', testIgnore: qaSpecs, use: mobile },
    { name: 'chromium-qa-desktop', testMatch: qaSpecs, use: { ...desktop, baseURL: qaBaseURL } },
    { name: 'chromium-qa-mobile', testMatch: debugSpecs, use: { ...mobile, baseURL: qaBaseURL } },
  ],
  webServer: [
    {
      command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
      url: baseURL,
      stdout: 'pipe',
    },
    {
      command: 'npm run build:qa && npm run preview -- --mode qa --outDir dist-qa --host 127.0.0.1 --port 4174 --strictPort',
      url: qaBaseURL,
      stdout: 'pipe',
    },
  ],
});
