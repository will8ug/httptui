import type { Key } from 'ink';

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

export interface EditOpIntent {
  op: EditOp;
  insert?: string;
}

const TEXT_OPS: ReadonlySet<EditOp> = new Set<EditOp>(['insert', 'deleteBackward', 'deleteForward']);

/** True for ops that edit buffer text; false for cursor-only motions. */
export function mutatesText(op: EditOp): boolean {
  return TEXT_OPS.has(op);
}

/**
 * The one key-event-to-edit-op mapping behind every text input. Contract:
 * callers intercept their own mode-control keys (Escape, Enter, Tab where it
 * completes or switches, Ctrl shortcuts) before consulting it; Enter and
 * Escape are rejected here so their raw input bytes can never become insert
 * text. `up`/`down` are emitted for multi-line callers; single-line callers
 * skip them.
 */
export function resolveEditOp(input: string, key: Key): EditOpIntent | null {
  if (key.return || key.escape) {
    return null;
  }
  if (key.home || (key.ctrl && input === 'a')) {
    return { op: 'lineStart' };
  }
  if (key.end || (key.ctrl && input === 'e')) {
    return { op: 'lineEnd' };
  }
  if (key.backspace) {
    return { op: 'deleteBackward' };
  }
  if (key.delete) {
    return { op: 'deleteForward' };
  }
  if (key.leftArrow) {
    return { op: 'left' };
  }
  if (key.rightArrow) {
    return { op: 'right' };
  }
  if (key.upArrow) {
    return { op: 'up' };
  }
  if (key.downArrow) {
    return { op: 'down' };
  }
  if (input && !key.ctrl && !key.meta) {
    return { op: 'insert', insert: input };
  }
  return null;
}
