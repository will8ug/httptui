import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { detectFormat, parsePostmanCollection } from '../src/core/postman-parser';

function readFixture(name: string): string {
  return readFileSync(resolve(__dirname, 'fixtures', name), 'utf8');
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
    const content = readFixture('postman-basic.json');
    expect(detectFormat('requests.http', content)).toBe('http');
  });

  it('returns http for invalid JSON', () => {
    expect(detectFormat('file.json', 'not valid json')).toBe('http');
  });

  it('returns http for JSON without postman structure', () => {
    expect(detectFormat('config.json', JSON.stringify({ key: 'value' }))).toBe('http');
  });
});

describe('parsePostmanCollection', () => {
  it('parses a basic collection with multiple requests', () => {
    const content = readFixture('postman-basic.json');
    const result = parsePostmanCollection(content);

    expect(result.requests).toHaveLength(2);
    expect(result.requests[0].name).toBe('Get Users');
    expect(result.requests[0].method).toBe('GET');
    expect(result.requests[0].url).toBe('https://api.example.com/users');
    expect(result.requests[0].headers).toEqual({ accept: 'application/json' });
    expect(result.requests[0].body).toBeUndefined();
    expect(result.requests[0].lineNumber).toBe(1);

    expect(result.requests[1].name).toBe('Create User');
    expect(result.requests[1].method).toBe('POST');
    expect(result.requests[1].body).toBe('{"name": "Alice", "email": "alice@example.com"}');
    expect(result.requests[1].lineNumber).toBe(2);
  });

  it('parses an empty collection', () => {
    const content = readFixture('postman-empty.json');
    const result = parsePostmanCollection(content);

    expect(result.requests).toHaveLength(0);
    expect(result.variables).toHaveLength(0);
  });

  it('flattens nested folders with name prefixing', () => {
    const content = readFixture('postman-nested.json');
    const result = parsePostmanCollection(content);

    expect(result.requests).toHaveLength(5);

    const names = result.requests.map((r) => r.name);
    expect(names).toContain('Users / List Users');
    expect(names).toContain('Users / Create User');
    expect(names).toContain('Auth / Login');
    expect(names).toContain('Auth / Get Profile');
    expect(names).toContain('Deeply Nested / Subfolder / Deep Request');
  });

  it('converts Basic auth to Authorization header', () => {
    const content = readFixture('postman-nested.json');
    const result = parsePostmanCollection(content);

    const loginRequest = result.requests.find((r) => r.name === 'Auth / Login');
    expect(loginRequest).toBeDefined();
    if (!loginRequest) {
      throw new Error('Expected login request to be defined');
    }
    expect(loginRequest.headers.Authorization).toBe('Basic YWRtaW46c2VjcmV0');
  });

  it('converts Bearer auth to Authorization header', () => {
    const content = readFixture('postman-nested.json');
    const result = parsePostmanCollection(content);

    const profileRequest = result.requests.find((r) => r.name === 'Auth / Get Profile');
    expect(profileRequest).toBeDefined();
    if (!profileRequest) {
      throw new Error('Expected profile request to be defined');
    }
    expect(profileRequest.headers.Authorization).toBe('Bearer abc123token');
  });

  it('converts API Key auth to custom header', () => {
    const content = readFixture('postman-variables.json');
    const result = parsePostmanCollection(content);

    const apiKeyRequest = result.requests.find((r) => r.name === 'API Key Auth');
    expect(apiKeyRequest).toBeDefined();
    if (!apiKeyRequest) {
      throw new Error('Expected API Key request to be defined');
    }
    expect(apiKeyRequest.headers['X-API-Key']).toBe('secret-api-key');
  });

  it('extracts collection variables', () => {
    const content = readFixture('postman-variables.json');
    const result = parsePostmanCollection(content);

    expect(result.variables).toHaveLength(3);
    expect(result.variables).toContainEqual({ name: 'baseUrl', value: 'https://api.example.com' });
    expect(result.variables).toContainEqual({ name: 'userId', value: '42' });
    expect(result.variables).toContainEqual({ name: 'token', value: '{{$guid}}' });
  });

  it('converts urlencoded body to key=value string', () => {
    const content = readFixture('postman-variables.json');
    const result = parsePostmanCollection(content);

    const formRequest = result.requests.find((r) => r.name === 'Submit Form');
    expect(formRequest).toBeDefined();
    if (!formRequest) {
      throw new Error('Expected form request to be defined');
    }
    expect(formRequest.body).toBe('name=Alice&email=alice%40example.com');
  });

  it('injects Content-Type header for urlencoded body', () => {
    const content = readFixture('postman-variables.json');
    const result = parsePostmanCollection(content);

    const formRequest = result.requests.find((r) => r.name === 'Submit Form');
    expect(formRequest).toBeDefined();
    if (!formRequest) {
      throw new Error('Expected form request to be defined');
    }
    expect(formRequest.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  });

  it('assigns incrementing synthetic lineNumbers', () => {
    const content = readFixture('postman-basic.json');
    const result = parsePostmanCollection(content);

    expect(result.requests[0].lineNumber).toBe(1);
    expect(result.requests[1].lineNumber).toBe(2);
  });

  it('preserves {{variable}} placeholders in URL and headers', () => {
    const content = readFixture('postman-variables.json');
    const result = parsePostmanCollection(content);

    const getResource = result.requests.find((r) => r.name === 'Get Resource');
    expect(getResource).toBeDefined();
    if (!getResource) {
      throw new Error('Expected Get Resource request to be defined');
    }
    expect(getResource.url).toContain('{{baseUrl}}');
    expect(getResource.url).toContain('{{userId}}');
    expect(getResource.headers.authorization).toBe('Bearer {{token}}');
  });

  it('handles collection with no variables gracefully', () => {
    const content = readFixture('postman-basic.json');
    const result = parsePostmanCollection(content);

    expect(result.variables).toHaveLength(0);
  });

  it('handles request with no body gracefully', () => {
    const content = readFixture('postman-basic.json');
    const result = parsePostmanCollection(content);

    expect(result.requests[0].body).toBeUndefined();
  });

  it('extracts text-only formdata fields as formdataFields', () => {
    const content = readFixture('postman-formdata-text.json');
    const result = parsePostmanCollection(content);

    expect(result.requests).toHaveLength(1);
    const request = result.requests[0];
    expect(request.name).toBe('Submit Text FormData');
    expect(request.body).toBeUndefined();
    expect(request.formdataFields).toBeDefined();
    expect(request.formdataFields).toHaveLength(3);

    const fields = request.formdataFields;
    if (!fields) {
      throw new Error('Expected formdataFields to be defined');
    }
    expect(fields[0]).toEqual({ key: 'username', value: 'alice', type: 'text' });
    expect(fields[1]).toEqual({ key: 'email', value: 'alice@example.com', type: 'text' });
    expect(fields[2]).toEqual({ key: 'message', value: 'Hello World', type: 'text' });
  });

  it('injects Content-Type: multipart/form-data header for text-only formdata', () => {
    const content = readFixture('postman-formdata-text.json');
    const result = parsePostmanCollection(content);

    const request = result.requests[0];
    expect(request.headers['Content-Type']).toBe('multipart/form-data');
  });

  it('warns on formdata with file fields and sets formdataFields to undefined', () => {
    const content = readFixture('postman-formdata-mixed.json');
    const result = parsePostmanCollection(content);

    expect(result.requests).toHaveLength(1);
    const request = result.requests[0];
    expect(request.name).toBe('Submit Mixed FormData');
    expect(request.body).toBeUndefined();
    expect(request.formdataFields).toBeUndefined();
  });
});

describe('integration smoke test', () => {
  it('parsed collection produces valid AppProps requests', () => {
    const content = readFixture('postman-nested.json');
    const result = parsePostmanCollection(content);

    expect(result.requests.length).toBeGreaterThan(0);

    for (const req of result.requests) {
      expect(req.name).toBeTruthy();
      expect(req.method).toMatch(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/);
      expect(req.url).toBeTruthy();
      expect(typeof req.lineNumber).toBe('number');
      expect(req.lineNumber).toBeGreaterThan(0);
    }
  });
});
