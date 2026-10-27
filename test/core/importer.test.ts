import { describe, expect, it } from 'vitest';

import { importContent } from '../../src/core/importer';
import { parsePostmanCollection } from '../../src/core/importers/postman';
import { importOk, readFixture, readJsonFixture } from '../helpers/fixtures';

describe('importContent detection', () => {
  it('routes a collection with info.schema containing "postman" to the postman adapter', () => {
    const content = readFixture('postman/postman-basic.json');
    const result = importOk('collection.json', content);

    expect(result.format).toBe('postman');
    expect(result.requests).toHaveLength(2);
    expect(result.requests[0].name).toBe('Get Users');
  });

  it('routes a collection with info + item (no schema field) to the postman adapter', () => {
    const content = JSON.stringify({ info: { name: 'Test' }, item: [{ name: 'Request', request: { method: 'GET', url: 'https://example.com' } }] });
    const result = importOk('file.json', content);

    expect(result.format).toBe('postman');
    expect(result.requests).toHaveLength(1);
    expect(result.requests[0].name).toBe('Request');
  });

  it('does not misclassify a Postman collection as OpenAPI', () => {
    const content = readFixture('postman/postman-basic.json');
    const result = importOk('collection.json', content);

    expect(result.format).toBe('postman');
  });

  it('detects http for non-JSON file extension', () => {
    const content = readFixture('http/dummy.http');

    expect(importOk('dummy.http', content).format).toBe('http');
  });

  it('detects http for invalid JSON', () => {
    const result = importOk('file.json', 'not valid json');

    expect(result.format).toBe('http');
    expect(result.requests).toHaveLength(0);
  });

  it('detects http for JSON without postman structure', () => {
    const result = importOk('config.json', JSON.stringify({ key: 'value' }));

    expect(result.format).toBe('http');
    expect(result.requests).toHaveLength(0);
  });

  it('routes a JSON file with top-level openapi field to the openapi adapter', () => {
    const content = JSON.stringify({ openapi: '3.0.3', paths: {} });
    const result = importOk('spec.json', content);

    expect(result.format).toBe('openapi');
    expect(result.variables).toContainEqual({ name: 'baseUrl', value: '' });
  });

  it('routes a JSON file with swagger field (Swagger 2.0) to the openapi adapter', () => {
    const content = JSON.stringify({ swagger: '2.0', paths: {} });
    const result = importOk('spec.json', content);

    expect(result.format).toBe('openapi');
    expect(result.warnings).toEqual([
      'Swagger 2.0 specs are not supported — returning empty results',
    ]);
  });

  it('routes a .yaml file with top-level openapi key to the openapi adapter', () => {
    const content = 'openapi: "3.0.3"\npaths:\n  /users:\n    get:\n      operationId: listUsers';
    const result = importOk('spec.yaml', content);

    expect(result.format).toBe('openapi');
    expect(result.requests).toHaveLength(1);
    expect(result.requests[0].name).toBe('listUsers');
  });

  it('routes a .yml file with unquoted swagger: 2.0 (parsed as number) to the openapi adapter', () => {
    const content = 'swagger: 2.0\npaths: {}';
    const result = importOk('spec.yml', content);

    expect(result.format).toBe('openapi');
    expect(result.warnings).toEqual([
      'Swagger 2.0 specs are not supported — returning empty results',
    ]);
  });

  it('detects http for a .yaml file with valid YAML but no OpenAPI markers', () => {
    const content = 'key: value\nlist:\n  - item';
    const result = importOk('spec.yaml', content);

    expect(result.format).toBe('http');
    expect(result.requests).toHaveLength(0);
  });

  it('detects http for .http and .rest extensions without parsing', () => {
    expect(importOk('file.http', 'GET https://example.com').format).toBe('http');
    expect(importOk('file.rest', 'GET https://example.com').format).toBe('http');
    expect(importOk('file.http', 'GET https://example.com').requests).toHaveLength(1);
  });

  it('detects http for malformed JSON without an OpenAPI marker', () => {
    expect(importOk('file.json', 'not valid json').format).toBe('http');
  });

  it('ignores nested or commented marker lines in YAML', () => {
    const nested = 'nested:\n  openapi: 3.0.3\nkey: value';
    expect(importOk('spec.yaml', nested).format).toBe('http');

    const commented = '# openapi: 3.0.3\nkey: value';
    expect(importOk('spec.yaml', commented).format).toBe('http');
  });
});

describe('importContent error arm', () => {
  it('fails with invalid YAML when a .yaml file has a marker but is malformed', () => {
    const content = 'openapi: 3.0.3\nbad: [';
    const outcome = importContent('spec.yaml', content);

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error).toContain('Failed to parse OpenAPI spec: invalid YAML');
    }
  });

  it('fails with invalid JSON when a .json file has a marker but is malformed', () => {
    const content = '{"openapi": "3.0.3" invalid}';
    const outcome = importContent('spec.json', content);

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error).toContain('Failed to parse OpenAPI spec: invalid JSON');
    }
  });
});

describe('importContent dispatch and outcome shape', () => {
  it('carries format, requests, variables, and empty warnings on http success', () => {
    const result = importOk('file.http', '@host = example.com\n\nGET https://{{host}}/users');

    expect(result.ok).toBe(true);
    expect(result.format).toBe('http');
    expect(result.requests).toHaveLength(1);
    expect(result.variables).toEqual([{ name: 'host', value: 'example.com' }]);
    expect(result.warnings).toEqual([]);
  });

  it('routes a JSON spec fixture to the openapi adapter with its parsed document', () => {
    const content = readFixture('openapi/openapi-basic.json');
    const result = importOk('spec.json', content);

    expect(result.format).toBe('openapi');
    expect(result.requests).toHaveLength(1);
    expect(result.requests[0].url).toBe('{{baseUrl}}/users');
    expect(result.warnings).toEqual([]);
  });

  it('aggregates postman adapter warnings onto the outcome', () => {
    const content = readFixture('postman/postman-unsupported-method.json');
    const result = importOk('collection.json', content);

    expect(result.format).toBe('postman');
    expect(result.requests).toHaveLength(0);
    expect(result.warnings).toEqual([
      'Unsupported HTTP method "TRACE" in request "Trace Request" — skipped',
    ]);
  });

  it('aggregates openapi adapter warnings onto the outcome from a fixture', () => {
    const content = readFixture('openapi/openapi-auth.json');
    const result = importOk('spec.json', content);

    expect(result.format).toBe('openapi');
    expect(result.warnings.join('\n')).toContain('oauth2');
  });

  it('routes a parsed postman doc through the seam exactly like the adapter alone', () => {
    const content = readFixture('postman/postman-basic.json');
    const viaSeam = importContent('collection.json', content);
    const viaAdapter = parsePostmanCollection(readJsonFixture('postman/postman-basic.json'));

    expect(viaSeam).toEqual(viaAdapter);
  });
});
