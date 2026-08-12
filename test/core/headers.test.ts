import { describe, expect, it } from 'vitest';

import { headersToText, parseHeadersText } from '../../src/core/headers';

describe('headersToText', () => {
  it('serializes one Name: Value line per entry in insertion order', () => {
    const headers = { Accept: 'application/json', 'X-Custom': 'v1' };

    expect(headersToText(headers)).toBe('Accept: application/json\nX-Custom: v1');
  });

  it('returns an empty string for an empty record', () => {
    expect(headersToText({})).toBe('');
  });
});

describe('parseHeadersText', () => {
  it('round-trips headersToText output back to the original record', () => {
    const headers = { Accept: 'application/json', 'X-Custom': 'v1' };

    expect(parseHeadersText(headersToText(headers))).toEqual({
      ok: true,
      headers,
    });
  });

  it('splits only on the first colon so values may contain colons', () => {
    expect(parseHeadersText('Authorization: Basic dXNlcjpwYXNz')).toEqual({
      ok: true,
      headers: { Authorization: 'Basic dXNlcjpwYXNz' },
    });
  });

  it('trims whitespace around the key and the value', () => {
    expect(parseHeadersText('  X-Custom :  some value  ')).toEqual({
      ok: true,
      headers: { 'X-Custom': 'some value' },
    });
  });

  it('skips blank and whitespace-only lines', () => {
    expect(parseHeadersText('Accept: application/json\n\n   \nX-Custom: v1')).toEqual({
      ok: true,
      headers: { Accept: 'application/json', 'X-Custom': 'v1' },
    });
  });

  it('resolves case-insensitive duplicates last-wins, keeping the later casing', () => {
    expect(parseHeadersText('accept: a\nAccept: b')).toEqual({
      ok: true,
      headers: { Accept: 'b' },
    });
  });

  it('reports a missing colon with the 1-based line number', () => {
    expect(parseHeadersText('Accept: application/json\nNoColonHere')).toEqual({
      ok: false,
      error: 'missing a ":"',
      line: 2,
    });
  });

  it('counts skipped blank lines toward the error line number', () => {
    expect(parseHeadersText('Accept: application/json\n\n   \nBadLine')).toEqual({
      ok: false,
      error: 'missing a ":"',
      line: 4,
    });
  });

  it('reports an empty header name with the 1-based line number', () => {
    expect(parseHeadersText('Accept: application/json\n: value')).toEqual({
      ok: false,
      error: 'missing a header name',
      line: 2,
    });
  });

  it('returns an empty record for empty input', () => {
    expect(parseHeadersText('')).toEqual({ ok: true, headers: {} });
  });
});
