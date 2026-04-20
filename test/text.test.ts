import { describe, expect, it } from 'vitest';

import { truncateText } from '../src/utils/text.js';

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
