import { describe, expect, it } from 'vitest';

import { assertDefinedToNarrowType } from '../../helpers/assertions.js';
import { readJsonFixture } from '../../helpers/fixtures';
import { parsePostmanCollection } from '../../../src/core/importers/postman';

describe('parsePostmanCollection', () => {
  it('parses a basic collection with multiple requests', () => {
    const content = readJsonFixture('postman/postman-basic.json');
    const result = parsePostmanCollection(content);

    expect(result.requests).toHaveLength(2);
    expect(result.requests[0].name).toBe('Get Users');
    expect(result.requests[0].method).toBe('GET');
    expect(result.requests[0].url).toBe('https://api.example.com/users');
    expect(result.requests[0].headers).toEqual({ accept: 'application/json' });
    expect(result.requests[0].body).toBeUndefined();

    expect(result.requests[1].name).toBe('Create User');
    expect(result.requests[1].method).toBe('POST');
    expect(result.requests[1].body).toBe('{"name": "Alice", "email": "alice@example.com"}');
  });

  it('parses an empty collection', () => {
    const content = readJsonFixture('postman/postman-empty.json');
    const result = parsePostmanCollection(content);

    expect(result.requests).toHaveLength(0);
    expect(result.variables).toHaveLength(0);
  });

  it('flattens nested folders with name prefixing', () => {
    const content = readJsonFixture('postman/postman-nested.json');
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
    const content = readJsonFixture('postman/postman-nested.json');
    const result = parsePostmanCollection(content);

    const loginRequest = result.requests.find((r) => r.name === 'Auth / Login');
    expect(loginRequest).toBeDefined();
    assertDefinedToNarrowType(loginRequest, 'Expected login request to be defined');
    expect(loginRequest.headers.Authorization).toBe('Basic YWRtaW46c2VjcmV0');
  });

  it('converts Bearer auth to Authorization header', () => {
    const content = readJsonFixture('postman/postman-nested.json');
    const result = parsePostmanCollection(content);

    const profileRequest = result.requests.find((r) => r.name === 'Auth / Get Profile');
    expect(profileRequest).toBeDefined();
    assertDefinedToNarrowType(profileRequest, 'Expected profile request to be defined');
    expect(profileRequest.headers.Authorization).toBe('Bearer abc123token');
  });

  it('converts API Key auth to custom header', () => {
    const content = readJsonFixture('postman/postman-variables.json');
    const result = parsePostmanCollection(content);

    const apiKeyRequest = result.requests.find((r) => r.name === 'API Key Auth');
    expect(apiKeyRequest).toBeDefined();
    assertDefinedToNarrowType(apiKeyRequest, 'Expected API Key request to be defined');
    expect(apiKeyRequest.headers['X-API-Key']).toBe('secret-api-key');
  });

  it('extracts collection variables', () => {
    const content = readJsonFixture('postman/postman-variables.json');
    const result = parsePostmanCollection(content);

    expect(result.variables).toHaveLength(3);
    expect(result.variables).toContainEqual({ name: 'baseUrl', value: 'https://api.example.com' });
    expect(result.variables).toContainEqual({ name: 'userId', value: '42' });
    expect(result.variables).toContainEqual({ name: 'token', value: '{{$guid}}' });
  });

  it('converts urlencoded body to key=value string', () => {
    const content = readJsonFixture('postman/postman-variables.json');
    const result = parsePostmanCollection(content);

    const formRequest = result.requests.find((r) => r.name === 'Submit Form');
    expect(formRequest).toBeDefined();
    assertDefinedToNarrowType(formRequest, 'Expected form request to be defined');
    expect(formRequest.body).toBe('name=Alice&email=alice%40example.com');
  });

  it('injects Content-Type header for urlencoded body', () => {
    const content = readJsonFixture('postman/postman-variables.json');
    const result = parsePostmanCollection(content);

    const formRequest = result.requests.find((r) => r.name === 'Submit Form');
    expect(formRequest).toBeDefined();
    assertDefinedToNarrowType(formRequest, 'Expected form request to be defined');
    expect(formRequest.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  });

  it('preserves {{variable}} placeholders in URL and headers', () => {
    const content = readJsonFixture('postman/postman-variables.json');
    const result = parsePostmanCollection(content);

    const getResource = result.requests.find((r) => r.name === 'Get Resource');
    expect(getResource).toBeDefined();
    assertDefinedToNarrowType(getResource, 'Expected Get Resource request to be defined');
    expect(getResource.url).toContain('{{baseUrl}}');
    expect(getResource.url).toContain('{{userId}}');
    expect(getResource.headers.authorization).toBe('Bearer {{token}}');
  });

  it('handles collection with no variables gracefully', () => {
    const content = readJsonFixture('postman/postman-basic.json');
    const result = parsePostmanCollection(content);

    expect(result.variables).toHaveLength(0);
  });

  it('handles request with no body gracefully', () => {
    const content = readJsonFixture('postman/postman-basic.json');
    const result = parsePostmanCollection(content);

    expect(result.requests[0].body).toBeUndefined();
  });

  it('extracts text-only formdata fields as formdataFields', () => {
    const content = readJsonFixture('postman/postman-formdata-text.json');
    const result = parsePostmanCollection(content);

    expect(result.requests).toHaveLength(1);
    const request = result.requests[0];
    expect(request.name).toBe('Submit Text FormData');
    expect(request.body).toBeUndefined();
    expect(request.formdataFields).toBeDefined();
    expect(request.formdataFields).toHaveLength(3);

    const fields = request.formdataFields;
    assertDefinedToNarrowType(fields, 'Expected formdataFields to be defined');
    expect(fields[0]).toEqual({ key: 'username', value: 'alice', type: 'text' });
    expect(fields[1]).toEqual({ key: 'email', value: 'alice@example.com', type: 'text' });
    expect(fields[2]).toEqual({ key: 'message', value: 'Hello World', type: 'text' });
  });

  it('injects Content-Type: multipart/form-data header for text-only formdata', () => {
    const content = readJsonFixture('postman/postman-formdata-text.json');
    const result = parsePostmanCollection(content);

    const request = result.requests[0];
    expect(request.headers['Content-Type']).toBe('multipart/form-data');
  });

  it('warns on formdata with file fields and sets formdataFields to undefined', () => {
    const content = readJsonFixture('postman/postman-formdata-mixed.json');
    const result = parsePostmanCollection(content);

    expect(result.requests).toHaveLength(1);
    const request = result.requests[0];
    expect(request.name).toBe('Submit Mixed FormData');
    expect(request.body).toBeUndefined();
    expect(request.formdataFields).toBeUndefined();
    expect(result.warnings).toEqual([
      'Request "Submit Mixed FormData" has form-data with file uploads — not supported',
    ]);
  });

  it('injects Content-Type: application/json for raw body with JSON language hint', () => {
    const content = readJsonFixture('postman/postman-raw-content-type.json');
    const result = parsePostmanCollection(content);

    const request = result.requests.find((r) => r.name === 'Raw JSON Body');
    expect(request).toBeDefined();
    assertDefinedToNarrowType(request, 'Expected request to be defined');
    expect(request.headers['Content-Type']).toBe('application/json');
  });

  it('injects Content-Type: application/xml for raw body with XML language hint', () => {
    const content = readJsonFixture('postman/postman-raw-content-type.json');
    const result = parsePostmanCollection(content);

    const request = result.requests.find((r) => r.name === 'Raw XML Body');
    expect(request).toBeDefined();
    assertDefinedToNarrowType(request, 'Expected request to be defined');
    expect(request.headers['Content-Type']).toBe('application/xml');
  });

  it('injects Content-Type: text/plain for raw body with text language hint', () => {
    const content = readJsonFixture('postman/postman-raw-content-type.json');
    const result = parsePostmanCollection(content);

    const request = result.requests.find((r) => r.name === 'Raw Text Body');
    expect(request).toBeDefined();
    assertDefinedToNarrowType(request, 'Expected request to be defined');
    expect(request.headers['Content-Type']).toBe('text/plain');
  });

  it('injects Content-Type: text/html for raw body with HTML language hint', () => {
    const content = readJsonFixture('postman/postman-raw-content-type.json');
    const result = parsePostmanCollection(content);

    const request = result.requests.find((r) => r.name === 'Raw HTML Body');
    expect(request).toBeDefined();
    assertDefinedToNarrowType(request, 'Expected request to be defined');
    expect(request.headers['Content-Type']).toBe('text/html');
  });

  it('preserves explicit Content-Type header and does not override', () => {
    const content = readJsonFixture('postman/postman-raw-content-type.json');
    const result = parsePostmanCollection(content);

    const request = result.requests.find((r) => r.name === 'Raw JSON With Explicit Content-Type');
    expect(request).toBeDefined();
    assertDefinedToNarrowType(request, 'Expected request to be defined');
    const contentType = Object.entries(request.headers).find(
      ([key]) => key.toLowerCase() === 'content-type',
    )?.[1];
    expect(contentType).toBe('application/custom+json');
  });

  it('silently ignores unrecognized raw language and does not inject Content-Type', () => {
    const content = readJsonFixture('postman/postman-raw-content-type.json');
    const result = parsePostmanCollection(content);

    const request = result.requests.find((r) => r.name === 'Raw Unrecognized Language');
    expect(request).toBeDefined();
    assertDefinedToNarrowType(request, 'Expected request to be defined');
    expect(request.headers['Content-Type']).toBeUndefined();
  });

  it('does not inject Content-Type when raw body has no language hint', () => {
    const content = readJsonFixture('postman/postman-raw-content-type.json');
    const result = parsePostmanCollection(content);

    const request = result.requests.find((r) => r.name === 'Raw Without Language Hint');
    expect(request).toBeDefined();
    assertDefinedToNarrowType(request, 'Expected request to be defined');
    expect(request.headers['Content-Type']).toBeUndefined();
  });

  it('skips requests with unsupported HTTP methods', () => {
    const content = readJsonFixture('postman/postman-unsupported-method.json');

    const result = parsePostmanCollection(content);

    expect(result.requests).toHaveLength(0);
    expect(result.warnings).toEqual([
      'Unsupported HTTP method "TRACE" in request "Trace Request" — skipped',
    ]);
  });

  it('warns about GraphQL body and drops the body', () => {
    const content = readJsonFixture('postman/postman-graphql-body.json');

    const result = parsePostmanCollection(content);

    expect(result.requests).toHaveLength(1);
    expect(result.requests[0].body).toBeUndefined();
    expect(result.warnings).toEqual([
      'Request "GraphQL Request" has GraphQL body — not supported',
    ]);
  });

  it('warns about binary file body and drops the body', () => {
    const content = readJsonFixture('postman/postman-file-body.json');

    const result = parsePostmanCollection(content);

    expect(result.requests).toHaveLength(1);
    expect(result.requests[0].body).toBeUndefined();
    expect(result.warnings).toEqual([
      'Request "(unnamed)" has binary file body — not supported',
    ]);
  });

  it('uses synthetic name for requests without a name', () => {
    const content = readJsonFixture('postman/postman-no-name.json');
    const result = parsePostmanCollection(content);

    expect(result.requests).toHaveLength(1);
    expect(result.requests[0].name).toBe('Request 1');
  });

  it('handles urlencoded bodies with empty or missing-key parameters', () => {
    const content = readJsonFixture('postman/postman-urlencoded-edge.json');
    const result = parsePostmanCollection(content);

    expect(result.requests).toHaveLength(2);

    const emptyRequest = result.requests.find((r) => r.name === 'Empty Urlencoded');
    expect(emptyRequest).toBeDefined();
    assertDefinedToNarrowType(emptyRequest, 'Expected empty request to be defined');
    expect(emptyRequest.body).toBeUndefined();

    const missingKeyRequest = result.requests.find((r) => r.name === 'Missing Key Urlencoded');
    expect(missingKeyRequest).toBeDefined();
    assertDefinedToNarrowType(missingKeyRequest, 'Expected missing-key request to be defined');
    expect(missingKeyRequest.body).toBe('name=Alice&token=');
  });
});

describe('integration smoke test', () => {
  it('parsed collection produces valid AppProps requests', () => {
    const content = readJsonFixture('postman/postman-nested.json');
    const result = parsePostmanCollection(content);

    expect(result.requests.length).toBeGreaterThan(0);

    for (const req of result.requests) {
      expect(req.name).toBeTruthy();
      expect(req.method).toMatch(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/);
      expect(req.url).toBeTruthy();
    }
  });
});
