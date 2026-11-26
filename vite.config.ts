import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Single HTML output: portals (Poki, CrazyGames) and the artifact need a self-contained file.
export default defineConfig({
  plugins: [preact(), viteSingleFile()],
  // Relative base so the build works under /3d-printing-game/ on GitHub Pages and from a plain file.
  base: './',
  build: { target: 'es2020', assetsInlineLimit: 100_000_000 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
