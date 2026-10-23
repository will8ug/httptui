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

    expect(actions).toEqual([{ type: 'MOVE_SELECTION', direction: 'down' }]);
  });

  it('k moves the selection up when the requests panel is focused', () => {
    const actions = pressKey(normalState({ focusedPanel: 'requests' }), 'k');

    expect(actions).toEqual([{ type: 'MOVE_SELECTION', direction: 'up' }]);
  });

  it('down arrow moves the selection down when the requests panel is focused', () => {
    const actions = pressKey(normalState({ focusedPanel: 'requests' }), '', makeKey({ downArrow: true }));

    expect(actions).toEqual([{ type: 'MOVE_SELECTION', direction: 'down' }]);
  });

  it('up arrow moves the selection up when the requests panel is focused', () => {
    const actions = pressKey(normalState({ focusedPanel: 'requests' }), '', makeKey({ upArrow: true }));

    expect(actions).toEqual([{ type: 'MOVE_SELECTION', direction: 'up' }]);
  });

  it('j, k, and arrow keys scroll when the details panel is focused', () => {
    const state = normalState({ focusedPanel: 'details', requests: [createRequest()] });

    expect(pressKey(state, 'j')).toEqual([{ type: 'SCROLL', direction: 'down' }]);
    expect(pressKey(state, 'k')).toEqual([{ type: 'SCROLL', direction: 'up' }]);
    expect(pressKey(state, '', makeKey({ downArrow: true }))).toEqual([
      { type: 'SCROLL', direction: 'down' },
    ]);
    expect(pressKey(state, '', makeKey({ upArrow: true }))).toEqual([
      { type: 'SCROLL', direction: 'up' },
    ]);
  });

  it('j, k, and arrow keys scroll when the response panel is focused', () => {
    const state = normalState({
      focusedPanel: 'response',
      response: createMockResponse({ body: 'line-1\nline-2\nline-3' }),
    });

    expect(pressKey(state, 'j')).toEqual([{ type: 'SCROLL', direction: 'down' }]);
    expect(pressKey(state, 'k')).toEqual([{ type: 'SCROLL', direction: 'up' }]);
    expect(pressKey(state, '', makeKey({ downArrow: true }))).toEqual([
      { type: 'SCROLL', direction: 'down' },
    ]);
    expect(pressKey(state, '', makeKey({ upArrow: true }))).toEqual([
      { type: 'SCROLL', direction: 'up' },
    ]);
  });
});

describe('normal-mode horizontal navigation', () => {
  it('h dispatches SCROLL_HORIZONTAL to the left', () => {
    const actions = pressKey(normalState(), 'h');

    expect(actions).toEqual([{ type: 'SCROLL_HORIZONTAL', direction: 'left' }]);
  });

  it('l dispatches SCROLL_HORIZONTAL to the right', () => {
    const actions = pressKey(normalState(), 'l');

    expect(actions).toEqual([{ type: 'SCROLL_HORIZONTAL', direction: 'right' }]);
  });

  it('arrow keys scroll horizontally the same as h and l', () => {
    const leftActions = pressKey(normalState(), '', makeKey({ leftArrow: true }));
    const rightActions = pressKey(normalState(), '', makeKey({ rightArrow: true }));

    expect(leftActions).toEqual([{ type: 'SCROLL_HORIZONTAL', direction: 'left' }]);
    expect(rightActions).toEqual([{ type: 'SCROLL_HORIZONTAL', direction: 'right' }]);
  });
});

describe('normal-mode edge jumps', () => {
  it('g dispatches JUMP_VERTICAL to the start', () => {
    const actions = pressKey(normalState(), 'g');

    expect(actions).toEqual([{ type: 'JUMP_VERTICAL', direction: 'start' }]);
  });

  it('G dispatches JUMP_VERTICAL to the end', () => {
    const actions = pressKey(normalState(), 'G');

    expect(actions).toEqual([{ type: 'JUMP_VERTICAL', direction: 'end' }]);
  });

  it('0 dispatches JUMP_HORIZONTAL to the start', () => {
    const actions = pressKey(normalState(), '0');

    expect(actions).toEqual([{ type: 'JUMP_HORIZONTAL', direction: 'start' }]);
  });

  it('$ dispatches JUMP_HORIZONTAL to the end', () => {
    const actions = pressKey(normalState(), '$');

    expect(actions).toEqual([{ type: 'JUMP_HORIZONTAL', direction: 'end' }]);
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
