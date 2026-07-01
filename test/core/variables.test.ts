import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { mergeVariables, resolveVariables } from '../../src/core/variables.js';
import type { ParsedRequest } from '../../src/core/types.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('resolveVariables', () => {
  it('resolves nested file variables that reference other file variables', () => {
    const resolved = resolveVariables(
      createRequest({ url: '{{baseUrl}}/users' }),
      [
        { name: 'host', value: 'api.example.com' },
        { name: 'baseUrl', value: 'https://{{host}}/v1' },
      ],
    );

    expect(resolved.url).toBe('https://api.example.com/v1/users');
  });
  it('replaces file variables in request values', () => {
    const resolved = resolveVariables(
      createRequest({ url: 'https://{{host}}/users' }),
      [{ name: 'host', value: 'api.example.com' }],
    );

    expect(resolved.url).toBe('https://api.example.com/users');
  });

  it('resolves $timestamp to a numeric string', () => {
    const resolved = resolveVariables(
      createRequest({ url: 'https://example.com/{{$timestamp}}' }),
      [],
    );

    expect(resolved.url).toMatch(/^https:\/\/example\.com\/\d+$/);
  });

  it('resolves $guid to a UUID', () => {
    const resolved = resolveVariables(createRequest({ body: 'id={{$guid}}' }), []);
    const guid = resolved.body?.replace('id=', '');

    expect(guid).toMatch(UUID_PATTERN);
  });

  it('resolves $randomInt without arguments to a value between 0 and 1000', () => {
    const resolved = resolveVariables(createRequest({ body: '{{ $randomInt }}' }), []);
    const value = Number.parseInt(resolved.body ?? '', 10);

    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1000);
  });

  it('resolves $randomInt with an explicit range', () => {
    const resolved = resolveVariables(createRequest({ body: '{{ $randomInt 1 100 }}' }), []);
    const value = Number.parseInt(resolved.body ?? '', 10);

    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThanOrEqual(100);
  });

  it('resolves process environment variables', () => {
    const expectedHome = process.env.HOME;

    expect(expectedHome).toBeDefined();

    const resolved = resolveVariables(createRequest({ body: 'home={{$processEnv HOME}}' }), []);

    expect(resolved.body).toBe(`home=${expectedHome}`);
  });

  it('resolves nested file variables that reference system variables', () => {
    const resolved = resolveVariables(
      createRequest({ headers: { Authorization: '{{token}}' } }),
      [{ name: 'token', value: 'Bearer {{$timestamp}}' }],
    );

    expect(resolved.headers.Authorization).toMatch(/^Bearer \d+$/);
  });

  it('leaves missing file variables unchanged', () => {
    const resolved = resolveVariables(createRequest({ url: 'https://{{missing}}/users' }), []);

    expect(resolved.url).toBe('https://{{missing}}/users');
  });

  it('resolves variables in url, headers, and body', () => {
    const request = createRequest({
      url: 'https://{{host}}/users/{{$timestamp}}',
      headers: {
        Authorization: 'Bearer {{token}}',
        'X-Trace-Id': '{{$guid}}',
      },
      body: '{"env":"{{$processEnv HOME}}","host":"{{host}}"}',
    });

    const resolved = resolveVariables(request, [
      { name: 'host', value: 'api.example.com' },
      { name: 'token', value: 'secret-token' },
    ]);

    expect(resolved.url).toMatch(/^https:\/\/api\.example\.com\/users\/\d+$/);
    expect(resolved.headers.Authorization).toBe('Bearer secret-token');
    expect(resolved.headers['X-Trace-Id']).toMatch(UUID_PATTERN);
    expect(resolved.body).toBe(`{"env":"${process.env.HOME}","host":"api.example.com"}`);
  });

  it('resolves multiple variables in a single string', () => {
    const resolved = resolveVariables(
      createRequest({ body: 'https://{{host}}:{{port}}/users/{{$timestamp}}' }),
      [
        { name: 'host', value: 'localhost' },
        { name: 'port', value: '3000' },
      ],
    );

    expect(resolved.body).toMatch(/^https:\/\/localhost:3000\/users\/\d+$/);
  });

  it('parses dotenv files with comments and quoted values', () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), 'variables-test-'));
    const dotenvPath = join(tempDirectory, '.env');

    writeFileSync(
      dotenvPath,
      ['# comment', 'HOST=service.local', 'TOKEN="quoted value"', "NAME='single quoted'"]
        .join('\n'),
      'utf8',
    );

    try {
      const resolved = resolveVariables(
        createRequest({
          body: '{{ $dotenv HOST }}|{{ $dotenv TOKEN }}|{{ $dotenv NAME }}',
        }),
        [],
        tempDirectory,
      );

      expect(resolved.body).toBe('service.local|quoted value|single quoted');
    } finally {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  });

  it('resolves $dotenv from baseDir first, then falls back to cwd', () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'base-dir-'));
    const fallbackDir = mkdtempSync(join(tmpdir(), 'fallback-dir-'));

    writeFileSync(join(baseDir, '.env'), 'HOST=base.local', 'utf8');
    writeFileSync(join(fallbackDir, '.env'), 'HOST=fallback.local', 'utf8');

    const originalCwd = process.cwd();
    try {
      process.chdir(fallbackDir);
      const resolved = resolveVariables(
        createRequest({ body: '{{ $dotenv HOST }}' }),
        [],
        baseDir,
      );
      expect(resolved.body).toBe('base.local');
    } finally {
      process.chdir(originalCwd);
      rmSync(baseDir, { recursive: true, force: true });
      rmSync(fallbackDir, { recursive: true, force: true });
    }
  });

  it('leaves missing process environment variables unchanged', () => {
    const resolved = resolveVariables(
      createRequest({ body: 'value={{$processEnv NONEXISTENT_VARIABLE_FOR_TESTS}}' }),
      [],
    );

    expect(resolved.body).toBe('value={{$processEnv NONEXISTENT_VARIABLE_FOR_TESTS}}');
  });

  it('resolves variables in formdata field values', () => {
    const resolved = resolveVariables(
      createRequest({
        formdataFields: [
          { key: 'token', value: '{{apiKey}}', type: 'text' as const },
          { key: 'user', value: '{{username}}', type: 'text' as const },
        ],
      }),
      [
        { name: 'apiKey', value: 'abc123' },
        { name: 'username', value: 'alice' },
      ],
    );

    expect(resolved.formdataFields).toBeDefined();
    expect(resolved.formdataFields).toHaveLength(2);

    const fields = resolved.formdataFields;
    if (!fields) {
      throw new Error('Expected formdataFields to be defined');
    }
    expect(fields[0]).toEqual({ key: 'token', value: 'abc123', type: 'text' });
    expect(fields[1]).toEqual({ key: 'user', value: 'alice', type: 'text' });
  });

  it('does not resolve variables in formdata field keys', () => {
    const resolved = resolveVariables(
      createRequest({
        formdataFields: [
          { key: '{{fieldName}}', value: 'hello', type: 'text' as const },
        ],
      }),
      [{ name: 'fieldName', value: 'greeting' }],
    );

    expect(resolved.formdataFields).toBeDefined();

    const fields = resolved.formdataFields;
    if (!fields) {
      throw new Error('Expected formdataFields to be defined');
    }
    expect(fields[0].key).toBe('{{fieldName}}');
    expect(fields[0].value).toBe('hello');
  });
});

describe('mergeVariables', () => {
  it('returns file variables when no environment variables', () => {
    const fileVars = [{ name: 'baseUrl', value: 'https://api.local' }];
    const result = mergeVariables(fileVars);

    expect(result).toEqual(fileVars);
  });

  it('returns environment variables when no file variables', () => {
    const envVars = [{ name: 'baseUrl', value: 'https://api.dev.com' }];
    const result = mergeVariables([], envVars);

    expect(result).toEqual(envVars);
  });

  it('environment variables override file variables', () => {
    const fileVars = [
      { name: 'baseUrl', value: 'https://api.local' },
      { name: 'port', value: '8080' },
    ];
    const envVars = [{ name: 'baseUrl', value: 'https://api.dev.com' }];
    const result = mergeVariables(fileVars, envVars);

    const baseUrlVar = result.find((v) => v.name === 'baseUrl');
    const portVar = result.find((v) => v.name === 'port');

    expect(baseUrlVar?.value).toBe('https://api.dev.com');
    expect(portVar?.value).toBe('8080');
  });

  it('includes all unique variables from both sources', () => {
    const fileVars = [{ name: 'a', value: '1' }];
    const envVars = [{ name: 'b', value: '2' }];
    const result = mergeVariables(fileVars, envVars);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ name: 'a', value: '1' });
    expect(result).toContainEqual({ name: 'b', value: '2' });
  });
});

function createRequest(overrides: Partial<ParsedRequest> = {}): ParsedRequest {
  return {
    name: 'Test Request',
    method: 'GET',
    url: 'https://example.com',
    headers: {},
    body: undefined,
    lineNumber: 1,
    ...overrides,
  };
}
