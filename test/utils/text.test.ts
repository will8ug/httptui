import { describe, expect, it } from 'vitest';

import {
  cellWidth,
  clampSegmentsToWidth,
  expandTabs,
  firstGraphemeCluster,
  shiftText,
  sliceByCells,
  sliceFromCells,
  truncateText,
} from '../../src/utils/text.js';

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

  it('reserves cells for the ellipsis when truncating CJK text', () => {
    expect(truncateText('日本語日本語', 5)).toBe('日本…');
    expect(cellWidth(truncateText('日本語日本語', 5))).toBe(5);
  });

  it('excludes a wide char that straddles the ellipsis budget', () => {
    expect(truncateText('abc日本', 4)).toBe('abc…');
    expect(truncateText('abc日本', 5)).toBe('abc…');
    expect(cellWidth(truncateText('abc日本', 5))).toBe(4);
  });
});

describe('shiftText', () => {
  it('snaps the offset forward to a grapheme boundary for CJK text', () => {
    expect(shiftText('日本語', 1, 10)).toBe('本語');
  });

  it('returns a single space when the offset is beyond the text', () => {
    expect(shiftText('日本語', 10, 10)).toBe(' ');
  });

  it('delegates to truncateText for a non-positive offset', () => {
    expect(shiftText('日本語日本語', 0, 5)).toBe(truncateText('日本語日本語', 5));
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

  it('lands tab stops on visual columns for CJK text', () => {
    expect(expandTabs('日\tX')).toBe('日      X');
    expect(cellWidth(expandTabs('日\tX'))).toBe(9);
  });
});

describe('cellWidth', () => {
  it('measures CJK characters as two cells each', () => {
    expect(cellWidth('日本語')).toBe(6);
    expect(cellWidth('日')).toBe(2);
  });

  it('measures ASCII as one cell per code unit', () => {
    expect(cellWidth('hello world')).toBe(11);
  });

  it('measures empty string as zero cells', () => {
    expect(cellWidth('')).toBe(0);
  });
});

describe('sliceByCells', () => {
  it('returns the longest CJK prefix within the budget', () => {
    expect(sliceByCells('日本語', 6)).toBe('日本語');
    expect(sliceByCells('日本語', 4)).toBe('日本');
  });

  it('excludes a wide character that straddles the budget', () => {
    expect(sliceByCells('日本語', 3)).toBe('日');
  });

  it('returns empty string for a non-positive budget', () => {
    expect(sliceByCells('日本語', 0)).toBe('');
    expect(sliceByCells('日本語', -1)).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(sliceByCells('', 5)).toBe('');
  });

  it('never splits a ZWJ family emoji', () => {
    expect(cellWidth('👨‍👩‍👧‍👦')).toBe(2);
    expect(sliceByCells('a👨‍👩‍👧‍👦b', 2)).toBe('a');
    expect(sliceByCells('a👨‍👩‍👧‍👦b', 3)).toBe('a👨‍👩‍👧‍👦');
    expect(sliceByCells('a👨‍👩‍👧‍👦b', 4)).toBe('a👨‍👩‍👧‍👦b');
  });

  it('never splits a regional-indicator flag', () => {
    expect(cellWidth('🇺🇸')).toBe(2);
    expect(sliceByCells('🇺🇸', 2)).toBe('🇺🇸');
    expect(sliceByCells('x🇺🇸', 1)).toBe('x');
    expect(sliceByCells('🇺🇸', 1)).toBe('');
  });

  it('never splits a base and combining mark', () => {
    expect(cellWidth('e\u0301')).toBe(1);
    expect(sliceByCells('e\u0301', 1)).toBe('e\u0301');
    expect(sliceByCells('e\u0301x', 1)).toBe('e\u0301');
  });
});

describe('sliceFromCells', () => {
  it('slices from a CJK boundary at-or-after the offset', () => {
    expect(sliceFromCells('日本語', 4, 10)).toBe('語');
    expect(sliceFromCells('日本語', 2, 2)).toBe('本');
  });

  it('snaps the offset forward so a straddling wide char is kept whole', () => {
    expect(sliceFromCells('日本語', 3, 10)).toBe('語');
  });

  it('returns empty string when the text has fewer cells than the offset', () => {
    expect(sliceFromCells('日本語', 10, 2)).toBe('');
  });
});

describe('firstGraphemeCluster', () => {
  it('returns the first grapheme cluster of the text', () => {
    expect(firstGraphemeCluster('日本語')).toBe('日');
    expect(firstGraphemeCluster('a👨‍👩‍👧‍👦b')).toBe('a');
    expect(firstGraphemeCluster('e\u0301x')).toBe('e\u0301');
  });

  it('returns an empty string for empty input', () => {
    expect(firstGraphemeCluster('')).toBe('');
  });
});

describe('clampSegmentsToWidth', () => {
  it('keeps whole segments and truncates the final segment at a cluster boundary', () => {
    const segments = [
      { text: 'ab', color: 'red' },
      { text: '日本', color: 'blue' },
    ];

    expect(clampSegmentsToWidth(segments, 4)).toEqual([
      { text: 'ab', color: 'red' },
      { text: '日', color: 'blue' },
    ]);
  });

  it('drops a straddling wide char from the final segment', () => {
    const segments = [
      { text: 'ab', color: 'red' },
      { text: '日本', color: 'blue' },
    ];

    expect(clampSegmentsToWidth(segments, 3)).toEqual([{ text: 'ab', color: 'red' }]);
  });

  it('returns the input unchanged when it fits within the budget', () => {
    const segments = [
      { text: 'ab', color: 'red' },
      { text: '日本', color: 'blue' },
    ];

    expect(clampSegmentsToWidth(segments, 6)).toBe(segments);
    expect(clampSegmentsToWidth(segments, 10)).toBe(segments);
  });

  it('returns an empty array when the first segment alone exceeds the budget', () => {
    expect(clampSegmentsToWidth([{ text: '日本', color: 'red' }], 1)).toEqual([]);
  });
});

describe('ASCII identity', () => {
  it('matches code-unit behavior for ASCII-only text', () => {
    const text = 'hello world';

    expect(cellWidth(text)).toBe(text.length);

    for (const n of [0, 1, 5, 11, 20]) {
      expect(sliceByCells(text, n)).toBe(text.slice(0, n));
    }

    for (const off of [0, 1, 6]) {
      for (const n of [0, 1, 5, 20]) {
        expect(sliceFromCells(text, off, n)).toBe(text.slice(off, off + n));
      }
    }
  });
});
