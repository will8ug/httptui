import { describe, expect, it, vi } from 'vitest';
import type { Key } from 'ink';

import { handleHelpInput } from '../../src/app/input-handlers';
import type { Action, AppState } from '../../src/core/types';
import { panelState, populatedPanelState, pressKey, runNormalInput } from '../helpers/dispatch';
import { makeKey } from '../helpers/keys';
import { createRequest } from '../helpers/requests';
import { createInitialState, reducer } from '../helpers/state';

describe('fullscreen match navigation', () => {
  const matchState = (overrides: Partial<AppState> = {}): AppState =>
    panelState('response', {
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
    const actions = pressKey(panelState('requests', { searchMatches: [3, 7, 11], currentMatchIndex: 0 }), 'n');

    expect(actions).toEqual([]);
  });

  it('N is a no-op while the requests panel is maximized', () => {
    const actions = pressKey(panelState('requests', { searchMatches: [3, 7, 11], currentMatchIndex: 0 }), 'N');

    expect(actions).toEqual([]);
  });

  it('n is a no-op when there are no matches', () => {
    const actions = pressKey(panelState('response'), 'n');

    expect(actions).toEqual([]);
  });
});

describe('fullscreen panel-dependent vertical keys', () => {
  it('j moves the selection down while the requests panel is maximized', () => {
    const actions = pressKey(panelState('requests'), 'j');

    expect(actions).toEqual([{ type: 'MOVE_SELECTION', direction: 'down' }]);
  });

  it('k moves the selection up while the requests panel is maximized', () => {
    const actions = pressKey(panelState('requests'), 'k');

    expect(actions).toEqual([{ type: 'MOVE_SELECTION', direction: 'up' }]);
  });

  it('down arrow moves the selection while the requests panel is maximized', () => {
    const actions = pressKey(panelState('requests'), '', makeKey({ downArrow: true }));

    expect(actions).toEqual([{ type: 'MOVE_SELECTION', direction: 'down' }]);
  });

  it('j scrolls the response down while the response is maximized', () => {
    const actions = pressKey(panelState('response'), 'j');

    expect(actions).toEqual([{ type: 'SCROLL', direction: 'down' }]);
  });
});

describe('quit-key divergence: q never quits from fullscreen, Ctrl+C always exits', () => {
  it('Ctrl+C while maximized calls exit', () => {
    const result = runNormalInput(panelState('response'), 'c', makeKey({ ctrl: true }));

    expect(result.exit).toHaveBeenCalledOnce();
    expect(result.actions).toEqual([]);
  });

  it('q while the response is maximized with active search results dismisses the search', () => {
    const result = runNormalInput(
      panelState('response', { searchMatches: [3, 7], currentMatchIndex: 0, lastSearchQuery: 'needle' }),
      'q',
    );

    expect(result.actions).toEqual([{ type: 'CANCEL_SEARCH' }]);
    expect(result.exit).not.toHaveBeenCalled();
  });

  it('q without search results does not exit while maximized', () => {
    const result = runNormalInput(panelState('requests'), 'q');

    expect(result.actions).toEqual([]);
    expect(result.exit).not.toHaveBeenCalled();
  });

  it('q with unsaved edits does not request discard confirmation while maximized', () => {
    const result = runNormalInput(populatedPanelState('requests'), 'q');

    expect(result.actions).toEqual([]);
    expect(result.exit).not.toHaveBeenCalled();
  });

  it('q calls exit when no panel is maximized and no search is active', () => {
    const result = runNormalInput(createInitialState({ requests: [createRequest()] }), 'q');

    expect(result.exit).toHaveBeenCalledOnce();
    expect(result.actions).toEqual([]);
  });
});

describe('escape priority in fullscreen: search first, fullscreen exit second', () => {
  const searchActiveState = (panel: 'requests' | 'response' | 'details'): AppState =>
    panelState(panel, { searchMatches: [3, 7], currentMatchIndex: 0, lastSearchQuery: 'needle' });

  it('Escape while the response is maximized with active search results dismisses the search', () => {
    const result = runNormalInput(searchActiveState('response'), '', makeKey({ escape: true }));

    expect(result.actions).toEqual([{ type: 'CANCEL_SEARCH' }]);
  });

  it('Escape while the requests panel is maximized with active search results dismisses the search', () => {
    const result = runNormalInput(searchActiveState('requests'), '', makeKey({ escape: true }));

    expect(result.actions).toEqual([{ type: 'CANCEL_SEARCH' }]);
  });

  it('Escape while the details panel is maximized with active search results dismisses the search', () => {
    const result = runNormalInput(searchActiveState('details'), '', makeKey({ escape: true }));

    expect(result.actions).toEqual([{ type: 'CANCEL_SEARCH' }]);
  });

  it('a second Escape after the dismissal exits fullscreen', () => {
    const searchActive = searchActiveState('requests');
    const first = runNormalInput(searchActive, '', makeKey({ escape: true }));

    expect(first.actions).toEqual([{ type: 'CANCEL_SEARCH' }]);

    const dismissed = reducer(searchActive, { type: 'CANCEL_SEARCH' });
    const second = runNormalInput(dismissed, '', makeKey({ escape: true }));

    expect(second.actions).toEqual([{ type: 'TOGGLE_FULLSCREEN' }]);
  });

  it('Escape without search results exits fullscreen', () => {
    const result = runNormalInput(panelState('requests'), '', makeKey({ escape: true }));

    expect(result.actions).toEqual([{ type: 'TOGGLE_FULLSCREEN' }]);
  });
});

describe('fullscreen action keys are no-ops', () => {
  const noopKeys: Array<{ label: string; input: string; key?: Key }> = [
    { label: 'Tab', input: '', key: makeKey({ tab: true }) },
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
    const result = runNormalInput(populatedPanelState('response'), input, key ?? makeKey());

    if (label === 'Ctrl+G') {
      expect(result.actions).toEqual([{ type: 'JUMP_VERTICAL', direction: 'start' }]);
    } else {
      expect(result.actions).toEqual([]);
    }
    expect(result.exit).not.toHaveBeenCalled();
    expect(result.suspend).not.toHaveBeenCalled();
    expect(result.clipboardRunner).not.toHaveBeenCalled();
    expect(result.clipboardReadRunner).not.toHaveBeenCalled();
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
      panelState('response', { isLoading: true }),
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

describe('normal mode escape', () => {
  it('Escape is a no-op in normal mode without search state', () => {
    const result = runNormalInput(
      createInitialState({ requests: [createRequest()] }),
      '',
      makeKey({ escape: true }),
    );

    expect(result.actions).toEqual([]);
    expect(result.exit).not.toHaveBeenCalled();
  });

  it('Escape dismisses an active search in split view', () => {
    const result = runNormalInput(
      createInitialState({
        requests: [createRequest()],
        searchMatches: [3, 7],
        currentMatchIndex: 0,
        lastSearchQuery: 'needle',
      }),
      '',
      makeKey({ escape: true }),
    );

    expect(result.actions).toEqual([{ type: 'CANCEL_SEARCH' }]);
    expect(result.exit).not.toHaveBeenCalled();
  });
});
