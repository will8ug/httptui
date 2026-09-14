import { describe, expect, it } from 'vitest';

import { deriveResponseSaveFilename } from '../../src/core/response-save';

describe('deriveResponseSaveFilename', () => {
  it('appends .json when the body parses as JSON', () => {
    expect(deriveResponseSaveFilename('Get Users', '{"a":1}')).toBe('Get Users.json');
  });

  it('appends .txt when the body is not JSON', () => {
    expect(deriveResponseSaveFilename('Get Users', '<html/>')).toBe('Get Users.txt');
  });

  it('replaces every slash in a Postman-style folder name with a hyphen', () => {
    expect(deriveResponseSaveFilename('Auth / Login', '<html/>')).toBe('Auth - Login.txt');
  });

  it('chooses .json for a JSON body regardless of the request name', () => {
    expect(deriveResponseSaveFilename('Auth / Login', '{"a":1}')).toBe('Auth - Login.json');
  });

  it('replaces multiple slashes in the request name', () => {
    expect(deriveResponseSaveFilename('A / B / C', 'plain text')).toBe('A - B - C.txt');
  });

  it('treats an empty body as non-JSON', () => {
    expect(deriveResponseSaveFilename('Get Users', '')).toBe('Get Users.txt');
  });
});
