import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Jeden plik HTML na wyjściu: portale (Poki, CrazyGames) i artefakt wymagają samodzielnego pliku.
export default defineConfig({
  plugins: [preact(), viteSingleFile()],
  build: { target: 'es2020', assetsInlineLimit: 100_000_000 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
