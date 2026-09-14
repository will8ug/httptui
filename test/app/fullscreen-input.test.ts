import { describe, expect, it, vi } from 'vitest';
import type { Key } from 'ink';

import { handleHelpInput, handleNormalInput } from '../../src/app/input-handlers';
import type { Action, AppState } from '../../src/core/types';
import { makeKey } from '../helpers/keys';
import { createRequest } from '../helpers/requests';
import { createMockResponse } from '../helpers/responses';
import { createInitialState, reducer } from '../helpers/state';

function fullscreenState(panel: 'requests' | 'response' | 'details', overrides: Partial<AppState> = {}): AppState {
  return createInitialState({ maximizedPanel: panel, ...overrides });
}

function pressKey(state: AppState, input: string, key: Key = makeKey()): Action[] {
  return runNormalInput(state, input, key).actions;
}

function runNormalInput(
  state: AppState,
  input: string,
  key: Key = makeKey(),
  abortControllerRef: { current: AbortController | null } = { current: null },
) {
  const dispatched: Action[] = [];
  const exit = vi.fn();
  const suspend = vi.fn();
  const clipboardRunner = vi.fn(async () => '');
  const clipboardReadRunner = vi.fn(async () => '');
  handleNormalInput({
    state,
    selectedRequest: state.requests[state.selectedIndex],
    columns: 80,
    rows: 24,
    effectiveResponseHeight: 10,
    effectiveDetailMaxContent: 40,
    editorVisibleHeight: 10,
    editorContentWidth: 40,
    exit,
    suspend,
    executorConfig: { insecure: false },
    clipboardRunner,
    clipboardReadRunner,
    abortControllerRef,
    input,
    key,
    dispatch: (action) => dispatched.push(action),
  });
  return { actions: dispatched, exit, suspend, clipboardRunner, clipboardReadRunner };
}

function actionNoopState(panel: 'requests' | 'response' | 'details' = 'response'): AppState {
  return fullscreenState(panel, {
    focusedPanel: panel,
    requests: [createRequest({ name: 'Get Users', body: 'payload', isDirty: true })],
    selectedIndex: 0,
    response: createMockResponse({ body: '{"a":1}', rawBody: '{"a":1}' }),
    availableEnvironments: [
      { name: '(none)', file: null },
      { name: 'Dev', file: 'dev.json' },
    ],
    showRequestDetails: panel === 'details',
  });
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

  it('N is a no-op while the requests panel is maximized', () => {
    const actions = pressKey(fullscreenState('requests', { searchMatches: [3, 7, 11], currentMatchIndex: 0 }), 'N');

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

describe('fullscreen help and quit', () => {
  it('? while maximized dispatches TOGGLE_HELP', () => {
    const result = runNormalInput(fullscreenState('response'), '?');

    expect(result.actions).toEqual([{ type: 'TOGGLE_HELP' }]);
    expect(result.exit).not.toHaveBeenCalled();
  });

  it('Ctrl+C while maximized calls exit', () => {
    const result = runNormalInput(fullscreenState('response'), 'c', makeKey({ ctrl: true }));

    expect(result.exit).toHaveBeenCalledOnce();
    expect(result.actions).toEqual([]);
  });

  it('q while the response is maximized with active search results dismisses the search', () => {
    const result = runNormalInput(
      fullscreenState('response', { searchMatches: [3, 7], currentMatchIndex: 0, lastSearchQuery: 'needle' }),
      'q',
    );

    expect(result.actions).toEqual([{ type: 'CANCEL_SEARCH' }]);
    expect(result.exit).not.toHaveBeenCalled();
  });

  it('q without search results does not exit while maximized', () => {
    const result = runNormalInput(fullscreenState('requests'), 'q');

    expect(result.actions).toEqual([]);
    expect(result.exit).not.toHaveBeenCalled();
  });

  it('q with unsaved edits does not request discard confirmation while maximized', () => {
    const result = runNormalInput(actionNoopState('requests'), 'q');

    expect(result.actions).toEqual([]);
    expect(result.exit).not.toHaveBeenCalled();
  });

  it('q calls exit when no panel is maximized and no search is active', () => {
    const result = runNormalInput(createInitialState({ requests: [createRequest()] }), 'q');

    expect(result.exit).toHaveBeenCalledOnce();
    expect(result.actions).toEqual([]);
  });
});

describe('fullscreen search entry', () => {
  it('/ while the response is maximized enters search mode', () => {
    const actions = pressKey(fullscreenState('response'), '/');

    expect(actions).toEqual([{ type: 'ENTER_SEARCH' }]);
  });

  it('/ while the requests panel is maximized dispatches nothing', () => {
    const actions = pressKey(fullscreenState('requests'), '/');

    expect(actions).toEqual([]);
  });

  it('/ while the details panel is maximized dispatches nothing', () => {
    const actions = pressKey(fullscreenState('details'), '/');

    expect(actions).toEqual([]);
  });
});

describe('fullscreen display toggles', () => {
  it('w while the response is maximized dispatches TOGGLE_WRAP', () => {
    const actions = pressKey(fullscreenState('response'), 'w');

    expect(actions).toEqual([{ type: 'TOGGLE_WRAP' }]);
  });
});

describe('fullscreen action keys are no-ops', () => {
  const noopKeys: Array<{ label: string; input: string; key?: Key }> = [
    { label: 'Enter', input: '', key: makeKey({ return: true }) },
    { label: 'o', input: 'o' },
    { label: 'Ctrl+G', input: 'g', key: makeKey({ ctrl: true }) },
    { label: 's', input: 's' },
    { label: 'S', input: 'S' },
    { label: 'p', input: 'p' },
    { label: 'y', input: 'y' },
    { label: 'E', input: 'E' },
    { label: 'e', input: 'e' },
    { label: 'R', input: 'R' },
    { label: 'Ctrl+S', input: 's', key: makeKey({ ctrl: true }) },
    { label: 'd', input: 'd' },
  ];

  it.each(noopKeys)('$label does not run its normal-mode action while maximized', ({ label, input, key }) => {
    const result = runNormalInput(actionNoopState('response'), input, key ?? makeKey());

    if (label === 'Ctrl+G') {
      expect(result.actions).toEqual([{ type: 'JUMP_VERTICAL', direction: 'start', rows: 24 }]);
    } else {
      expect(result.actions).toEqual([]);
    }
    expect(result.exit).not.toHaveBeenCalled();
    expect(result.suspend).not.toHaveBeenCalled();
    expect(result.clipboardRunner).not.toHaveBeenCalled();
    expect(result.clipboardReadRunner).not.toHaveBeenCalled();
  });

  it.each(['v', 'r', 'w'] as const)('%s is a no-op while the requests panel is maximized', (input) => {
    const result = runNormalInput(actionNoopState('requests'), input);

    expect(result.actions).toEqual([]);
    expect(result.exit).not.toHaveBeenCalled();
    expect(result.suspend).not.toHaveBeenCalled();
  });

  it.each(['v', 'r', 'w'] as const)('%s is a no-op while the details panel is maximized', (input) => {
    const result = runNormalInput(actionNoopState('details'), input);

    expect(result.actions).toEqual([]);
    expect(result.exit).not.toHaveBeenCalled();
    expect(result.suspend).not.toHaveBeenCalled();
  });
});

describe('escape while loading', () => {
  it('Escape during an in-flight request aborts it and dispatches REQUEST_CANCEL', () => {
    const abortController = new AbortController();
    const abort = vi.spyOn(abortController, 'abort');
    const result = runNormalInput(
      createInitialState({ requests: [createRequest()], isLoading: true }),
      '',
      makeKey({ escape: true }),
      { current: abortController },
    );

    expect(result.actions).toEqual([{ type: 'REQUEST_CANCEL', warning: 'Request canceled' }]);
    expect(abort).toHaveBeenCalledOnce();
  });

  it('Escape with the help overlay open while loading closes the overlay without canceling', () => {
    const abortController = new AbortController();
    const abort = vi.spyOn(abortController, 'abort');
    const dispatched: Action[] = [];
    handleHelpInput({
      input: '',
      key: makeKey({ escape: true }),
      dispatch: (action) => dispatched.push(action),
    });

    expect(dispatched).toEqual([{ type: 'CLOSE_HELP' }]);
    expect(abort).not.toHaveBeenCalled();
  });

  it('Escape while loading in fullscreen cancels but stays fullscreen', () => {
    const abortController = new AbortController();
    const abort = vi.spyOn(abortController, 'abort');
    const result = runNormalInput(
      fullscreenState('response', { isLoading: true }),
      '',
      makeKey({ escape: true }),
      { current: abortController },
    );

    expect(result.actions).toEqual([{ type: 'REQUEST_CANCEL', warning: 'Request canceled' }]);
    expect(abort).toHaveBeenCalledOnce();
  });
});

describe('q with active search in normal mode', () => {
  it('q with active matches clears the search without exiting', () => {
    const result = runNormalInput(
      createInitialState({
        requests: [createRequest()],
        searchMatches: [3, 7],
        currentMatchIndex: 0,
        lastSearchQuery: 'needle',
      }),
      'q',
    );

    expect(result.actions).toEqual([{ type: 'CANCEL_SEARCH' }]);
    expect(result.exit).not.toHaveBeenCalled();
  });

  it('q dismisses the no-match search bar without exiting', () => {
    const result = runNormalInput(
      createInitialState({
        requests: [createRequest()],
        lastSearchQuery: 'zzz-absent',
        searchMatches: [],
      }),
      'q',
    );

    expect(result.actions).toEqual([{ type: 'CANCEL_SEARCH' }]);
    expect(result.exit).not.toHaveBeenCalled();
  });

  it('a second q after the dismissal exits the application', () => {
    const searchActive = createInitialState({
      requests: [createRequest()],
      searchMatches: [3, 7],
      currentMatchIndex: 0,
      lastSearchQuery: 'needle',
    });
    const first = runNormalInput(searchActive, 'q');

    expect(first.actions).toEqual([{ type: 'CANCEL_SEARCH' }]);
    expect(first.exit).not.toHaveBeenCalled();

    const dismissed = reducer(searchActive, { type: 'CANCEL_SEARCH' });
    const second = runNormalInput(dismissed, 'q');

    expect(second.exit).toHaveBeenCalledOnce();
    expect(second.actions).toEqual([]);
  });
});

describe('normal mode search and escape', () => {
  it('/ with a null response dispatches ENTER_SEARCH', () => {
    const actions = pressKey(createInitialState({ requests: [createRequest()], response: null }), '/');

    expect(actions).toEqual([{ type: 'ENTER_SEARCH' }]);
  });

  it('Escape is a no-op in normal mode without search state', () => {
    const result = runNormalInput(
      createInitialState({ requests: [createRequest()] }),
      '',
      makeKey({ escape: true }),
    );

    expect(result.actions).toEqual([]);
    expect(result.exit).not.toHaveBeenCalled();
  });
});
