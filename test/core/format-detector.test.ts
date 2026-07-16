import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { detectFormat } from '../../src/core/format-detector';

function readFixture(name: string): string {
  return readFileSync(resolve(__dirname, '..', 'fixtures', name), 'utf8');
}

describe('detectFormat', () => {
  it('returns postman for a collection with info.schema containing "postman"', () => {
    const content = readFixture('postman-basic.json');
    expect(detectFormat('collection.json', content)).toBe('postman');
  });

  it('returns postman for a collection with info + item (no schema field)', () => {
    const content = JSON.stringify({ info: { name: 'Test' }, item: [{ name: 'Request', request: { method: 'GET', url: 'https://example.com' } }] });
    expect(detectFormat('file.json', content)).toBe('postman');
  });

  it('returns http for non-JSON file extension', () => {
    const content = readFixture('dummy.http');
    expect(detectFormat('dummy.http', content)).toBe('http');
  });

  it('returns http for invalid JSON', () => {
    expect(detectFormat('file.json', 'not valid json')).toBe('http');
  });

  it('returns http for JSON without postman structure', () => {
    expect(detectFormat('config.json', JSON.stringify({ key: 'value' }))).toBe('http');
  });

  it('returns openapi for a JSON file with top-level openapi field', () => {
    const content = JSON.stringify({ openapi: '3.0.3', paths: {} });
    expect(detectFormat('spec.json', content)).toBe('openapi');
  });

  it('returns openapi for a JSON file with swagger field (Swagger 2.0)', () => {
    const content = JSON.stringify({ swagger: '2.0', paths: {} });
    expect(detectFormat('spec.json', content)).toBe('openapi');
  });
});
