import { describe, expect, it } from 'vitest';

import {
  applyEditOp,
  deleteBackward,
  deleteForward,
  insertText,
  lineColToOffset,
  moveDown,
  moveLeft,
  moveLineEnd,
  moveLineStart,
  moveRight,
  moveUp,
  offsetToLineCol,
} from '../../src/core/editor.js';

describe('offsetToLineCol', () => {
  it('returns {line:0, col:0} for an empty string', () => {
    expect(offsetToLineCol('', 0)).toEqual({ line: 0, col: 0 });
  });

  it('clamps negative offset to 0', () => {
    expect(offsetToLineCol('abc', -5)).toEqual({ line: 0, col: 0 });
  });

  it('clamps offset beyond text.length to the end', () => {
    expect(offsetToLineCol('abc', 99)).toEqual({ line: 0, col: 3 });
  });

  it('reports the correct position on a single line', () => {
    expect(offsetToLineCol('abc', 0)).toEqual({ line: 0, col: 0 });
    expect(offsetToLineCol('abc', 1)).toEqual({ line: 0, col: 1 });
    expect(offsetToLineCol('abc', 3)).toEqual({ line: 0, col: 3 });
  });

  it('reports line 1 col 0 at the start of the second line', () => {
    expect(offsetToLineCol('ab\ncd', 3)).toEqual({ line: 1, col: 0 });
  });

  it('reports the last character position in a two-line buffer', () => {
    expect(offsetToLineCol('ab\ncd', 5)).toEqual({ line: 1, col: 2 });
  });

  it('handles a trailing newline as a final empty line', () => {
    expect(offsetToLineCol('ab\n', 3)).toEqual({ line: 1, col: 0 });
  });

  it('handles consecutive newlines', () => {
    expect(offsetToLineCol('a\n\nb', 0)).toEqual({ line: 0, col: 0 });
    expect(offsetToLineCol('a\n\nb', 1)).toEqual({ line: 0, col: 1 });
    expect(offsetToLineCol('a\n\nb', 2)).toEqual({ line: 1, col: 0 });
    expect(offsetToLineCol('a\n\nb', 3)).toEqual({ line: 2, col: 0 });
    expect(offsetToLineCol('a\n\nb', 4)).toEqual({ line: 2, col: 1 });
  });
});

describe('lineColToOffset', () => {
  it('returns 0 for an empty string', () => {
    expect(lineColToOffset('', 0, 0)).toBe(0);
  });

  it('clamps line to the last available line', () => {
    expect(lineColToOffset('abc', 5, 0)).toBe(0);
  });

  it('clamps col to the line length', () => {
    expect(lineColToOffset('ab\ncd', 0, 99)).toBe(2);
    expect(lineColToOffset('ab\ncd', 1, 99)).toBe(5);
  });

  it('clamps negative line and col to 0', () => {
    expect(lineColToOffset('ab\ncd', -3, -2)).toBe(0);
  });

  it('computes offset at start of second line', () => {
    expect(lineColToOffset('ab\ncd', 1, 0)).toBe(3);
  });

  it('computes offset at end of second line', () => {
    expect(lineColToOffset('ab\ncd', 1, 2)).toBe(5);
  });

  it('handles trailing newline as a final empty line', () => {
    expect(lineColToOffset('ab\n', 1, 0)).toBe(3);
  });

  it('handles consecutive newlines', () => {
    expect(lineColToOffset('a\n\nb', 1, 0)).toBe(2);
    expect(lineColToOffset('a\n\nb', 2, 0)).toBe(3);
  });
});

describe('round-trip offset <-> line/col', () => {
  it('round-trips on an empty buffer', () => {
    const lc = offsetToLineCol('', 0);
    expect(lineColToOffset('', lc.line, lc.col)).toBe(0);
  });

  it('round-trips on a single-line buffer', () => {
    for (let i = 0; i <= 3; i++) {
      const lc = offsetToLineCol('abc', i);
      expect(lineColToOffset('abc', lc.line, lc.col)).toBe(i);
    }
  });

  it('round-trips on a buffer with a trailing newline', () => {
    const text = 'ab\n';
    for (let i = 0; i <= text.length; i++) {
      const lc = offsetToLineCol(text, i);
      expect(lineColToOffset(text, lc.line, lc.col)).toBe(i);
    }
  });

  it('round-trips on a buffer with consecutive newlines', () => {
    const text = 'a\n\nb';
    for (let i = 0; i <= text.length; i++) {
      const lc = offsetToLineCol(text, i);
      expect(lineColToOffset(text, lc.line, lc.col)).toBe(i);
    }
  });
});

describe('insertText', () => {
  it('inserts a character at the beginning', () => {
    expect(insertText({ text: 'abc', cursor: 0 }, 'X')).toEqual({ text: 'Xabc', cursor: 1 });
  });

  it('inserts a character mid-buffer', () => {
    expect(insertText({ text: 'abc', cursor: 1 }, 'X')).toEqual({ text: 'aXbc', cursor: 2 });
  });

  it('inserts a character at the end', () => {
    expect(insertText({ text: 'abc', cursor: 3 }, 'd')).toEqual({ text: 'abcd', cursor: 4 });
  });

  it('inserts multi-character input as a unit', () => {
    expect(insertText({ text: '', cursor: 0 }, 'hello')).toEqual({ text: 'hello', cursor: 5 });
  });

  it('inserts a newline when Enter is pressed', () => {
    expect(insertText({ text: 'abcd', cursor: 2 }, '\n')).toEqual({ text: 'ab\ncd', cursor: 3 });
  });

  it('does not mutate the original buffer', () => {
    const original = { text: 'abc', cursor: 1 };
    const result = insertText(original, 'X');
    expect(original.text).toBe('abc');
    expect(original.cursor).toBe(1);
    expect(result.text).toBe('aXbc');
  });

  it('inserts into an empty buffer', () => {
    expect(insertText({ text: '', cursor: 0 }, 'a')).toEqual({ text: 'a', cursor: 1 });
  });
});

describe('deleteBackward', () => {
  it('removes the character before the cursor', () => {
    expect(deleteBackward({ text: 'abc', cursor: 2 })).toEqual({ text: 'ac', cursor: 1 });
  });

  it('is a no-op at offset 0', () => {
    expect(deleteBackward({ text: 'abc', cursor: 0 })).toEqual({ text: 'abc', cursor: 0 });
  });

  it('deletes newline joining two lines', () => {
    expect(deleteBackward({ text: 'ab\ncd', cursor: 3 })).toEqual({ text: 'abcd', cursor: 2 });
  });

  it('removes the last character', () => {
    expect(deleteBackward({ text: 'abc', cursor: 3 })).toEqual({ text: 'ab', cursor: 2 });
  });

  it('does not mutate the original buffer', () => {
    const original = { text: 'abc', cursor: 2 };
    deleteBackward(original);
    expect(original.text).toBe('abc');
    expect(original.cursor).toBe(2);
  });
});

describe('deleteForward', () => {
  it('removes the character after the cursor', () => {
    expect(deleteForward({ text: 'abc', cursor: 1 })).toEqual({ text: 'ac', cursor: 1 });
  });

  it('is a no-op at text.length', () => {
    expect(deleteForward({ text: 'abc', cursor: 3 })).toEqual({ text: 'abc', cursor: 3 });
  });

  it('deletes newline joining two lines forward', () => {
    expect(deleteForward({ text: 'ab\ncd', cursor: 2 })).toEqual({ text: 'abcd', cursor: 2 });
  });

  it('removes the first character', () => {
    expect(deleteForward({ text: 'abc', cursor: 0 })).toEqual({ text: 'bc', cursor: 0 });
  });
});

describe('moveLeft', () => {
  it('moves back one character', () => {
    expect(moveLeft({ text: 'abc', cursor: 2 })).toEqual({ text: 'abc', cursor: 1 });
  });

  it('clamps at offset 0', () => {
    expect(moveLeft({ text: 'abc', cursor: 0 })).toEqual({ text: 'abc', cursor: 0 });
  });

  it('crosses a newline boundary', () => {
    expect(moveLeft({ text: 'ab\ncd', cursor: 3 })).toEqual({ text: 'ab\ncd', cursor: 2 });
  });
});

describe('moveRight', () => {
  it('moves forward one character', () => {
    expect(moveRight({ text: 'abc', cursor: 1 })).toEqual({ text: 'abc', cursor: 2 });
  });

  it('clamps at text.length', () => {
    expect(moveRight({ text: 'abc', cursor: 3 })).toEqual({ text: 'abc', cursor: 3 });
  });

  it('moves across a newline boundary', () => {
    expect(moveRight({ text: 'ab\ncd', cursor: 2 })).toEqual({ text: 'ab\ncd', cursor: 3 });
  });
});

describe('moveUp', () => {
  it('is a no-op on the first line', () => {
    expect(moveUp({ text: 'abc', cursor: 1 })).toEqual({ text: 'abc', cursor: 1 });
  });

  it('moves to the same column on the previous line', () => {
    expect(moveUp({ text: 'abcd\nefgh', cursor: 7 })).toEqual({ text: 'abcd\nefgh', cursor: 2 });
  });

  it('clamps column to a shorter target line', () => {
    expect(moveUp({ text: 'ab\ncdefgh', cursor: 7 })).toEqual({ text: 'ab\ncdefgh', cursor: 2 });
  })

  it('does not mutate the original buffer', () => {
    const original = { text: 'ab\ncd', cursor: 4 };
    moveUp(original);
    expect(original.cursor).toBe(4);
  });
});

describe('moveDown', () => {
  it('is a no-op on the last line', () => {
    expect(moveDown({ text: 'ab\ncd', cursor: 4 })).toEqual({ text: 'ab\ncd', cursor: 4 });
  });

  it('preserves the column on the next line', () => {
    expect(moveDown({ text: 'abcd\nefgh', cursor: 2 })).toEqual({ text: 'abcd\nefgh', cursor: 7 });
  });

  it('clamps column to a shorter target line', () => {
    expect(moveDown({ text: 'abcdef\ngh', cursor: 5 })).toEqual({ text: 'abcdef\ngh', cursor: 9 });
  });

  it('is a no-op on a single-line buffer', () => {
    expect(moveDown({ text: 'hello', cursor: 2 })).toEqual({ text: 'hello', cursor: 2 });
  });
});

describe('moveLineStart', () => {
  it('moves to column 0 of the current line', () => {
    expect(moveLineStart({ text: 'ab\ncdef', cursor: 6 })).toEqual({ text: 'ab\ncdef', cursor: 3 });
  });

  it('is a no-op when already at column 0', () => {
    expect(moveLineStart({ text: 'ab\ncd', cursor: 3 })).toEqual({ text: 'ab\ncd', cursor: 3 });
  });

  it('moves to start of first line', () => {
    expect(moveLineStart({ text: 'abc', cursor: 2 })).toEqual({ text: 'abc', cursor: 0 });
  });
});

describe('moveLineEnd', () => {
  it('moves to the end of the current line', () => {
    expect(moveLineEnd({ text: 'ab\ncdef', cursor: 4 })).toEqual({ text: 'ab\ncdef', cursor: 7 });
  });

  it('is a no-op when already at the end of the line', () => {
    expect(moveLineEnd({ text: 'ab\ncdef', cursor: 7 })).toEqual({ text: 'ab\ncdef', cursor: 7 });
  });

  it('moves to end of first line', () => {
    expect(moveLineEnd({ text: 'ab\ncd', cursor: 0 })).toEqual({ text: 'ab\ncd', cursor: 2 });
  });
});

describe('applyEditOp', () => {
  const buf = { text: 'abc', cursor: 1 };

  it('dispatches insert with an insert string', () => {
    expect(applyEditOp(buf, 'insert', 'X')).toEqual({ text: 'aXbc', cursor: 2 });
  });

  it('returns the buffer unchanged when insert op has no insert string', () => {
    expect(applyEditOp(buf, 'insert')).toEqual({ text: 'abc', cursor: 1 });
  });

  it('dispatches deleteBackward', () => {
    expect(applyEditOp({ text: 'abc', cursor: 2 }, 'deleteBackward')).toEqual({ text: 'ac', cursor: 1 });
  });

  it('dispatches deleteForward', () => {
    expect(applyEditOp(buf, 'deleteForward')).toEqual({ text: 'ac', cursor: 1 });
  });

  it('dispatches left', () => {
    expect(applyEditOp(buf, 'left')).toEqual({ text: 'abc', cursor: 0 });
  });

  it('dispatches right', () => {
    expect(applyEditOp(buf, 'right')).toEqual({ text: 'abc', cursor: 2 });
  });

  it('dispatches up as a no-op on line 0', () => {
    expect(applyEditOp(buf, 'up')).toEqual({ text: 'abc', cursor: 1 });
  });

  it('dispatches down as a no-op on last line', () => {
    expect(applyEditOp(buf, 'down')).toEqual({ text: 'abc', cursor: 1 });
  });

  it('dispatches lineStart', () => {
    expect(applyEditOp({ text: 'ab\ncd', cursor: 5 }, 'lineStart')).toEqual({ text: 'ab\ncd', cursor: 3 });
  });

  it('dispatches lineEnd', () => {
    expect(applyEditOp({ text: 'ab\ncd', cursor: 3 }, 'lineEnd')).toEqual({ text: 'ab\ncd', cursor: 5 });
  });
});
