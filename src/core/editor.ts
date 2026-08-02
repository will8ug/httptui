import type { EditOp } from './types.js';

export interface EditorBuffer {
  text: string;
  cursor: number;
}

export function offsetToLineCol(text: string, offset: number): { line: number; col: number } {
  const clamped = Math.max(0, Math.min(offset, text.length));
  const linesBefore = text.slice(0, clamped).split('\n');
  return { line: linesBefore.length - 1, col: linesBefore[linesBefore.length - 1].length };
}

export function lineColToOffset(text: string, line: number, col: number): number {
  const lines = text.split('\n');
  const clampedLine = Math.max(0, Math.min(line, lines.length - 1));
  const clampedCol = Math.max(0, Math.min(col, lines[clampedLine].length));
  let offset = 0;
  for (let i = 0; i < clampedLine; i++) {
    offset += lines[i].length + 1;
  }
  return offset + clampedCol;
}

export function insertText(buffer: EditorBuffer, insert: string): EditorBuffer {
  const { text, cursor } = buffer;
  return {
    text: text.slice(0, cursor) + insert + text.slice(cursor),
    cursor: cursor + insert.length,
  };
}

export function deleteBackward(buffer: EditorBuffer): EditorBuffer {
  if (buffer.cursor === 0) {
    return { text: buffer.text, cursor: 0 };
  }
  return {
    text: buffer.text.slice(0, buffer.cursor - 1) + buffer.text.slice(buffer.cursor),
    cursor: buffer.cursor - 1,
  };
}

export function deleteForward(buffer: EditorBuffer): EditorBuffer {
  if (buffer.cursor >= buffer.text.length) {
    return { text: buffer.text, cursor: buffer.cursor };
  }
  return {
    text: buffer.text.slice(0, buffer.cursor) + buffer.text.slice(buffer.cursor + 1),
    cursor: buffer.cursor,
  };
}

export function moveLeft(buffer: EditorBuffer): EditorBuffer {
  return { text: buffer.text, cursor: Math.max(0, buffer.cursor - 1) };
}

export function moveRight(buffer: EditorBuffer): EditorBuffer {
  return { text: buffer.text, cursor: Math.min(buffer.text.length, buffer.cursor + 1) };
}

export function moveUp(buffer: EditorBuffer): EditorBuffer {
  const { line, col } = offsetToLineCol(buffer.text, buffer.cursor);
  if (line === 0) {
    return { text: buffer.text, cursor: buffer.cursor };
  }
  return { text: buffer.text, cursor: lineColToOffset(buffer.text, line - 1, col) };
}

export function moveDown(buffer: EditorBuffer): EditorBuffer {
  const { line, col } = offsetToLineCol(buffer.text, buffer.cursor);
  const lines = buffer.text.split('\n');
  if (line >= lines.length - 1) {
    return { text: buffer.text, cursor: buffer.cursor };
  }
  return { text: buffer.text, cursor: lineColToOffset(buffer.text, line + 1, col) };
}

export function moveLineStart(buffer: EditorBuffer): EditorBuffer {
  const { line } = offsetToLineCol(buffer.text, buffer.cursor);
  return { text: buffer.text, cursor: lineColToOffset(buffer.text, line, 0) };
}

export function moveLineEnd(buffer: EditorBuffer): EditorBuffer {
  const { line } = offsetToLineCol(buffer.text, buffer.cursor);
  const lines = buffer.text.split('\n');
  return { text: buffer.text, cursor: lineColToOffset(buffer.text, line, lines[line].length) };
}

export function applyEditOp(buffer: EditorBuffer, op: EditOp, insert?: string): EditorBuffer {
  switch (op) {
    case 'insert':
      return insert !== undefined ? insertText(buffer, insert) : buffer;
    case 'deleteBackward':
      return deleteBackward(buffer);
    case 'deleteForward':
      return deleteForward(buffer);
    case 'left':
      return moveLeft(buffer);
    case 'right':
      return moveRight(buffer);
    case 'up':
      return moveUp(buffer);
    case 'down':
      return moveDown(buffer);
    case 'lineStart':
      return moveLineStart(buffer);
    case 'lineEnd':
      return moveLineEnd(buffer);
  }
}
