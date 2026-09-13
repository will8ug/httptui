import { describe, expect, it, vi } from 'vitest';
import type { Key } from 'ink';

import { handleNormalInput } from '../../src/app/input-handlers';
import type { Action, AppState } from '../../src/core/types';
import { createMockResponse } from '../helpers/responses';
import { createInitialState } from '../helpers/state';

function makeKey(overrides: Partial<Key> = {}): Key {
  return {
    upArrow: false,
    downArrow: false,
    leftArrow: false,
    rightArrow: false,
    pageUp: false,
    pageDown: false,
    home: false,
    end: false,
    return: false,
    escape: false,
    ctrl: false,
    shift: false,
    tab: false,
    backspace: false,
    delete: false,
    meta: false,
    super: false,
    hyper: false,
    capsLock: false,
    numLock: false,
    ...overrides,
  };
}

function fullscreenState(panel: 'requests' | 'response' | 'details', overrides: Partial<AppState> = {}): AppState {
  return createInitialState({ maximizedPanel: panel, ...overrides });
}

function pressKey(state: AppState, input: string, key: Key = makeKey()): Action[] {
  const dispatched: Action[] = [];
  handleNormalInput({
    state,
    selectedRequest: undefined,
    columns: 80,
    rows: 24,
    effectiveResponseHeight: 10,
    effectiveDetailMaxContent: 40,
    editorVisibleHeight: 10,
    editorContentWidth: 40,
    exit: () => {},
    suspend: vi.fn(),
    executorConfig: { insecure: false },
    clipboardRunner: undefined,
    clipboardReadRunner: undefined,
    abortControllerRef: { current: null },
    input,
    key,
    dispatch: (action) => dispatched.push(action),
  });
  return dispatched;
}

describe('fullscreen vertical jumps', () => {
  it('g dispatches JUMP_VERTICAL to the start with the row count', () => {
    const actions = pressKey(fullscreenState('response'), 'g');

    expect(actions).toEqual([{ type: 'JUMP_VERTICAL', direction: 'start', rows: 24 }]);
  });

  it('G dispatches JUMP_VERTICAL to the end with a computed max offset while the response is maximized', () => {
    const state = fullscreenState('response', {
      focusedPanel: 'response',
      response: createMockResponse({
        body: Array.from({ length: 60 }, (_, i) => `row-${i}`).join('\n'),
      }),
    });

    const actions = pressKey(state, 'G');

    expect(actions).toEqual([
      { type: 'JUMP_VERTICAL', direction: 'end', rows: 24, maxOffset: expect.any(Number) },
    ]);
  });

  it('G while the requests panel is maximized passes no max offset', () => {
    const actions = pressKey(fullscreenState('requests'), 'G');

    expect(actions).toEqual([{ type: 'JUMP_VERTICAL', direction: 'end', rows: 24 }]);
  });
});

describe('fullscreen horizontal navigation', () => {
  it('0 dispatches JUMP_HORIZONTAL to the start with the column count', () => {
    const actions = pressKey(fullscreenState('response'), '0');

    expect(actions).toEqual([{ type: 'JUMP_HORIZONTAL', direction: 'start', columns: 80 }]);
  });

  it('$ dispatches JUMP_HORIZONTAL to the end with the column count', () => {
    const actions = pressKey(fullscreenState('response'), '$');

    expect(actions).toEqual([{ type: 'JUMP_HORIZONTAL', direction: 'end', columns: 80 }]);
  });

  it('h dispatches SCROLL_HORIZONTAL to the left', () => {
    const actions = pressKey(fullscreenState('response'), 'h');

    expect(actions).toEqual([{ type: 'SCROLL_HORIZONTAL', direction: 'left', columns: 80 }]);
  });

  it('l dispatches SCROLL_HORIZONTAL to the right', () => {
    const actions = pressKey(fullscreenState('response'), 'l');

    expect(actions).toEqual([{ type: 'SCROLL_HORIZONTAL', direction: 'right', columns: 80 }]);
  });

  it('arrow keys scroll horizontally the same as h and l', () => {
    const leftActions = pressKey(fullscreenState('response'), '', makeKey({ leftArrow: true }));
    const rightActions = pressKey(fullscreenState('response'), '', makeKey({ rightArrow: true }));

    expect(leftActions).toEqual([{ type: 'SCROLL_HORIZONTAL', direction: 'left', columns: 80 }]);
    expect(rightActions).toEqual([{ type: 'SCROLL_HORIZONTAL', direction: 'right', columns: 80 }]);
  });
});

describe('fullscreen match navigation', () => {
  const matchState = (overrides: Partial<AppState> = {}): AppState =>
    fullscreenState('response', {
      searchMatches: [3, 7, 11],
      currentMatchIndex: 0,
      lastSearchQuery: 'needle',
      ...overrides,
    });

  it('n dispatches NEXT_MATCH with the next raw match index', () => {
    const actions = pressKey(matchState(), 'n');

    expect(actions).toEqual([{ type: 'NEXT_MATCH', targetVisualIndex: 7 }]);
  });

  it('N dispatches PREV_MATCH wrapping from the first to the last match', () => {
    const actions = pressKey(matchState(), 'N');

    expect(actions).toEqual([{ type: 'PREV_MATCH', targetVisualIndex: 11 }]);
  });

  it('n wraps from the last match back to the first', () => {
    const actions = pressKey(matchState({ currentMatchIndex: 2 }), 'n');

    expect(actions).toEqual([{ type: 'NEXT_MATCH', targetVisualIndex: 3 }]);
  });

  it('n is a no-op while the requests panel is maximized', () => {
    const actions = pressKey(fullscreenState('requests', { searchMatches: [3, 7, 11], currentMatchIndex: 0 }), 'n');

    expect(actions).toEqual([]);
  });

  it('n is a no-op when there are no matches', () => {
    const actions = pressKey(fullscreenState('response'), 'n');

    expect(actions).toEqual([]);
  });
});

describe('fullscreen panel-dependent vertical keys', () => {
  it('j moves the selection down while the requests panel is maximized', () => {
    const actions = pressKey(fullscreenState('requests'), 'j');

    expect(actions).toEqual([{ type: 'MOVE_SELECTION', direction: 'down', rows: 24 }]);
  });

  it('k moves the selection up while the requests panel is maximized', () => {
    const actions = pressKey(fullscreenState('requests'), 'k');

    expect(actions).toEqual([{ type: 'MOVE_SELECTION', direction: 'up', rows: 24 }]);
  });

  it('down arrow moves the selection while the requests panel is maximized', () => {
    const actions = pressKey(fullscreenState('requests'), '', makeKey({ downArrow: true }));

    expect(actions).toEqual([{ type: 'MOVE_SELECTION', direction: 'down', rows: 24 }]);
  });

  it('j scrolls the response down while the response is maximized', () => {
    const actions = pressKey(fullscreenState('response'), 'j');

    expect(actions).toEqual([{ type: 'SCROLL', direction: 'down' }]);
  });
});
