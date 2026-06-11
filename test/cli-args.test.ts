import { describe, expect, it } from 'vitest';

import { parseArgs } from '../src/args';

describe('parseArgs', () => {
  it('extracts file path without flags', () => {
    const result = parseArgs(['node', 'cli.js', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: undefined, envName: undefined });
  });

  it('parses --insecure before file path', () => {
    const result = parseArgs(['node', 'cli.js', '--insecure', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: true, envPath: undefined, envName: undefined });
  });

  it('parses --insecure after file path', () => {
    const result = parseArgs(['node', 'cli.js', 'api.http', '--insecure']);

    expect(result).toEqual({ filePath: 'api.http', insecure: true, envPath: undefined, envName: undefined });
  });

  it('parses -k shorthand', () => {
    const result = parseArgs(['node', 'cli.js', '-k', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: true, envPath: undefined, envName: undefined });
  });

  it('returns undefined filePath when only flag provided', () => {
    const result = parseArgs(['node', 'cli.js', '--insecure']);

    expect(result).toEqual({ filePath: undefined, insecure: true, envPath: undefined, envName: undefined });
  });

  it('returns insecure false when no flags', () => {
    const result = parseArgs(['node', 'cli.js', 'test.http']);

    expect(result).toEqual({ filePath: 'test.http', insecure: false, envPath: undefined, envName: undefined });
  });

  it('parses --env before file path', () => {
    const result = parseArgs(['node', 'cli.js', '--env', 'dev.json', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: 'dev.json', envName: undefined });
  });

  it('parses --env after file path', () => {
    const result = parseArgs(['node', 'cli.js', 'api.http', '--env', 'dev.json']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: 'dev.json', envName: undefined });
  });

  it('parses -e shorthand', () => {
    const result = parseArgs(['node', 'cli.js', '-e', 'dev.json', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: 'dev.json', envName: undefined });
  });

  it('parses --env without value as undefined', () => {
    const result = parseArgs(['node', 'cli.js', '--env']);

    expect(result).toEqual({ filePath: undefined, insecure: false, envPath: undefined, envName: undefined });
  });

  it('parses --env with another flag as value as undefined', () => {
    const result = parseArgs(['node', 'cli.js', '--env', '--insecure', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: true, envPath: undefined, envName: undefined });
  });

  it('parses combined --insecure and --env flags', () => {
    const result = parseArgs(['node', 'cli.js', '--insecure', '--env', 'prod.json', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: true, envPath: 'prod.json', envName: undefined });
  });

  it('parses --env-name before file path', () => {
    const result = parseArgs(['node', 'cli.js', '--env-name', 'Development', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: undefined, envName: 'Development' });
  });

  it('parses --env-name after file path', () => {
    const result = parseArgs(['node', 'cli.js', 'api.http', '--env-name', 'Development']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: undefined, envName: 'Development' });
  });

  it('parses -E shorthand', () => {
    const result = parseArgs(['node', 'cli.js', '-E', 'Development', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: undefined, envName: 'Development' });
  });

  it('parses --env-name without value as undefined', () => {
    const result = parseArgs(['node', 'cli.js', '--env-name']);

    expect(result).toEqual({ filePath: undefined, insecure: false, envPath: undefined, envName: undefined });
  });

  it('parses --env-name with another flag as value as undefined', () => {
    const result = parseArgs(['node', 'cli.js', '--env-name', '--insecure', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: true, envPath: undefined, envName: undefined });
  });

  it('parses combined --env and --env-name flags', () => {
    const result = parseArgs(['node', 'cli.js', '--env', 'prod.json', '--env-name', 'Development', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: 'prod.json', envName: 'Development' });
  });
});
