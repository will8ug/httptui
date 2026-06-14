import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseEnvironmentFile } from '../../src/core/env-parser';

function readFixture(name: string): string {
  return readFileSync(resolve(__dirname, '..', 'fixtures', name), 'utf8');
}

describe('parseEnvironmentFile', () => {
  it('parses a valid environment file', () => {
    const content = readFixture('postman-environment.json');
    const result = parseEnvironmentFile(content);

    expect(result.name).toBe('Development');
    expect(result.variables).toHaveLength(3);
    expect(result.variables).toContainEqual({ name: 'baseUrl', value: 'https://api.dev.com' });
    expect(result.variables).toContainEqual({ name: 'apiKey', value: 'dev-secret-key' });
    expect(result.variables).toContainEqual({ name: 'port', value: '8080' });
  });

  it('parses a simplified environment file', () => {
    const content = JSON.stringify({
      name: 'Development',
      values: [
        { key: 'baseUrl', value: 'https://api.dev.com', enabled: true },
        { key: 'apiKey', value: 'dev-secret-key', enabled: true },
        { key: 'port', value: '8080', enabled: true },
      ],
    });
    const result = parseEnvironmentFile(content);

    expect(result.name).toBe('Development');
    expect(result.variables).toHaveLength(3);
    expect(result.variables).toContainEqual({ name: 'baseUrl', value: 'https://api.dev.com' });
    expect(result.variables).toContainEqual({ name: 'apiKey', value: 'dev-secret-key' });
    expect(result.variables).toContainEqual({ name: 'port', value: '8080' });
  });

  it('parses a simplified environment file with omitted enabled field', () => {
    const content = JSON.stringify({
      name: 'Development',
      values: [
        { key: 'baseUrl', value: 'https://api.dev.com' },
        { key: 'apiKey', value: 'dev-secret-key' },
      ],
    });
    const result = parseEnvironmentFile(content);

    expect(result.name).toBe('Development');
    expect(result.variables).toHaveLength(2);
    expect(result.variables).toContainEqual({ name: 'baseUrl', value: 'https://api.dev.com' });
    expect(result.variables).toContainEqual({ name: 'apiKey', value: 'dev-secret-key' });
  });

  it('skips disabled variables', () => {
    const content = readFixture('postman-environment-disabled.json');
    const result = parseEnvironmentFile(content);

    expect(result.name).toBe('Production');
    expect(result.variables).toHaveLength(2);
    expect(result.variables).toContainEqual({ name: 'baseUrl', value: 'https://api.prod.com' });
    expect(result.variables).toContainEqual({ name: 'port', value: '443' });
    expect(result.variables).not.toContainEqual({ name: 'apiKey', value: 'prod-secret-key' });
  });

  it('returns empty array for missing values', () => {
    const result = parseEnvironmentFile('{"name": "Empty", "_postman_variable_scope": "environment"}');

    expect(result.name).toBe('Empty');
    expect(result.variables).toHaveLength(0);
  });

  it('returns empty array for empty values', () => {
    const result = parseEnvironmentFile('{"name": "Empty", "values": []}');

    expect(result.name).toBe('Empty');
    expect(result.variables).toHaveLength(0);
  });

  it('ignores entries without a key', () => {
    const content = JSON.stringify({
      name: 'Test',
      values: [
        { key: 'valid', value: 'yes', enabled: true },
        { value: 'no key', enabled: true },
        { key: '', value: 'empty key', enabled: true },
      ],
    });
    const result = parseEnvironmentFile(content);

    expect(result.name).toBe('Test');
    expect(result.variables).toHaveLength(1);
    expect(result.variables[0]).toEqual({ name: 'valid', value: 'yes' });
  });

  it('converts non-string values to strings', () => {
    const content = JSON.stringify({
      name: 'Test',
      values: [
        { key: 'number', value: 42, enabled: true },
        { key: 'bool', value: true, enabled: true },
        { key: 'null', value: null, enabled: true },
      ],
    });
    const result = parseEnvironmentFile(content);

    expect(result.name).toBe('Test');
    expect(result.variables).toContainEqual({ name: 'number', value: '42' });
    expect(result.variables).toContainEqual({ name: 'bool', value: 'true' });
    expect(result.variables).toContainEqual({ name: 'null', value: '' });
  });

  it('treats missing enabled as true', () => {
    const content = JSON.stringify({
      name: 'Test',
      values: [
        { key: 'always', value: 'included' },
      ],
    });
    const result = parseEnvironmentFile(content);

    expect(result.name).toBe('Test');
    expect(result.variables).toHaveLength(1);
    expect(result.variables[0]).toEqual({ name: 'always', value: 'included' });
  });

  it('returns the top-level name when present', () => {
    const content = JSON.stringify({
      name: 'Dev',
      values: [
        { key: 'baseUrl', value: 'https://api.dev.com', enabled: true },
      ],
    });
    const result = parseEnvironmentFile(content);

    expect(result.name).toBe('Dev');
    expect(result.variables).toEqual([{ name: 'baseUrl', value: 'https://api.dev.com' }]);
  });

  it('returns name as null when the file has no name field', () => {
    const content = JSON.stringify({
      values: [
        { key: 'baseUrl', value: 'https://api.dev.com', enabled: true },
      ],
    });
    const result = parseEnvironmentFile(content);

    expect(result.name).toBeNull();
    expect(result.variables).toEqual([{ name: 'baseUrl', value: 'https://api.dev.com' }]);
  });

  it('returns name as null when name is an empty string', () => {
    const content = JSON.stringify({
      name: '',
      values: [
        { key: 'baseUrl', value: 'https://api.dev.com', enabled: true },
      ],
    });
    const result = parseEnvironmentFile(content);

    expect(result.name).toBeNull();
    expect(result.variables).toEqual([{ name: 'baseUrl', value: 'https://api.dev.com' }]);
  });

  it('returns name as null when name is not a string', () => {
    const content = JSON.stringify({
      name: 42,
      values: [
        { key: 'baseUrl', value: 'https://api.dev.com', enabled: true },
      ],
    });
    const result = parseEnvironmentFile(content);

    expect(result.name).toBeNull();
    expect(result.variables).toEqual([{ name: 'baseUrl', value: 'https://api.dev.com' }]);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseEnvironmentFile('not json')).toThrow('invalid JSON');
  });

  it('throws on non-object JSON', () => {
    expect(() => parseEnvironmentFile('[1, 2, 3]')).toThrow('expected JSON object');
  });
});
