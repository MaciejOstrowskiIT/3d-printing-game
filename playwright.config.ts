import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4173';
const qaBaseURL = 'http://127.0.0.1:4174';
const debugSpecs = '**/debug/*.spec.ts';
const desktop = devices['Desktop Chrome'];
const mobile = { ...desktop, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/out',
  use: { baseURL, locale: 'en-US', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium-desktop', testIgnore: debugSpecs, use: desktop },
    { name: 'chromium-mobile', testIgnore: debugSpecs, use: mobile },
    { name: 'chromium-qa-desktop', testMatch: debugSpecs, use: { ...desktop, baseURL: qaBaseURL } },
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
