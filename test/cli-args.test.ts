import { describe, expect, it } from 'vitest';

import { parseArgs } from '../src/cli';

describe('parseArgs', () => {
  it('extracts file path without flags', () => {
    const result = parseArgs(['node', 'cli.js', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false });
  });

  it('parses --insecure before file path', () => {
    const result = parseArgs(['node', 'cli.js', '--insecure', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: true });
  });

  it('parses --insecure after file path', () => {
    const result = parseArgs(['node', 'cli.js', 'api.http', '--insecure']);

    expect(result).toEqual({ filePath: 'api.http', insecure: true });
  });

  it('parses -k shorthand', () => {
    const result = parseArgs(['node', 'cli.js', '-k', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: true });
  });

  it('returns undefined filePath when only flag provided', () => {
    const result = parseArgs(['node', 'cli.js', '--insecure']);

    expect(result).toEqual({ filePath: undefined, insecure: true });
  });

  it('returns insecure false when no flags', () => {
    const result = parseArgs(['node', 'cli.js', 'test.http']);

    expect(result).toEqual({ filePath: 'test.http', insecure: false });
  });
});
