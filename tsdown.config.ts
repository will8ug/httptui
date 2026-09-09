import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/cli.tsx'],
  format: ['esm'],
  target: 'node24',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  fixedExtension: false,
});
