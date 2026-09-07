import { describe, expect, it } from 'vitest';

import { wrapLine, wrapColorizedSegments } from '../../src/utils/wrap.js';

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

  it('wraps CJK by display cells', () => {
    expect(wrapLine('日本語日本語', 4)).toEqual(['日本', '語日', '本語']);
  });

  it('budgets cells with round-down when a wide char would straddle the boundary', () => {
    expect(wrapLine('日本語', 3)).toEqual(['日', '本', '語']);
  });

  it('breaks long spaceless CJK at grapheme boundaries', () => {
    expect(wrapLine(`a${'日'.repeat(10)}`, 5)).toEqual([
      'a日日',
      '日日',
      '日日',
      '日日',
      '日日',
    ]);
  });

  it('prefers word boundaries over hard cell breaks in mixed text', () => {
    expect(wrapLine('abc 日本語 def', 7)).toEqual(['abc ', '日本語 ', 'def']);
  });

  it('keeps a straddling wide char whole, moving it to the next line', () => {
    expect(wrapLine('a日本語', 4)).toEqual(['a日', '本語']);
  });

  it('emits a cluster wider than maxWidth whole instead of hanging', () => {
    expect(wrapLine('日', 1)).toEqual(['日']);
    expect(wrapLine('a日b', 1)).toEqual(['a', '日', 'b']);
    expect(wrapLine('👨‍👩‍👧‍👦x', 1)).toEqual(['👨‍👩‍👧‍👦', 'x']);
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

  it('splits colorized CJK at cell boundaries, preserving colors per line', () => {
    const segments = [
      { text: '日本語テスト', color: 'red' },
      { text: 'です', color: 'blue' },
    ];

    expect(wrapColorizedSegments(segments, 6)).toEqual([
      [{ text: '日本語', color: 'red' }],
      [{ text: 'テスト', color: 'red' }],
      [{ text: 'です', color: 'blue' }],
    ]);
  });

  it('never splits an emoji ZWJ cluster across visual lines', () => {
    const segments = [{ text: 'a👨‍👩‍👧‍👦b', color: 'green' }];

    expect(wrapColorizedSegments(segments, 3)).toEqual([
      [{ text: 'a👨‍👩‍👧‍👦', color: 'green' }],
      [{ text: 'b', color: 'green' }],
    ]);
  });

  it('never splits a grapheme cluster mid-segment', () => {
    const segments = [
      { text: '日本語', color: 'green' },
      { text: '👨‍👩‍👧‍👦', color: 'cyan' },
      { text: 'テスト', color: 'red' },
    ];
    const clusters = (text: string): string[] =>
      Array.from(new Intl.Segmenter().segment(text), (part) => part.segment);

    const result = wrapColorizedSegments(segments, 3);

    const emittedClusters = result.flat().flatMap((segment) => clusters(segment.text));

    expect(emittedClusters).toEqual(clusters('日本語👨‍👩‍👧‍👦テスト'));
  });
});
