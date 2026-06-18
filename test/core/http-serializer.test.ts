import { describe, expect, it } from 'vitest';

import { serializeHttpFile } from '../../src/core/http-serializer';
import { parseHttpFile } from '../../src/core/parser';
import type { FileVariable, FormDataParam, ParsedRequest } from '../../src/core/types';
import { createRequest } from '../helpers/requests';

describe('serializeHttpFile', () => {
  describe('unit: single request serialization', () => {
    it('serializes a single GET request with no headers or body', () => {
      const request = createRequest({
        name: 'Get Users',
        method: 'GET',
        url: 'https://api.example.com/users',
        headers: {},
        body: undefined,
      });

      expect(serializeHttpFile([request], [])).toBe(
        '### Get Users\nGET https://api.example.com/users\n',
      );
    });

    it('serializes a POST request with headers and body', () => {
      const request = createRequest({
        name: 'Create User',
        method: 'POST',
        url: 'https://api.example.com/users',
        headers: { 'Content-Type': 'application/json' },
        body: '{"name":"Alice"}',
      });

      expect(serializeHttpFile([request], [])).toBe(
        '### Create User\nPOST https://api.example.com/users\nContent-Type: application/json\n\n{"name":"Alice"}\n',
      );
    });

    it('serializes a request with no headers and no body without an extra blank line', () => {
      const request = createRequest({
        name: 'Ping',
        method: 'GET',
        url: 'https://api.example.com/health',
        headers: {},
        body: undefined,
      });

      const output = serializeHttpFile([request], []);

      expect(output).toBe('### Ping\nGET https://api.example.com/health\n');
      expect(output).not.toContain('health\n\n');
    });

    it('serializes a request with headers but no body without a blank line after headers', () => {
      const request = createRequest({
        name: 'Auth Check',
        method: 'GET',
        url: 'https://api.example.com/me',
        headers: { Authorization: 'Bearer token' },
        body: undefined,
      });

      const output = serializeHttpFile([request], []);

      expect(output).toBe('### Auth Check\nGET https://api.example.com/me\nAuthorization: Bearer token\n');
    });

    it('serializes a multi-line body verbatim', () => {
      const request = createRequest({
        name: 'Create User',
        method: 'POST',
        url: 'https://api.example.com/users',
        headers: { 'Content-Type': 'application/json' },
        body: ['{', '  "name": "Alice"', '}'].join('\n'),
      });

      expect(serializeHttpFile([request], [])).toBe(
        [
          '### Create User',
          'POST https://api.example.com/users',
          'Content-Type: application/json',
          '',
          '{',
          '  "name": "Alice"',
          '}',
          '',
        ].join('\n'),
      );
    });
  });

  describe('unit: multiple requests', () => {
    it('separates two request blocks with a blank line', () => {
      const requests: ParsedRequest[] = [
        createRequest({ name: 'First', method: 'GET', url: 'https://api.example.com/a' }),
        createRequest({ name: 'Second', method: 'DELETE', url: 'https://api.example.com/b' }),
      ];

      const output = serializeHttpFile(requests, []);

      expect(output).toBe(
        '### First\nGET https://api.example.com/a\n\n### Second\nDELETE https://api.example.com/b\n',
      );
    });

    it('separates three request blocks with blank lines', () => {
      const requests: ParsedRequest[] = [
        createRequest({ name: 'One', method: 'GET', url: 'https://api.example.com/1' }),
        createRequest({
          name: 'Two',
          method: 'POST',
          url: 'https://api.example.com/2',
          headers: { 'Content-Type': 'text/plain' },
          body: 'hello',
        }),
        createRequest({ name: 'Three', method: 'PUT', url: 'https://api.example.com/3' }),
      ];

      const output = serializeHttpFile(requests, []);

      expect(output).toBe(
        [
          '### One',
          'GET https://api.example.com/1',
          '',
          '### Two',
          'POST https://api.example.com/2',
          'Content-Type: text/plain',
          '',
          'hello',
          '',
          '### Three',
          'PUT https://api.example.com/3',
          '',
        ].join('\n'),
      );
    });
  });

  describe('unit: variable placeholders', () => {
    it('preserves variable placeholders in the URL verbatim', () => {
      const request = createRequest({
        name: 'Get Users',
        method: 'GET',
        url: 'https://{{hostname}}/users',
      });

      const output = serializeHttpFile([request], []);

      expect(output).toContain('GET https://{{hostname}}/users');
      expect(output).not.toContain('https://api.example.com/users');
    });

    it('preserves system variable placeholders in the body verbatim', () => {
      const request = createRequest({
        name: 'Create Post',
        method: 'POST',
        url: 'https://api.example.com/posts',
        headers: { 'Content-Type': 'application/json' },
        body: '{"title":"Post {{$timestamp}}"}',
      });

      const output = serializeHttpFile([request], []);

      expect(output).toContain('{"title":"Post {{$timestamp}}"}');
    });

    it('preserves variable placeholders in header values verbatim', () => {
      const request = createRequest({
        name: 'Auth',
        method: 'GET',
        url: 'https://api.example.com/me',
        headers: { Authorization: 'Bearer {{token}}' },
      });

      const output = serializeHttpFile([request], []);

      expect(output).toContain('Authorization: Bearer {{token}}');
    });
  });

  describe('unit: file variables', () => {
    it('emits file variables as @name = value lines at the top with a blank line before the first request', () => {
      const variables: FileVariable[] = [{ name: 'hostname', value: 'api.example.com' }];
      const request = createRequest({ name: 'Get Users', method: 'GET', url: 'https://{{hostname}}/users' });

      const output = serializeHttpFile([request], variables);

      expect(output.startsWith('@hostname = api.example.com\n\n')).toBe(true);
      expect(output).toBe(
        '@hostname = api.example.com\n\n### Get Users\nGET https://{{hostname}}/users\n',
      );
    });

    it('emits multiple file variables one per line', () => {
      const variables: FileVariable[] = [
        { name: 'hostname', value: 'api.example.com' },
        { name: 'token', value: 'secret-{{env}}' },
      ];
      const request = createRequest({ name: 'Get Users', method: 'GET', url: 'https://{{hostname}}/users' });

      const output = serializeHttpFile([request], variables);

      expect(output.startsWith('@hostname = api.example.com\n@token = secret-{{env}}\n\n')).toBe(true);
    });

    it('produces no @ lines when the variables array is empty', () => {
      const request = createRequest({ name: 'Get Users', method: 'GET', url: 'https://api.example.com/users' });

      const output = serializeHttpFile([request], []);

      expect(output).not.toContain('@');
      expect(output.startsWith('### Get Users\n')).toBe(true);
    });

    it('emits only the @name = value lines when there are variables but no requests', () => {
      const variables: FileVariable[] = [{ name: 'hostname', value: 'api.example.com' }];

      expect(serializeHttpFile([], variables)).toBe('@hostname = api.example.com\n');
    });
  });

  describe('unit: form-data omission', () => {
    it('emits an omission comment with field count and keys, and strips the multipart Content-Type header', () => {
      const formdataFields: FormDataParam[] = [
        { key: 'username', value: 'alice', type: 'text' },
        { key: 'email', value: 'alice@example.com', type: 'text' },
      ];
      const request = createRequest({
        name: 'Upload',
        method: 'POST',
        url: 'https://api.example.com/upload',
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: 'Bearer token',
        },
        body: undefined,
        formdataFields,
      });

      const output = serializeHttpFile([request], []);

      expect(output).toContain('# form-data body omitted (2 text fields: username, email)');
      expect(output).not.toContain('Content-Type: multipart/form-data');
      expect(output).toContain('Authorization: Bearer token');
    });

    it('strips a multipart Content-Type header with a boundary suffix', () => {
      const formdataFields: FormDataParam[] = [
        { key: 'file', value: '/tmp/x', type: 'file' },
      ];
      const request = createRequest({
        name: 'Upload',
        method: 'POST',
        url: 'https://api.example.com/upload',
        headers: { 'Content-Type': 'multipart/form-data; boundary=---xyz' },
        body: undefined,
        formdataFields,
      });

      const output = serializeHttpFile([request], []);

      expect(output).not.toContain('multipart/form-data');
      expect(output).toContain('# form-data body omitted (1 text fields: file)');
    });

    it('strips a multipart Content-Type header regardless of header-name casing', () => {
      const formdataFields: FormDataParam[] = [
        { key: 'username', value: 'alice', type: 'text' },
      ];
      const request = createRequest({
        name: 'Upload',
        method: 'POST',
        url: 'https://api.example.com/upload',
        headers: { 'content-type': 'Multipart/Form-Data' },
        body: undefined,
        formdataFields,
      });

      const output = serializeHttpFile([request], []);

      expect(output).not.toContain('Multipart/Form-Data');
      expect(output).not.toMatch(/content-type:.*multipart/i);
      expect(output).toContain('# form-data body omitted (1 text fields: username)');
    });

    it('places the omission comment after a blank line following the headers', () => {
      const formdataFields: FormDataParam[] = [
        { key: 'username', value: 'alice', type: 'text' },
      ];
      const request = createRequest({
        name: 'Upload',
        method: 'POST',
        url: 'https://api.example.com/upload',
        headers: { Authorization: 'Bearer token' },
        body: undefined,
        formdataFields,
      });

      const output = serializeHttpFile([request], []);

      expect(output).toContain(
        'Authorization: Bearer token\n\n# form-data body omitted (1 text fields: username)',
      );
    });

    it('does not emit an omission comment when there is no form-data and a normal body', () => {
      const request = createRequest({
        name: 'Create User',
        method: 'POST',
        url: 'https://api.example.com/users',
        headers: { 'Content-Type': 'application/json' },
        body: '{"name":"Alice"}',
      });

      const output = serializeHttpFile([request], []);

      expect(output).not.toContain('form-data body omitted');
      expect(output).toContain('{"name":"Alice"}');
    });

    it('does not emit an omission comment when formdataFields is present but body is defined', () => {
      const formdataFields: FormDataParam[] = [
        { key: 'username', value: 'alice', type: 'text' },
      ];
      const request = createRequest({
        name: 'Create User',
        method: 'POST',
        url: 'https://api.example.com/users',
        headers: { 'Content-Type': 'application/json' },
        body: '{"name":"Alice"}',
        formdataFields,
      });

      const output = serializeHttpFile([request], []);

      expect(output).not.toContain('form-data body omitted');
      expect(output).toContain('{"name":"Alice"}');
      expect(output).toContain('Content-Type: application/json');
    });

    it('lists field keys in order from formdataFields', () => {
      const formdataFields: FormDataParam[] = [
        { key: 'zeta', value: '1', type: 'text' },
        { key: 'alpha', value: '2', type: 'text' },
        { key: 'mid', value: '3', type: 'text' },
      ];
      const request = createRequest({
        name: 'Upload',
        method: 'POST',
        url: 'https://api.example.com/upload',
        headers: {},
        body: undefined,
        formdataFields,
      });

      const output = serializeHttpFile([request], []);

      expect(output).toContain('# form-data body omitted (3 text fields: zeta, alpha, mid)');
    });
  });

  describe('unit: edge cases', () => {
    it('returns an empty string for empty requests and empty variables', () => {
      expect(serializeHttpFile([], [])).toBe('');
    });

    it('writes the name field verbatim including " / " folder-prefix characters', () => {
      const request = createRequest({
        name: 'Users / Create User',
        method: 'POST',
        url: 'https://api.example.com/users',
      });

      const output = serializeHttpFile([request], []);

      expect(output).toContain('### Users / Create User');
    });

    it('emits headers in insertion order', () => {
      const request = createRequest({
        name: 'Ordered',
        method: 'POST',
        url: 'https://api.example.com/users',
        headers: { 'X-First': '1', 'X-Second': '2', 'X-Third': '3' },
      });

      const output = serializeHttpFile([request], []);

      const firstIndex = output.indexOf('X-First');
      const secondIndex = output.indexOf('X-Second');
      const thirdIndex = output.indexOf('X-Third');

      expect(firstIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(thirdIndex);
    });
  });

  describe('round-trip: serialize then parseHttpFile', () => {
    it('round-trips a POST request with headers and a raw body', () => {
      const original = createRequest({
        name: 'Create User',
        method: 'POST',
        url: 'https://api.example.com/users',
        headers: { 'Content-Type': 'application/json' },
        body: '{"name":"Alice"}',
      });

      const reparsed = parseHttpFile(serializeHttpFile([original], []));

      expect(reparsed.requests).toHaveLength(1);
      const [request] = reparsed.requests;
      expect(request.method).toBe('POST');
      expect(request.url).toBe('https://api.example.com/users');
      expect(request.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(request.body).toBe('{"name":"Alice"}');
      expect(request.name).toBe('Create User');
    });

    it('round-trips a GET request with no headers or body', () => {
      const original = createRequest({
        name: 'Get Users',
        method: 'GET',
        url: 'https://api.example.com/users',
      });

      const reparsed = parseHttpFile(serializeHttpFile([original], []));

      expect(reparsed.requests).toHaveLength(1);
      const [request] = reparsed.requests;
      expect(request.method).toBe('GET');
      expect(request.url).toBe('https://api.example.com/users');
      expect(request.headers).toEqual({});
      expect(request.body).toBeUndefined();
    });

    it('round-trips multiple requests preserving method, url, headers, and body', () => {
      const originals: ParsedRequest[] = [
        createRequest({ name: 'First', method: 'GET', url: 'https://api.example.com/a' }),
        createRequest({
          name: 'Second',
          method: 'POST',
          url: 'https://api.example.com/b',
          headers: { 'Content-Type': 'text/plain' },
          body: 'hello',
        }),
        createRequest({ name: 'Third', method: 'DELETE', url: 'https://api.example.com/c' }),
      ];

      const reparsed = parseHttpFile(serializeHttpFile(originals, []));

      expect(reparsed.requests).toHaveLength(3);
      expect(reparsed.requests[0].method).toBe('GET');
      expect(reparsed.requests[0].url).toBe('https://api.example.com/a');
      expect(reparsed.requests[1].method).toBe('POST');
      expect(reparsed.requests[1].headers).toEqual({ 'Content-Type': 'text/plain' });
      expect(reparsed.requests[1].body).toBe('hello');
      expect(reparsed.requests[2].method).toBe('DELETE');
      expect(reparsed.requests[2].url).toBe('https://api.example.com/c');
    });

    it('round-trips file variables', () => {
      const variables: FileVariable[] = [
        { name: 'hostname', value: 'api.example.com' },
        { name: 'token', value: 'secret' },
      ];
      const request = createRequest({
        name: 'Get Users',
        method: 'GET',
        url: 'https://{{hostname}}/users',
      });

      const reparsed = parseHttpFile(serializeHttpFile([request], variables));

      expect(reparsed.variables).toEqual(variables);
      expect(reparsed.requests[0].url).toBe('https://{{hostname}}/users');
    });

    it('round-trips a request with variable placeholders in the body', () => {
      const original = createRequest({
        name: 'Create Post',
        method: 'POST',
        url: 'https://api.example.com/posts',
        headers: { 'Content-Type': 'application/json' },
        body: '{"title":"Post {{$timestamp}}"}',
      });

      const reparsed = parseHttpFile(serializeHttpFile([original], []));

      expect(reparsed.requests[0].body).toBe('{"title":"Post {{$timestamp}}"}');
    });

    it('round-trips a multi-line JSON body', () => {
      const body = ['{', '  "name": "Alice",', '  "age": 30', '}'].join('\n');
      const original = createRequest({
        name: 'Create User',
        method: 'POST',
        url: 'https://api.example.com/users',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      const reparsed = parseHttpFile(serializeHttpFile([original], []));

      expect(reparsed.requests[0].body).toBe(body);
    });

    it('does not emit lineNumber artifacts in the serialized output', () => {
      const original = createRequest({
        name: 'Get Users',
        method: 'GET',
        url: 'https://api.example.com/users',
        lineNumber: 42,
      });

      const output = serializeHttpFile([original], []);

      expect(output).not.toContain('lineNumber');
      expect(output).not.toContain('42');
    });

    it('re-parses form-data omission as a body comment (form-data fields excepted by design)', () => {
      const formdataFields: FormDataParam[] = [
        { key: 'username', value: 'alice', type: 'text' },
        { key: 'email', value: 'alice@example.com', type: 'text' },
      ];
      const original = createRequest({
        name: 'Upload',
        method: 'POST',
        url: 'https://api.example.com/upload',
        headers: { Authorization: 'Bearer token' },
        body: undefined,
        formdataFields,
      });

      const reparsed = parseHttpFile(serializeHttpFile([original], []));

      expect(reparsed.requests).toHaveLength(1);
      const [request] = reparsed.requests;
      expect(request.method).toBe('POST');
      expect(request.url).toBe('https://api.example.com/upload');
      expect(request.headers).toEqual({ Authorization: 'Bearer token' });
      expect(request.body).toBe('# form-data body omitted (2 text fields: username, email)');
    });
  });
});
