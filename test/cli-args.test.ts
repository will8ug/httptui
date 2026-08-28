import { describe, expect, it } from 'vitest';

import { parseArgs } from '../src/args';

describe('parseArgs', () => {
  it('extracts file path without flags', () => {
    const result = parseArgs(['node', 'cli.js', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: undefined, envName: undefined, version: false, help: false });
  });

  it('parses --insecure before file path', () => {
    const result = parseArgs(['node', 'cli.js', '--insecure', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: true, envPath: undefined, envName: undefined, version: false, help: false });
  });

  it('parses --insecure after file path', () => {
    const result = parseArgs(['node', 'cli.js', 'api.http', '--insecure']);

    expect(result).toEqual({ filePath: 'api.http', insecure: true, envPath: undefined, envName: undefined, version: false, help: false });
  });

  it('parses -k shorthand', () => {
    const result = parseArgs(['node', 'cli.js', '-k', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: true, envPath: undefined, envName: undefined, version: false, help: false });
  });

  it('returns undefined filePath when only flag provided', () => {
    const result = parseArgs(['node', 'cli.js', '--insecure']);

    expect(result).toEqual({ filePath: undefined, insecure: true, envPath: undefined, envName: undefined, version: false, help: false });
  });

  it('returns insecure false when no flags', () => {
    const result = parseArgs(['node', 'cli.js', 'test.http']);

    expect(result).toEqual({ filePath: 'test.http', insecure: false, envPath: undefined, envName: undefined, version: false, help: false });
  });

  it('parses --env before file path', () => {
    const result = parseArgs(['node', 'cli.js', '--env', 'dev.json', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: 'dev.json', envName: undefined, version: false, help: false });
  });

  it('parses --env after file path', () => {
    const result = parseArgs(['node', 'cli.js', 'api.http', '--env', 'dev.json']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: 'dev.json', envName: undefined, version: false, help: false });
  });

  it('parses -e shorthand', () => {
    const result = parseArgs(['node', 'cli.js', '-e', 'dev.json', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: 'dev.json', envName: undefined, version: false, help: false });
  });

  it('parses --env without value as undefined', () => {
    const result = parseArgs(['node', 'cli.js', '--env']);

    expect(result).toEqual({ filePath: undefined, insecure: false, envPath: undefined, envName: undefined, version: false, help: false });
  });

  it('parses --env with another flag as value as undefined', () => {
    const result = parseArgs(['node', 'cli.js', '--env', '--insecure', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: true, envPath: undefined, envName: undefined, version: false, help: false });
  });

  it('parses combined --insecure and --env flags', () => {
    const result = parseArgs(['node', 'cli.js', '--insecure', '--env', 'prod.json', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: true, envPath: 'prod.json', envName: undefined, version: false, help: false });
  });

  it('parses --env-name before file path', () => {
    const result = parseArgs(['node', 'cli.js', '--env-name', 'Development', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: undefined, envName: 'Development', version: false, help: false });
  });

  it('parses --env-name after file path', () => {
    const result = parseArgs(['node', 'cli.js', 'api.http', '--env-name', 'Development']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: undefined, envName: 'Development', version: false, help: false });
  });

  it('parses -E shorthand', () => {
    const result = parseArgs(['node', 'cli.js', '-E', 'Development', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: undefined, envName: 'Development', version: false, help: false });
  });

  it('parses --env-name without value as undefined', () => {
    const result = parseArgs(['node', 'cli.js', '--env-name']);

    expect(result).toEqual({ filePath: undefined, insecure: false, envPath: undefined, envName: undefined, version: false, help: false });
  });

  it('parses --env-name with another flag as value as undefined', () => {
    const result = parseArgs(['node', 'cli.js', '--env-name', '--insecure', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: true, envPath: undefined, envName: undefined, version: false, help: false });
  });

  it('parses combined --env and --env-name flags', () => {
    const result = parseArgs(['node', 'cli.js', '--env', 'prod.json', '--env-name', 'Development', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: 'prod.json', envName: 'Development', version: false, help: false });
  });

  it('parses -v alone', () => {
    const result = parseArgs(['node', 'cli.js', '-v']);

    expect(result).toEqual({ filePath: undefined, insecure: false, envPath: undefined, envName: undefined, version: true, help: false });
  });

  it('parses --version alone', () => {
    const result = parseArgs(['node', 'cli.js', '--version']);

    expect(result).toEqual({ filePath: undefined, insecure: false, envPath: undefined, envName: undefined, version: true, help: false });
  });

  it('parses -v before file path', () => {
    const result = parseArgs(['node', 'cli.js', '-v', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: undefined, envName: undefined, version: true, help: false });
  });

  it('parses --version before file path', () => {
    const result = parseArgs(['node', 'cli.js', '--version', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: undefined, envName: undefined, version: true, help: false });
  });

  it('parses -v after file path', () => {
    const result = parseArgs(['node', 'cli.js', 'api.http', '-v']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: undefined, envName: undefined, version: true, help: false });
  });

  it('parses --version after file path', () => {
    const result = parseArgs(['node', 'cli.js', 'api.http', '--version']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: undefined, envName: undefined, version: true, help: false });
  });

  it('parses --env with --version as value as undefined', () => {
    const result = parseArgs(['node', 'cli.js', '--env', '--version', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: undefined, envName: undefined, version: true, help: false });
  });

  it('parses combined --env and --version flags', () => {
    const result = parseArgs(['node', 'cli.js', '--env', 'dev.json', '--version', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: 'dev.json', envName: undefined, version: true, help: false });
  });

  it('parses -h alone', () => {
    const result = parseArgs(['node', 'cli.js', '-h']);

    expect(result).toEqual({ filePath: undefined, insecure: false, envPath: undefined, envName: undefined, version: false, help: true });
  });

  it('parses --help alone', () => {
    const result = parseArgs(['node', 'cli.js', '--help']);

    expect(result).toEqual({ filePath: undefined, insecure: false, envPath: undefined, envName: undefined, version: false, help: true });
  });

  it('parses -h before file path', () => {
    const result = parseArgs(['node', 'cli.js', '-h', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: undefined, envName: undefined, version: false, help: true });
  });

  it('parses --help before file path', () => {
    const result = parseArgs(['node', 'cli.js', '--help', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: undefined, envName: undefined, version: false, help: true });
  });

  it('parses -h after file path', () => {
    const result = parseArgs(['node', 'cli.js', 'api.http', '-h']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: undefined, envName: undefined, version: false, help: true });
  });

  it('parses --help after file path', () => {
    const result = parseArgs(['node', 'cli.js', 'api.http', '--help']);

    expect(result).toEqual({ filePath: 'api.http', insecure: false, envPath: undefined, envName: undefined, version: false, help: true });
  });

  it('parses combined --insecure and -h flags', () => {
    const result = parseArgs(['node', 'cli.js', '--insecure', '-h', 'api.http']);

    expect(result).toEqual({ filePath: 'api.http', insecure: true, envPath: undefined, envName: undefined, version: false, help: true });
  });

  it('parses --env with -h as value as undefined', () => {
    const result = parseArgs(['node', 'cli.js', '--env', '-h']);

    expect(result).toEqual({ filePath: undefined, insecure: false, envPath: undefined, envName: undefined, version: false, help: true });
  });

  it('parses -h -v', () => {
    const result = parseArgs(['node', 'cli.js', '-h', '-v']);

    expect(result).toEqual({ filePath: undefined, insecure: false, envPath: undefined, envName: undefined, version: true, help: true });
  });

  it('parses --version --help', () => {
    const result = parseArgs(['node', 'cli.js', '--version', '--help']);

    expect(result).toEqual({ filePath: undefined, insecure: false, envPath: undefined, envName: undefined, version: true, help: true });
  });
});
