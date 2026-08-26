import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { version } from '../src/version';

describe('version module', () => {
  it('exports the version declared in package.json', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

    expect(version).toBe(pkg.version);
  });
});
