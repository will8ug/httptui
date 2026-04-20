import { describe, expect, it } from 'vitest';

import { isJsonString } from '../src/utils/colors.js';

describe('isJsonString', () => {
  it('returns false for empty and whitespace-only strings', () => {
    expect(isJsonString('')).toBe(false);
    expect(isJsonString('   ')).toBe(false);
    expect(isJsonString('\n\t')).toBe(false);
  });

  it('returns false for invalid JSON', () => {
    expect(isJsonString('not json')).toBe(false);
    expect(isJsonString('{ unclosed')).toBe(false);
    expect(isJsonString("{'single': 'quotes'}")).toBe(false);
    expect(isJsonString('undefined')).toBe(false);
  });

  it('returns true for valid JSON objects', () => {
    expect(isJsonString('{}')).toBe(true);
    expect(isJsonString('{"name":"John"}')).toBe(true);
    expect(isJsonString('{"nested":{"a":1}}')).toBe(true);
  });

  it('returns true for valid JSON arrays', () => {
    expect(isJsonString('[]')).toBe(true);
    expect(isJsonString('[1,2,3]')).toBe(true);
    expect(isJsonString('[{"a":1},{"a":2}]')).toBe(true);
  });

  it('returns true for valid JSON primitives', () => {
    expect(isJsonString('42')).toBe(true);
    expect(isJsonString('-3.14')).toBe(true);
    expect(isJsonString('"hello"')).toBe(true);
    expect(isJsonString('true')).toBe(true);
    expect(isJsonString('false')).toBe(true);
    expect(isJsonString('null')).toBe(true);
  });
});
