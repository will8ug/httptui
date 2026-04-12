import { describe, expect, it } from 'vitest';

import { parseHttpFile } from '../src/core/parser';

describe('parseHttpFile', () => {
  it('returns no requests for an empty file', () => {
    expect(parseHttpFile('')).toEqual({
      requests: [],
      variables: [],
    });
  });

  it('returns no requests for a file with only comments', () => {
    const content = ['# comment', '// another comment', '', '  # spaced comment'].join('\n');

    expect(parseHttpFile(content)).toEqual({
      requests: [],
      variables: [],
    });
  });

  it('parses a single GET request with no headers or body', () => {
    expect(parseHttpFile('get https://example.com')).toEqual({
      requests: [
        {
          name: 'Request 1',
          method: 'GET',
          url: 'https://example.com',
          headers: {},
          body: undefined,
          lineNumber: 1,
        },
      ],
      variables: [],
    });
  });

  it('parses a single POST request with headers and a JSON body', () => {
    const content = [
      'POST https://example.com/users',
      'Content-Type: application/json',
      'Authorization: Bearer token',
      '',
      '{',
      '  "name": "Alice"',
      '}',
    ].join('\n');

    expect(parseHttpFile(content)).toEqual({
      requests: [
        {
          name: 'Request 1',
          method: 'POST',
          url: 'https://example.com/users',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token',
          },
          body: ['{', '  "name": "Alice"', '}'].join('\n'),
          lineNumber: 1,
        },
      ],
      variables: [],
    });
  });

  it('parses multiple requests separated by ###', () => {
    const content = [
      'GET https://example.com/health',
      '###',
      'DELETE https://example.com/users/123',
    ].join('\n');

    expect(parseHttpFile(content)).toEqual({
      requests: [
        {
          name: 'Request 1',
          method: 'GET',
          url: 'https://example.com/health',
          headers: {},
          body: undefined,
          lineNumber: 1,
        },
        {
          name: 'Request 2',
          method: 'DELETE',
          url: 'https://example.com/users/123',
          headers: {},
          body: undefined,
          lineNumber: 3,
        },
      ],
      variables: [],
    });
  });

  it('uses request names from ### separators', () => {
    const content = ['### My Request Name', '', 'HEAD https://example.com/status'].join('\n');

    expect(parseHttpFile(content)).toEqual({
      requests: [
        {
          name: 'My Request Name',
          method: 'HEAD',
          url: 'https://example.com/status',
          headers: {},
          body: undefined,
          lineNumber: 3,
        },
      ],
      variables: [],
    });
  });

  it('parses file variables declared outside requests', () => {
    const content = [
      '@host = example.com',
      '@ts = {{$timestamp}}',
      '',
      'GET https://{{host}}/users?ts={{ts}}',
    ].join('\n');

    expect(parseHttpFile(content)).toEqual({
      requests: [
        {
          name: 'Request 1',
          method: 'GET',
          url: 'https://{{host}}/users?ts={{ts}}',
          headers: {},
          body: undefined,
          lineNumber: 4,
        },
      ],
      variables: [
        { name: 'host', value: 'example.com' },
        { name: 'ts', value: '{{$timestamp}}' },
      ],
    });
  });

  it('skips comments between requests', () => {
    const content = [
      'GET https://example.com/one',
      '# between requests',
      '### Second Request',
      '// another comment',
      'OPTIONS https://example.com/two',
    ].join('\n');

    expect(parseHttpFile(content)).toEqual({
      requests: [
        {
          name: 'Request 1',
          method: 'GET',
          url: 'https://example.com/one',
          headers: {},
          body: undefined,
          lineNumber: 1,
        },
        {
          name: 'Second Request',
          method: 'OPTIONS',
          url: 'https://example.com/two',
          headers: {},
          body: undefined,
          lineNumber: 5,
        },
      ],
      variables: [],
    });
  });

  it('parses a request with headers but no body', () => {
    const content = [
      'PUT https://example.com/users/123',
      'Content-Type: application/json',
      'X-Trace-Id: second',
      'X-Trace-Id: final',
    ].join('\n');

    expect(parseHttpFile(content)).toEqual({
      requests: [
        {
          name: 'Request 1',
          method: 'PUT',
          url: 'https://example.com/users/123',
          headers: {
            'Content-Type': 'application/json',
            'X-Trace-Id': 'final',
          },
          body: undefined,
          lineNumber: 1,
        },
      ],
      variables: [],
    });
  });

  it('parses a request with no headers and no body', () => {
    expect(parseHttpFile('PATCH /api/items/42')).toEqual({
      requests: [
        {
          name: 'Request 1',
          method: 'PATCH',
          url: '/api/items/42',
          headers: {},
          body: undefined,
          lineNumber: 1,
        },
      ],
      variables: [],
    });
  });

  it('trims leading and trailing blank lines from the body', () => {
    const content = [
      'POST /api/items',
      'Content-Type: text/plain',
      '',
      '',
      'first line',
      '',
      'second line',
      '',
      '',
    ].join('\n');

    expect(parseHttpFile(content)).toEqual({
      requests: [
        {
          name: 'Request 1',
          method: 'POST',
          url: '/api/items',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: ['first line', '', 'second line'].join('\n'),
          lineNumber: 1,
        },
      ],
      variables: [],
    });
  });

  it('ignores a trailing ### with no following request', () => {
    const content = ['GET /api/ok', '###'].join('\n');

    expect(parseHttpFile(content)).toEqual({
      requests: [
        {
          name: 'Request 1',
          method: 'GET',
          url: '/api/ok',
          headers: {},
          body: undefined,
          lineNumber: 1,
        },
      ],
      variables: [],
    });
  });

  it('ignores an HTTP version suffix in the request line', () => {
    expect(parseHttpFile('GET /api HTTP/1.1')).toEqual({
      requests: [
        {
          name: 'Request 1',
          method: 'GET',
          url: '/api',
          headers: {},
          body: undefined,
          lineNumber: 1,
        },
      ],
      variables: [],
    });
  });

  it('parses URLs containing {{...}} expressions with spaces', () => {
    const content = [
      '@baseUrl = https://jsonplaceholder.typicode.com',
      '',
      '### Get post with dynamic ID',
      'GET {{baseUrl}}/posts/{{$randomInt 1 100}}',
    ].join('\n');

    const result = parseHttpFile(content);

    expect(result.requests).toHaveLength(1);
    expect(result.requests[0].url).toBe('{{baseUrl}}/posts/{{$randomInt 1 100}}');
    expect(result.requests[0].method).toBe('GET');
    expect(result.requests[0].name).toBe('Get post with dynamic ID');
  });

  it('parses multiple requests where some URLs contain {{...}} with spaces', () => {
    const content = [
      '### First',
      'GET https://example.com/users',
      '',
      '### Second',
      'GET {{baseUrl}}/posts/{{$randomInt 1 100}}',
      '',
      '### Third',
      'POST https://example.com/posts',
      'Content-Type: application/json',
      '',
      '{}',
    ].join('\n');

    const result = parseHttpFile(content);

    expect(result.requests).toHaveLength(3);
    expect(result.requests[0].url).toBe('https://example.com/users');
    expect(result.requests[1].url).toBe('{{baseUrl}}/posts/{{$randomInt 1 100}}');
    expect(result.requests[2].url).toBe('https://example.com/posts');
  });
});
