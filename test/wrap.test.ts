import { describe, expect, it } from 'vitest';

import { wrapLine, wrapColorizedSegments } from '../src/utils/wrap.js';

describe('wrapLine', () => {
  it('returns empty array for maxWidth <= 0', () => {
    expect(wrapLine('hello', 0)).toEqual([]);
    expect(wrapLine('hello', -1)).toEqual([]);
  });

  it('returns single space for empty string', () => {
    expect(wrapLine('', 20)).toEqual([' ']);
  });

  it('returns line unchanged if it fits', () => {
    expect(wrapLine('hello', 10)).toEqual(['hello']);
    expect(wrapLine('hello', 5)).toEqual(['hello']);
    expect(wrapLine('hello', 100)).toEqual(['hello']);
  });

  it('wraps at word boundaries and keeps the break space on the prior line', () => {
    expect(wrapLine('hello world', 8)).toEqual(['hello ', 'world']);
    expect(wrapLine('hello world', 6)).toEqual(['hello ', 'world']);
  });

  it('hard-breaks long words that exceed maxWidth', () => {
    expect(wrapLine('abcdefghij', 5)).toEqual(['abcde', 'fghij']);
    expect(wrapLine('abcdefghijklmnop', 4)).toEqual(['abcd', 'efgh', 'ijkl', 'mnop']);
  });

  it('handles mixed word and hard breaks', () => {
    expect(wrapLine('abc defghijklmnop', 8)).toEqual(['abc ', 'defghijk', 'lmnop']);
  });

  it('handles multiple consecutive spaces', () => {
    expect(wrapLine('a  b  c', 4)).toEqual(['a  ', 'b  c']);
  });
});

describe('wrapColorizedSegments', () => {
  it('returns single space for empty segments', () => {
    expect(wrapColorizedSegments([], 20)).toEqual([[{ text: ' ', color: 'white' }]]);
  });

  it('returns segments unchanged if they fit within maxWidth', () => {
    const segments = [
      { text: 'hello', color: 'green' },
      { text: ' world', color: 'white' },
    ];

    const result = wrapColorizedSegments(segments, 20);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(segments);
  });

  it('splits a single long segment at maxWidth boundary', () => {
    const segments = [{ text: 'abcdefghij', color: 'green' }];
    const result = wrapColorizedSegments(segments, 5);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([{ text: 'abcde', color: 'green' }]);
    expect(result[1]).toEqual([{ text: 'fghij', color: 'green' }]);
  });

  it('preserves colors when wrapping across segment boundaries', () => {
    const segments = [
      { text: 'hello', color: 'green' },
      { text: ' world', color: 'cyan' },
    ];

    const result = wrapColorizedSegments(segments, 8);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([
      { text: 'hello', color: 'green' },
      { text: ' ', color: 'cyan' },
    ]);
    expect(result[1]).toEqual([{ text: 'world', color: 'cyan' }]);
  });

  it('handles segment split in the middle of a colored segment', () => {
    const segments = [{ text: 'longcoloredtext', color: 'red' }];
    const result = wrapColorizedSegments(segments, 5);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual([{ text: 'longc', color: 'red' }]);
    expect(result[1]).toEqual([{ text: 'olore', color: 'red' }]);
    expect(result[2]).toEqual([{ text: 'dtext', color: 'red' }]);
  });

  it('returns empty array for maxWidth <= 0', () => {
    expect(wrapColorizedSegments([{ text: 'hello', color: 'green' }], 0)).toEqual([]);
  });
});
