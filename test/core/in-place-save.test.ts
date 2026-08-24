import { describe, expect, it } from 'vitest';

import { buildInPlaceContent } from '../../src/core/in-place-save';
import { parseHttpFile } from '../../src/core/parser';
import { createRequest } from '../helpers/requests';

describe('buildInPlaceContent', () => {
  it('returns the raw content unchanged when no request is marked', () => {
    const raw = '### Get Users\nGET https://api.example.com/users\n';
    const requests = parseHttpFile(raw).requests;

    const result = buildInPlaceContent(raw, requests);

    expect(result).toEqual({ ok: true, content: raw, editedCount: 0 });
  });

  it('rewrites only the marked block and leaves the others byte-identical', () => {
    const raw = [
      '### First',
      'GET https://api.example.com/a',
      '',
      '### Second',
      'POST https://api.example.com/b',
      'Content-Type: application/json',
      '',
      '{"old":"body"}',
      '',
      '### Third',
      'DELETE https://api.example.com/c',
      '',
    ].join('\n');
    const requests = parseHttpFile(raw).requests.map((r, i) =>
      i === 1 ? { ...r, isDirty: true, body: '{"new":"body"}' } : r,
    );

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.editedCount).toBe(1);
    expect(result.content).toBe(
      [
        '### First',
        'GET https://api.example.com/a',
        '',
        '### Second',
        'POST https://api.example.com/b',
        'Content-Type: application/json',
        '',
        '{"new":"body"}',
        '',
        '### Third',
        'DELETE https://api.example.com/c',
        '',
      ].join('\n'),
    );
  });

  it('splices multiple marked blocks in one pass', () => {
    const raw = [
      '### One',
      'GET https://api.example.com/1',
      '',
      '### Two',
      'GET https://api.example.com/2',
      '',
      '### Three',
      'GET https://api.example.com/3',
      '',
    ].join('\n');
    const requests = parseHttpFile(raw).requests.map((r, i) =>
      i === 0 || i === 2 ? { ...r, isDirty: true, body: `new-${i}` } : r,
    );

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.editedCount).toBe(2);
    expect(result.content).toContain('### One\nGET https://api.example.com/1\n\nnew-0');
    expect(result.content).toContain('### Two\nGET https://api.example.com/2');
    expect(result.content).toContain('### Three\nGET https://api.example.com/3\n\nnew-2');
  });

  it('preserves an unmarked form-data block byte-identical', () => {
    const raw = [
      '### Upload',
      'POST https://api.example.com/upload',
      'Authorization: Bearer token',
      '',
      '# form-data body omitted (1 text fields: username)',
      '',
      '### Get Users',
      'GET https://api.example.com/users',
      '',
    ].join('\n');
    const requests = parseHttpFile(raw).requests.map((r, i) =>
      i === 1 ? { ...r, isDirty: true, body: 'new body' } : r,
    );

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content).toContain(
      '### Upload\nPOST https://api.example.com/upload\nAuthorization: Bearer token\n\n# form-data body omitted (1 text fields: username)',
    );
  });

  it('preserves comments, variables, and blank lines outside a block', () => {
    const raw = [
      '@host = api.example.com',
      '',
      '# top comment',
      '',
      '### First',
      'GET https://api.example.com/a',
      '',
      '### Second',
      'GET https://api.example.com/b',
      '',
      '# trailing comment',
      '',
    ].join('\n');
    const requests = parseHttpFile(raw).requests.map((r, i) =>
      i === 0 ? { ...r, isDirty: true, body: 'new' } : r,
    );

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content).toContain('@host = api.example.com');
    expect(result.content).toContain('# top comment');
    expect(result.content).toContain('# trailing comment');
    expect(result.content).toContain('### First\nGET https://api.example.com/a\n\nnew');
  });

  it('rewrites a marked request even when its body equals the original (tombstone)', () => {
    const raw = [
      '### Get Users',
      'GET https://api.example.com/users',
      'Content-Type:application/json',
      '',
      'original body',
      '',
    ].join('\n');
    const requests = parseHttpFile(raw).requests.map((r) => ({ ...r, isDirty: true }));

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.editedCount).toBe(1);
    expect(result.content).toContain(
      '### Get Users\nGET https://api.example.com/users\nContent-Type: application/json\n\noriginal body',
    );
  });

  it('preserves an unmarked request whose on-disk block changed externally', () => {
    const original = [
      '### First',
      'GET https://api.example.com/a',
      '',
      '### Second',
      'GET https://api.example.com/b',
      '',
    ].join('\n');
    const externallyChanged = [
      '### First',
      'GET https://api.example.com/a',
      '',
      'externally changed body',
      '',
      '### Second',
      'GET https://api.example.com/b',
      '',
    ].join('\n');
    const requests = parseHttpFile(original).requests.map((r, i) =>
      i === 1 ? { ...r, isDirty: true, body: 'new body' } : r,
    );

    const result = buildInPlaceContent(externallyChanged, requests);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content).toContain('### First\nGET https://api.example.com/a\n\nexternally changed body');
    expect(result.content).toContain('### Second\nGET https://api.example.com/b\n\nnew body');
  });

  it('refuses when the re-parse yields a different request count', () => {
    const raw = [
      '### First',
      'GET https://api.example.com/a',
      '',
      '### Second',
      'GET https://api.example.com/b',
      '',
    ].join('\n');
    const requests = parseHttpFile(raw).requests.slice(0, 1);

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('changed on disk');
  });

  it('gains a ### Request 1 separator for a separator-less first request', () => {
    const raw = 'GET https://api.example.com/users\n';
    const requests = parseHttpFile(raw).requests.map((r) => ({ ...r, isDirty: true }));

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content).toBe('### Request 1\nGET https://api.example.com/users\n');
  });

  it('preserves comments above a separator-less first request', () => {
    const raw = '# top comment\nGET https://api.example.com/users\n';
    const requests = parseHttpFile(raw).requests.map((r) => ({ ...r, isDirty: true }));

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content).toBe('# top comment\n### Request 1\nGET https://api.example.com/users\n');
  });

  it('normalizes a bare ### separator to ### Request N', () => {
    const raw = [
      '###',
      'GET https://api.example.com/a',
      '',
      '###',
      'GET https://api.example.com/b',
      '',
    ].join('\n');
    const requests = parseHttpFile(raw).requests.map((r, i) => (i === 0 ? { ...r, isDirty: true } : r));

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content).toContain('### Request 1\nGET https://api.example.com/a');
    expect(result.content).toContain('###\nGET https://api.example.com/b');
  });

  it('preserves a named ### separator', () => {
    const raw = '### Get Users\nGET https://api.example.com/users\n';
    const requests = parseHttpFile(raw).requests.map((r) => ({ ...r, isDirty: true, body: 'new' }));

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content).toContain('### Get Users\nGET https://api.example.com/users');
  });

  it('normalizes header spacing inside a rewritten block', () => {
    const raw = [
      '### Get Users',
      'GET https://api.example.com/users',
      'Content-Type:application/json',
      '',
      '{}',
      '',
    ].join('\n');
    const requests = parseHttpFile(raw).requests.map((r) => ({ ...r, isDirty: true }));

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content).toContain('Content-Type: application/json');
    expect(result.content).not.toContain('Content-Type:application/json');
  });

  it('preserves the inter-block blank gap', () => {
    const raw = [
      '### First',
      'GET https://api.example.com/a',
      '',
      '',
      '',
      '### Second',
      'GET https://api.example.com/b',
      '',
    ].join('\n');
    const requests = parseHttpFile(raw).requests.map((r, i) => (i === 0 ? { ...r, isDirty: true } : r));

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content).toContain('GET https://api.example.com/a\n\n\n\n### Second');
  });

  it('keeps CRLF line endings when the source uses CRLF', () => {
    const raw = '### Get Users\r\nGET https://api.example.com/users\r\n\r\n{"old":"body"}\r\n';
    const requests = parseHttpFile(raw).requests.map((r) => ({ ...r, isDirty: true, body: '{"new":"body"}' }));

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content).toContain('### Get Users\r\nGET https://api.example.com/users\r\n\r\n{"new":"body"}');
    expect(result.content).not.toMatch(/[^\r]\n/);
  });

  it('keeps LF line endings when the source uses LF', () => {
    const raw = '### Get Users\nGET https://api.example.com/users\n\n{"old":"body"}\n';
    const requests = parseHttpFile(raw).requests.map((r) => ({ ...r, isDirty: true, body: '{"new":"body"}' }));

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content).not.toContain('\r');
    expect(result.content).toContain('### Get Users\nGET https://api.example.com/users\n\n{"new":"body"}');
  });

  it('preserves the EOF trailing-newline convention', () => {
    const rawWithNewline = '### Get Users\nGET https://api.example.com/users\n';
    const withNewline = buildInPlaceContent(
      rawWithNewline,
      parseHttpFile(rawWithNewline).requests.map((r) => ({ ...r, isDirty: true })),
    );
    expect(withNewline.ok).toBe(true);
    if (withNewline.ok) {
      expect(withNewline.content.endsWith('\n')).toBe(true);
    }

    const rawWithoutNewline = '### Get Users\nGET https://api.example.com/users';
    const withoutNewline = buildInPlaceContent(
      rawWithoutNewline,
      parseHttpFile(rawWithoutNewline).requests.map((r) => ({ ...r, isDirty: true })),
    );
    expect(withoutNewline.ok).toBe(true);
    if (withoutNewline.ok) {
      expect(withoutNewline.content.endsWith('\n')).toBe(false);
    }
  });

  it('refuses when a marked body contains a separator line', () => {
    const raw = [
      '### Get Users',
      'GET https://api.example.com/users',
      '',
      '{"old":"body"}',
      '',
    ].join('\n');
    const requests = parseHttpFile(raw).requests.map((r) => ({
      ...r,
      isDirty: true,
      body: '### oops\n{"new":"body"}',
    }));

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('###');
  });

  it('refuses when a marked header serializes to a separator line', () => {
    const raw = [
      '### Get Users',
      'GET https://api.example.com/users',
      'Accept: application/json',
      '',
    ].join('\n');
    const requests = parseHttpFile(raw).requests.map((r) => ({
      ...r,
      isDirty: true,
      headers: { 'X-Custom': 'value\n### oops' },
    }));

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('header');
    expect(result.error).toContain('###');
  });

  it('saves a marked request with normal headers', () => {
    const raw = [
      '### Get Users',
      'GET https://api.example.com/users',
      'Accept: application/json',
      '',
    ].join('\n');
    const requests = parseHttpFile(raw).requests.map((r) => ({
      ...r,
      isDirty: true,
      headers: { Accept: 'text/html', 'X-Custom': 'plain value' },
    }));

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content).toContain('Accept: text/html');
    expect(result.content).toContain('X-Custom: plain value');
  });

  it('appends a pasted request as a new block after existing content', () => {
    const raw = '### Get Users\nGET https://api.example.com/users\n';
    const pasted = createRequest({
      name: 'POST /login',
      method: 'POST',
      url: 'https://api.example.com/login',
      headers: { 'Content-Type': 'application/json' },
      body: '{"user":"alice"}',
      lineNumber: 0,
      isDirty: true,
    });
    const requests = [...parseHttpFile(raw).requests, pasted];

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.editedCount).toBe(1);
    expect(result.content).toBe(
      '### Get Users\nGET https://api.example.com/users\n\n### POST /login\nPOST https://api.example.com/login\nContent-Type: application/json\n\n{"user":"alice"}\n',
    );
    expect(result.content.startsWith(raw)).toBe(true);

    const reparsed = parseHttpFile(result.content);
    expect(reparsed.requests).toHaveLength(2);
    expect(reparsed.requests[1]).toMatchObject({
      method: 'POST',
      url: 'https://api.example.com/login',
      body: '{"user":"alice"}',
    });
  });

  it('appends multiple pasted requests as blank-line-separated blocks', () => {
    const raw = '### Get Users\nGET https://api.example.com/users\n';
    const pastedPosts = [
      createRequest({
        name: 'POST /login',
        method: 'POST',
        url: 'https://api.example.com/login',
        body: 'a=1',
        lineNumber: 0,
        isDirty: true,
      }),
      createRequest({
        name: 'DELETE /login',
        method: 'DELETE',
        url: 'https://api.example.com/login',
        lineNumber: 0,
        isDirty: true,
      }),
    ];
    const requests = [...parseHttpFile(raw).requests, ...pastedPosts];

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.editedCount).toBe(2);
    expect(result.content).toBe(
      '### Get Users\nGET https://api.example.com/users\n\n### POST /login\nPOST https://api.example.com/login\n\na=1\n\n### DELETE /login\nDELETE https://api.example.com/login\n',
    );
  });

  it('rewrites an edited block and appends a pasted request in one pass', () => {
    const raw = [
      '### First',
      'GET https://api.example.com/a',
      '',
      '### Second',
      'GET https://api.example.com/b',
      '',
    ].join('\n');
    const [first, second] = parseHttpFile(raw).requests;
    const pasted = createRequest({
      name: 'PUT /c',
      method: 'PUT',
      url: 'https://api.example.com/c',
      lineNumber: 0,
      isDirty: true,
    });

    const result = buildInPlaceContent(raw, [
      { ...first, isDirty: true, body: 'edited-body' },
      second,
      pasted,
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.editedCount).toBe(2);
    expect(result.content).toBe(
      '### First\nGET https://api.example.com/a\n\nedited-body\n\n### Second\nGET https://api.example.com/b\n\n### PUT /c\nPUT https://api.example.com/c\n',
    );
  });

  it('keeps CRLF line endings when appending to a CRLF file', () => {
    const raw = '### Get Users\r\nGET https://api.example.com/users\r\n';
    const pasted = createRequest({
      name: 'POST /login',
      method: 'POST',
      url: 'https://api.example.com/login',
      headers: { 'Content-Type': 'application/json' },
      body: '{"user":"alice"}',
      lineNumber: 0,
      isDirty: true,
    });
    const requests = [...parseHttpFile(raw).requests, pasted];

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content).toBe(
      '### Get Users\r\nGET https://api.example.com/users\r\n\r\n### POST /login\r\nPOST https://api.example.com/login\r\nContent-Type: application/json\r\n\r\n{"user":"alice"}\r\n',
    );
    expect(result.content.startsWith(raw)).toBe(true);
    expect(result.content).not.toMatch(/[^\r]\n/);
  });

  it('inserts the blank-line separation when the source lacks a trailing newline', () => {
    const raw = '### Get Users\nGET https://api.example.com/users';
    const pasted = createRequest({
      name: 'POST /login',
      method: 'POST',
      url: 'https://api.example.com/login',
      lineNumber: 0,
      isDirty: true,
    });
    const requests = [...parseHttpFile(raw).requests, pasted];

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content).toBe(
      '### Get Users\nGET https://api.example.com/users\n\n### POST /login\nPOST https://api.example.com/login\n',
    );
  });

  it('absorbs trailing blank lines into a single blank line before the appended block', () => {
    const raw = '### Get Users\nGET https://api.example.com/users\n\n\n';
    const pasted = createRequest({
      name: 'POST /login',
      method: 'POST',
      url: 'https://api.example.com/login',
      lineNumber: 0,
      isDirty: true,
    });
    const requests = [...parseHttpFile(raw).requests, pasted];

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content).toBe(
      '### Get Users\nGET https://api.example.com/users\n\n### POST /login\nPOST https://api.example.com/login\n',
    );
  });

  it('appends to an empty file without a leading blank line', () => {
    const pasted = createRequest({
      name: 'POST /login',
      method: 'POST',
      url: 'https://api.example.com/login',
      lineNumber: 0,
      isDirty: true,
    });

    const result = buildInPlaceContent('', [pasted]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content).toBe('### POST /login\nPOST https://api.example.com/login\n');
  });

  it('appends a pasted form-data request with the omission comment', () => {
    const raw = '### Get Users\nGET https://api.example.com/users\n';
    const pasted = createRequest({
      name: 'POST /upload',
      method: 'POST',
      url: 'https://api.example.com/upload',
      headers: { 'Content-Type': 'multipart/form-data; boundary=x' },
      body: undefined,
      formdataFields: [{ key: 'username', value: 'alice', type: 'text' }],
      lineNumber: 0,
      isDirty: true,
    });
    const requests = [...parseHttpFile(raw).requests, pasted];

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.content).toContain(
      '\n\n### POST /upload\nPOST https://api.example.com/upload\n\n# form-data body omitted (1 text fields: username)\n',
    );
    expect(result.content).not.toContain('multipart/form-data');
  });

  it('ignores a surplus request that is not dirty', () => {
    const raw = '### Get Users\nGET https://api.example.com/users\n';
    const surplus = createRequest({
      name: 'POST /login',
      method: 'POST',
      url: 'https://api.example.com/login',
      lineNumber: 0,
      isDirty: false,
    });
    const requests = [...parseHttpFile(raw).requests, surplus];

    const result = buildInPlaceContent(raw, requests);

    expect(result).toEqual({ ok: true, content: raw, editedCount: 0 });
  });

  it('refuses when an appended body contains a separator line', () => {
    const raw = '### Get Users\nGET https://api.example.com/users\n';
    const pasted = createRequest({
      name: 'POST /login',
      method: 'POST',
      url: 'https://api.example.com/login',
      body: '### oops',
      lineNumber: 0,
      isDirty: true,
    });
    const requests = [...parseHttpFile(raw).requests, pasted];

    const result = buildInPlaceContent(raw, requests);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('###');
  });
});
