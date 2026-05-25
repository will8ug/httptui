import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.tsx'],
  format: ['esm'],
  target: 'node24',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  banner: {
    js: '#!/usr/bin/env node\nprocess.env.NODE_USE_SYSTEM_CA ??= "1";',
  },
  external: ['react', 'ink', '@inkjs/ui', 'undici'],
});
