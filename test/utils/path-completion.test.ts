import { describe, expect, it } from 'vitest';

import {
  completePath,
  type PathEntry,
} from '../../src/utils/path-completion.js';

const file = (name: string): PathEntry => ({ name, isDirectory: false });
const dir = (name: string): PathEntry => ({ name, isDirectory: true });

function createListDir(listing: Record<string, PathEntry[]>) {
  const calls: string[] = [];
  const listDir = (directory: string): PathEntry[] => {
    calls.push(directory);
    return listing[directory] ?? [];
  };
  return { listDir, calls };
}

describe('completePath', () => {
  it('completes a single matching file in full with the cursor at the end', () => {
    const { listDir } = createListDir({ '': [file('users.http')] });

    expect(completePath({ text: 'use', cursor: 3 }, listDir)).toEqual({
      text: 'users.http',
      cursor: 10,
      candidates: null,
    });
  });

  it('appends a trailing separator to a single matching directory', () => {
    const { listDir } = createListDir({ '': [dir('admin')] });

    expect(completePath({ text: 'a', cursor: 1 }, listDir)).toEqual({
      text: 'admin/',
      cursor: 6,
      candidates: null,
    });
  });

  it('chains completion into a completed directory', () => {
    const { listDir, calls } = createListDir({
      'admin/': [file('routes.http')],
    });

    expect(completePath({ text: 'admin/', cursor: 6 }, listDir)).toEqual({
      text: 'admin/routes.http',
      cursor: 17,
      candidates: null,
    });
    expect(calls).toEqual(['admin/']);
  });

  it('extends multiple matches to their longest common prefix without listing candidates', () => {
    const { listDir } = createListDir({
      '': [file('users.http'), file('users-staging.http')],
    });

    expect(completePath({ text: 'u', cursor: 1 }, listDir)).toEqual({
      text: 'users',
      cursor: 5,
      candidates: null,
    });
  });

  it('lists sorted candidates when the longest common prefix makes no progress', () => {
    const { listDir } = createListDir({
      '': [file('users.http'), file('users-staging.http')],
    });

    expect(completePath({ text: 'users', cursor: 5 }, listDir)).toEqual({
      text: 'users',
      cursor: 5,
      candidates: ['users-staging.http', 'users.http'],
    });
  });

  it('marks directory candidates with a trailing separator', () => {
    const { listDir } = createListDir({
      '': [dir('admin'), dir('assets'), file('api.http')],
    });

    expect(completePath({ text: 'a', cursor: 1 }, listDir)).toEqual({
      text: 'a',
      cursor: 1,
      candidates: ['admin/', 'api.http', 'assets/'],
    });
  });

  it('leaves the input unchanged with no candidates when nothing matches', () => {
    const { listDir } = createListDir({ '': [file('users.http')] });

    expect(completePath({ text: 'zzz', cursor: 3 }, listDir)).toEqual({
      text: 'zzz',
      cursor: 3,
      candidates: null,
    });
  });

  it('excludes dotfiles from an empty partial name', () => {
    const { listDir } = createListDir({ 'admin/': [file('.env')] });

    expect(completePath({ text: 'admin/', cursor: 6 }, listDir)).toEqual({
      text: 'admin/',
      cursor: 6,
      candidates: null,
    });
  });

  it('completes dotfiles when the partial name starts with a dot', () => {
    const { listDir } = createListDir({ 'admin/': [file('.env')] });

    expect(completePath({ text: 'admin/.', cursor: 7 }, listDir)).toEqual({
      text: 'admin/.env',
      cursor: 10,
      candidates: null,
    });
  });

  it('completes only the text before the cursor and preserves the text after it', () => {
    const { listDir } = createListDir({
      '': [file('users.http'), file('users-staging.http')],
    });

    expect(completePath({ text: 'usersX', cursor: 2 }, listDir)).toEqual({
      text: 'usersersX',
      cursor: 5,
      candidates: null,
    });
  });

  it('preserves text after the cursor when completing a nested directory match', () => {
    const { listDir } = createListDir({ 'admin/': [dir('routes')] });

    expect(completePath({ text: 'admin/rX', cursor: 7 }, listDir)).toEqual({
      text: 'admin/routes/X',
      cursor: 13,
      candidates: null,
    });
  });
});
