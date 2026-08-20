import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { detectFormat } from '../../src/core/format-detector';

function readFixture(name: string): string {
  return readFileSync(resolve(__dirname, '..', 'fixtures', name), 'utf8');
}

describe('detectFormat', () => {
  it('returns postman for a collection with info.schema containing "postman"', () => {
    const content = readFixture('postman/postman-basic.json');
    expect(detectFormat('collection.json', content)).toBe('postman');
  });

  it('returns postman for a collection with info + item (no schema field)', () => {
    const content = JSON.stringify({ info: { name: 'Test' }, item: [{ name: 'Request', request: { method: 'GET', url: 'https://example.com' } }] });
    expect(detectFormat('file.json', content)).toBe('postman');
  });

  it('returns http for non-JSON file extension', () => {
    const content = readFixture('http/dummy.http');
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

  it('returns openapi for a .yaml file with top-level openapi key', () => {
    const content = 'openapi: "3.0.3"\npaths:\n  /users:\n    get:\n      operationId: listUsers';
    expect(detectFormat('spec.yaml', content)).toBe('openapi');
  });

  it('returns openapi for a .yml file with unquoted swagger: 2.0 (parsed as number)', () => {
    const content = 'swagger: 2.0\npaths: {}';
    expect(detectFormat('spec.yml', content)).toBe('openapi');
  });

  it('returns http for a .yaml file with valid YAML but no OpenAPI markers', () => {
    const content = 'key: value\nlist:\n  - item';
    expect(detectFormat('spec.yaml', content)).toBe('http');
  });

  it('returns http for .http and .rest extensions without parsing', () => {
    expect(detectFormat('file.http', 'GET https://example.com')).toBe('http');
    expect(detectFormat('file.rest', 'GET https://example.com')).toBe('http');
  });

  it('does not misclassify a Postman collection as OpenAPI', () => {
    const content = readFixture('postman/postman-basic.json');
    expect(detectFormat('collection.json', content)).toBe('postman');
  });

  it('throws invalid YAML when a .yaml file has a marker but is malformed', () => {
    const content = 'openapi: 3.0.3\nbad: [';
    expect(() => detectFormat('spec.yaml', content)).toThrow('Failed to parse OpenAPI spec: invalid YAML');
  });

  it('throws invalid JSON when a .json file has a marker but is malformed', () => {
    const content = '{"openapi": "3.0.3" invalid}';
    expect(() => detectFormat('spec.json', content)).toThrow('Failed to parse OpenAPI spec: invalid JSON');
  });

  it('returns http for malformed JSON without an OpenAPI marker', () => {
    expect(detectFormat('file.json', 'not valid json')).toBe('http');
  });

  it('ignores nested or commented marker lines in YAML', () => {
    const nested = 'nested:\n  openapi: 3.0.3\nkey: value';
    expect(detectFormat('spec.yaml', nested)).toBe('http');

    const commented = '# openapi: 3.0.3\nkey: value';
    expect(detectFormat('spec.yaml', commented)).toBe('http');
  });
});
