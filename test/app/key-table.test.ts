import { describe, expect, it } from 'vitest';

import { normalizeKeyName, resolveKeyAction } from '../../src/app/key-table';
import type { AppState, FocusedPanel } from '../../src/core/types';
import { makeKey } from '../helpers/keys';
import { createInitialState } from '../helpers/state';

function tableState(maximizedPanel: FocusedPanel | null): AppState {
  return createInitialState(
    maximizedPanel === null ? {} : { maximizedPanel, focusedPanel: maximizedPanel },
  );
}

describe('prototype keys never resolve', () => {
  it("'constructor' returns null", () => {
    expect(resolveKeyAction('constructor', tableState(null))).toBeNull();
  });

  it("'__proto__' returns null", () => {
    expect(resolveKeyAction('__proto__', tableState(null))).toBeNull();
  });
});

describe('multi-character input never resolves', () => {
  it("pasted input collapses to '' so it matches nothing", () => {
    const keyName = normalizeKeyName('hello', makeKey());

    expect(keyName).toBe('');
    expect(resolveKeyAction(keyName, tableState(null))).toBeNull();
  });

  it('a multi-character name returns null even when normalization is bypassed', () => {
    expect(resolveKeyAction('hello', tableState(null))).toBeNull();
  });
});

describe('arrow flag normalization', () => {
  it("the left arrow flag and 'h' both reach the 'left' entry", () => {
    expect(normalizeKeyName('', makeKey({ leftArrow: true }))).toBe('left');
    expect(normalizeKeyName('h', makeKey())).toBe('left');
    expect(resolveKeyAction('left', tableState(null))).toEqual({
      type: 'SCROLL_HORIZONTAL',
      direction: 'left',
    });
  });

  it("the right arrow flag and 'l' both reach the 'right' entry", () => {
    expect(normalizeKeyName('', makeKey({ rightArrow: true }))).toBe('right');
    expect(normalizeKeyName('l', makeKey())).toBe('right');
    expect(resolveKeyAction('right', tableState(null))).toEqual({
      type: 'SCROLL_HORIZONTAL',
      direction: 'right',
    });
  });

  it("the up arrow flag and 'k' both collapse to 'up', which the table does not bind", () => {
    expect(normalizeKeyName('', makeKey({ upArrow: true }))).toBe('up');
    expect(normalizeKeyName('k', makeKey())).toBe('up');
    expect(resolveKeyAction('up', tableState(null))).toBeNull();
  });

  it("the down arrow flag and 'j' both collapse to 'down', which the table does not bind", () => {
    expect(normalizeKeyName('', makeKey({ downArrow: true }))).toBe('down');
    expect(normalizeKeyName('j', makeKey())).toBe('down');
    expect(resolveKeyAction('down', tableState(null))).toBeNull();
  });
});

describe('gated entries', () => {
  it("'w' resolves TOGGLE_WRAP when no panel is maximized", () => {
    expect(resolveKeyAction('w', tableState(null))).toEqual({ type: 'TOGGLE_WRAP' });
  });

  it("'w' resolves TOGGLE_WRAP when the response panel is maximized", () => {
    expect(resolveKeyAction('w', tableState('response'))).toEqual({ type: 'TOGGLE_WRAP' });
  });

  it("'w' returns null when the requests panel is maximized", () => {
    expect(resolveKeyAction('w', tableState('requests'))).toBeNull();
  });

  it("'w' returns null when the details panel is maximized", () => {
    expect(resolveKeyAction('w', tableState('details'))).toBeNull();
  });
});

describe('ungated entries', () => {
  it("'g' resolves to the vertical start jump regardless of the maximized panel", () => {
    expect(resolveKeyAction('g', tableState(null))).toEqual({
      type: 'JUMP_VERTICAL',
      direction: 'start',
    });
    expect(resolveKeyAction('g', tableState('requests'))).toEqual({
      type: 'JUMP_VERTICAL',
      direction: 'start',
    });
    expect(resolveKeyAction('g', tableState('response'))).toEqual({
      type: 'JUMP_VERTICAL',
      direction: 'start',
    });
    expect(resolveKeyAction('g', tableState('details'))).toEqual({
      type: 'JUMP_VERTICAL',
      direction: 'start',
    });
  });
});
