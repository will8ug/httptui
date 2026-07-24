import { describe, expect, it } from 'vitest';

import { expandTabs, truncateText } from '../../src/utils/text.js';

describe('truncateText', () => {
  it('returns empty string for maxWidth <= 0', () => {
    expect(truncateText('hello', 0)).toBe('');
    expect(truncateText('hello', -1)).toBe('');
    expect(truncateText('', 0)).toBe('');
  });

  it('returns the value unchanged when it already fits', () => {
    expect(truncateText('hi', 5)).toBe('hi');
    expect(truncateText('hello', 5)).toBe('hello');
    expect(truncateText('', 5)).toBe('');
  });

  it('returns just the ellipsis when maxWidth is 1 and value overflows', () => {
    expect(truncateText('ab', 1)).toBe('…');
    expect(truncateText('hello', 1)).toBe('…');
  });

  it('truncates overflowing values with an ellipsis to fit exactly maxWidth columns', () => {
    expect(truncateText('hello', 4)).toBe('hel…');
    expect(truncateText('hello world', 6)).toBe('hello…');
    expect(truncateText('abcdef', 2)).toBe('a…');
  });
});

describe('expandTabs', () => {
  it('passes through text without tabs unchanged', () => {
    expect(expandTabs('hello')).toBe('hello');
  });

  it('expands a leading tab at column 0 to tabWidth spaces', () => {
    expect(expandTabs('\thello')).toBe('        hello');
  });

  it('expands multiple leading tabs to tabWidth spaces each', () => {
    expect(expandTabs('\t\t\thello')).toBe('                        hello');
  });

  it('expands a tab at column 7 to 1 space (next multiple of 8)', () => {
    expect(expandTabs('1234567\thello')).toBe('1234567 hello');
  });

  it('expands a tab at column 8 to 8 spaces (next multiple of 8)', () => {
    expect(expandTabs('12345678\thello')).toBe('12345678        hello');
  });

  it('expands a mid-line tab to the correct number of spaces', () => {
    expect(expandTabs('ab\tcd')).toBe('ab      cd');
  });

  it('expands consecutive tabs correctly', () => {
    expect(expandTabs('\t\t')).toBe('                ');
  });

  it('returns empty string unchanged', () => {
    expect(expandTabs('')).toBe('');
  });

  it('expands mixed tabs and spaces correctly', () => {
    expect(expandTabs(' \t ')).toBe('         ');
  });

  it('uses custom tabWidth when provided', () => {
    expect(expandTabs('\t', 4)).toBe('    ');
  });
});
