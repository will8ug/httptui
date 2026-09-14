import { describe, expect, it, vi } from 'vitest';
import type { Key } from 'ink';

import { handleNormalInput } from '../../src/app/input-handlers';
import type { Action, AppState } from '../../src/core/types';
import { makeKey } from '../helpers/keys';
import { createRequest } from '../helpers/requests';
import { createMockResponse } from '../helpers/responses';
import { createInitialState } from '../helpers/state';

function normalState(overrides: Partial<AppState> = {}): AppState {
  return createInitialState({ maximizedPanel: null, ...overrides });
}

function pressKey(state: AppState, input: string, key: Key = makeKey()): Action[] {
  const dispatched: Action[] = [];
  handleNormalInput({
    state,
    selectedRequest: state.requests[state.selectedIndex],
    columns: 80,
    rows: 24,
    effectiveResponseHeight: 10,
    effectiveDetailMaxContent: 40,
    editorVisibleHeight: 10,
    editorContentWidth: 40,
    exit: vi.fn(),
    suspend: vi.fn(),
    executorConfig: { insecure: false },
    clipboardRunner: vi.fn(async () => ''),
    clipboardReadRunner: vi.fn(async () => ''),
    abortControllerRef: { current: null },
    input,
    key,
    dispatch: (action) => dispatched.push(action),
  });
  return dispatched;
}

describe('normal-mode vertical navigation', () => {
  it('j moves the selection down when the requests panel is focused', () => {
    const actions = pressKey(normalState({ focusedPanel: 'requests' }), 'j');

    expect(actions).toEqual([{ type: 'MOVE_SELECTION', direction: 'down', rows: 24 }]);
  });

  it('k moves the selection up when the requests panel is focused', () => {
    const actions = pressKey(normalState({ focusedPanel: 'requests' }), 'k');

    expect(actions).toEqual([{ type: 'MOVE_SELECTION', direction: 'up', rows: 24 }]);
  });

  it('down arrow moves the selection down when the requests panel is focused', () => {
    const actions = pressKey(normalState({ focusedPanel: 'requests' }), '', makeKey({ downArrow: true }));

    expect(actions).toEqual([{ type: 'MOVE_SELECTION', direction: 'down', rows: 24 }]);
  });

  it('up arrow moves the selection up when the requests panel is focused', () => {
    const actions = pressKey(normalState({ focusedPanel: 'requests' }), '', makeKey({ upArrow: true }));

    expect(actions).toEqual([{ type: 'MOVE_SELECTION', direction: 'up', rows: 24 }]);
  });

  it('j, k, and arrow keys scroll when the details panel is focused', () => {
    const state = normalState({ focusedPanel: 'details', requests: [createRequest()] });

    expect(pressKey(state, 'j')).toEqual([{ type: 'SCROLL', direction: 'down', maxOffset: expect.any(Number) }]);
    expect(pressKey(state, 'k')).toEqual([{ type: 'SCROLL', direction: 'up', maxOffset: expect.any(Number) }]);
    expect(pressKey(state, '', makeKey({ downArrow: true }))).toEqual([
      { type: 'SCROLL', direction: 'down', maxOffset: expect.any(Number) },
    ]);
    expect(pressKey(state, '', makeKey({ upArrow: true }))).toEqual([
      { type: 'SCROLL', direction: 'up', maxOffset: expect.any(Number) },
    ]);
  });

  it('j, k, and arrow keys scroll when the response panel is focused', () => {
    const state = normalState({
      focusedPanel: 'response',
      response: createMockResponse({ body: 'line-1\nline-2\nline-3' }),
    });

    expect(pressKey(state, 'j')).toEqual([{ type: 'SCROLL', direction: 'down', maxOffset: expect.any(Number) }]);
    expect(pressKey(state, 'k')).toEqual([{ type: 'SCROLL', direction: 'up', maxOffset: expect.any(Number) }]);
    expect(pressKey(state, '', makeKey({ downArrow: true }))).toEqual([
      { type: 'SCROLL', direction: 'down', maxOffset: expect.any(Number) },
    ]);
    expect(pressKey(state, '', makeKey({ upArrow: true }))).toEqual([
      { type: 'SCROLL', direction: 'up', maxOffset: expect.any(Number) },
    ]);
  });
});

describe('normal-mode horizontal navigation', () => {
  it('h dispatches SCROLL_HORIZONTAL to the left', () => {
    const actions = pressKey(normalState(), 'h');

    expect(actions).toEqual([{ type: 'SCROLL_HORIZONTAL', direction: 'left', columns: 80 }]);
  });

  it('l dispatches SCROLL_HORIZONTAL to the right', () => {
    const actions = pressKey(normalState(), 'l');

    expect(actions).toEqual([{ type: 'SCROLL_HORIZONTAL', direction: 'right', columns: 80 }]);
  });

  it('arrow keys scroll horizontally the same as h and l', () => {
    const leftActions = pressKey(normalState(), '', makeKey({ leftArrow: true }));
    const rightActions = pressKey(normalState(), '', makeKey({ rightArrow: true }));

    expect(leftActions).toEqual([{ type: 'SCROLL_HORIZONTAL', direction: 'left', columns: 80 }]);
    expect(rightActions).toEqual([{ type: 'SCROLL_HORIZONTAL', direction: 'right', columns: 80 }]);
  });
});

describe('normal-mode edge jumps', () => {
  it('g dispatches JUMP_VERTICAL to the start with the row count', () => {
    const actions = pressKey(normalState(), 'g');

    expect(actions).toEqual([{ type: 'JUMP_VERTICAL', direction: 'start', rows: 24 }]);
  });

  it('G dispatches JUMP_VERTICAL to the end with a computed max offset', () => {
    const state = normalState({
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

  it('0 dispatches JUMP_HORIZONTAL to the start with the column count', () => {
    const actions = pressKey(normalState(), '0');

    expect(actions).toEqual([{ type: 'JUMP_HORIZONTAL', direction: 'start', columns: 80 }]);
  });

  it('$ dispatches JUMP_HORIZONTAL to the end with the column count', () => {
    const actions = pressKey(normalState(), '$');

    expect(actions).toEqual([{ type: 'JUMP_HORIZONTAL', direction: 'end', columns: 80 }]);
  });
});

describe('normal-mode panel and display toggles', () => {
  it('Tab dispatches SWITCH_PANEL', () => {
    const actions = pressKey(normalState(), '', makeKey({ tab: true }));

    expect(actions).toEqual([{ type: 'SWITCH_PANEL' }]);
  });

  it('d dispatches TOGGLE_REQUEST_DETAILS', () => {
    const actions = pressKey(normalState(), 'd');

    expect(actions).toEqual([{ type: 'TOGGLE_REQUEST_DETAILS' }]);
  });

  it('? dispatches TOGGLE_HELP', () => {
    const actions = pressKey(normalState(), '?');

    expect(actions).toEqual([{ type: 'TOGGLE_HELP' }]);
  });

  it('v dispatches TOGGLE_VERBOSE', () => {
    const actions = pressKey(normalState(), 'v');

    expect(actions).toEqual([{ type: 'TOGGLE_VERBOSE' }]);
  });

  it('w dispatches TOGGLE_WRAP', () => {
    const actions = pressKey(normalState(), 'w');

    expect(actions).toEqual([{ type: 'TOGGLE_WRAP' }]);
  });

  it('r dispatches TOGGLE_RAW', () => {
    const actions = pressKey(normalState(), 'r');

    expect(actions).toEqual([{ type: 'TOGGLE_RAW' }]);
  });
});
