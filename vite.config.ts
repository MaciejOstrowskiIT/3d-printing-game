import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/** Build id shown on the title screen and sent with analytics events, e.g. 0.5.0+a1b2c3d. */
function buildId() {
  try { return `${pkg.version}+${execSync('git rev-parse --short HEAD').toString().trim()}`; } catch { return pkg.version; }
}

// Single HTML output: portals (Poki, CrazyGames) and the artifact need a self-contained file.
export default defineConfig({
  plugins: [preact(), viteSingleFile()],
  define: { __BUILD__: JSON.stringify(buildId()) },
  // Relative base so the build works under /3d-printing-game/ on GitHub Pages and from a plain file.
  base: './',
  build: { target: 'es2020', assetsInlineLimit: 100_000_000 },
  // css.include: tests/contrast.test.ts reads the colour tokens as raw text (CSS is stubbed out in tests otherwise).
  test: { environment: 'node', include: ['tests/**/*.test.{ts,tsx}'], setupFiles: ['tests/setup.ts'], css: { include: [/01-base\.css/] } },
});
