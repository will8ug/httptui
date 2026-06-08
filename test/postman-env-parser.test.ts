import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { parsePostmanEnvironment } from '../src/core/postman-env-parser';

function readFixture(name: string): string {
  return readFileSync(resolve(__dirname, 'fixtures', name), 'utf8');
}

describe('parsePostmanEnvironment', () => {
  it('parses a valid environment file', () => {
    const content = readFixture('postman-environment.json');
    const result = parsePostmanEnvironment(content);

    expect(result).toHaveLength(3);
    expect(result).toContainEqual({ name: 'baseUrl', value: 'https://api.dev.com' });
    expect(result).toContainEqual({ name: 'apiKey', value: 'dev-secret-key' });
    expect(result).toContainEqual({ name: 'port', value: '8080' });
  });

  it('skips disabled variables', () => {
    const content = readFixture('postman-environment-disabled.json');
    const result = parsePostmanEnvironment(content);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ name: 'baseUrl', value: 'https://api.prod.com' });
    expect(result).toContainEqual({ name: 'port', value: '443' });
    expect(result).not.toContainEqual({ name: 'apiKey', value: 'prod-secret-key' });
  });

  it('returns empty array for missing values', () => {
    const result = parsePostmanEnvironment('{"name": "Empty", "_postman_variable_scope": "environment"}');

    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty values', () => {
    const result = parsePostmanEnvironment('{"name": "Empty", "values": []}');

    expect(result).toHaveLength(0);
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
    const result = parsePostmanEnvironment(content);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: 'valid', value: 'yes' });
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
    const result = parsePostmanEnvironment(content);

    expect(result).toContainEqual({ name: 'number', value: '42' });
    expect(result).toContainEqual({ name: 'bool', value: 'true' });
    expect(result).toContainEqual({ name: 'null', value: '' });
  });

  it('treats missing enabled as true', () => {
    const content = JSON.stringify({
      name: 'Test',
      values: [
        { key: 'always', value: 'included' },
      ],
    });
    const result = parsePostmanEnvironment(content);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: 'always', value: 'included' });
  });

  it('throws on invalid JSON', () => {
    expect(() => parsePostmanEnvironment('not json')).toThrow('invalid JSON');
  });

  it('throws on non-object JSON', () => {
    expect(() => parsePostmanEnvironment('[1, 2, 3]')).toThrow('expected JSON object');
  });
});
