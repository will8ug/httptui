import { describe, expect, it } from 'vitest';
import type { Key } from 'ink';

import { createInitialState, reducer } from '../helpers/state';
import { createMockResponse } from '../helpers/responses';
import { pressKey } from '../helpers/dispatch';
import { handleSearchInput } from '../../src/app/input-handlers';
import { INITIAL_SEARCH } from '../../src/core/reducers/helpers';
import type { Action, AppState, SearchState } from '../../src/core/types';
import { computeResponseViewport } from '../../src/core/response-viewport';
import { makeKey } from '../helpers/keys';

function pressSearchKey(state: AppState, input: string, key: Key = makeKey()): Action[] {
  const dispatched: Action[] = [];
  handleSearchInput({
    state,
    input,
    key,
    dispatch: (action) => dispatched.push(action),
  });
  return dispatched;
}

describe('match offsets in a maximized response panel (wrap mode)', () => {
  const COLUMNS = 80;
  const WRAPPED_LINE = 'x'.repeat(120);
  const BODY = `${WRAPPED_LINE}\nfirst needle\nsecond needle`;
  const wrapResponse = createMockResponse({ body: BODY, size: { bodyBytes: BODY.length } });

  function searchState(overrides: Partial<AppState> = {}, search: Partial<SearchState> = {}): AppState {
    return createInitialState({
      response: wrapResponse,
      maximizedPanel: 'response',
      focusedPanel: 'response',
      wrapMode: 'wrap',
      rawMode: true,
      verbose: false,
      search: { ...INITIAL_SEARCH, matches: [1, 2], currentMatchIndex: 0, lastQuery: 'needle', ...search },
      ...overrides,
    });
  }

  function bodyVisualStartAt(state: AppState, maximizedPanel: AppState['maximizedPanel']): number[] {
    const response = state.response;
    if (!response) {
      throw new Error('expected a state with a response');
    }
    return computeResponseViewport({
      response,
      verbose: state.verbose,
      rawMode: state.rawMode,
      wrapMode: state.wrapMode,
      geometry: {
        columns: COLUMNS,
        availableHeight: state.geometry.rows - 1,
        fullscreen: maximizedPanel === 'response',
        searchVisible: false,
      },
    }).bodyVisualStart;
  }

  it('n and N dispatch match offsets computed at the fullscreen width while maximized', () => {
    const state = searchState();
    const fullscreen = bodyVisualStartAt(state, 'response');
    const split = bodyVisualStartAt(state, null);

    expect(fullscreen[1] - fullscreen[0]).toBe(2);
    expect(split[1] - split[0]).toBe(3);
    expect(fullscreen[1]).toBeLessThan(split[1]);

    const nextActions = pressKey(state, 'n');
    expect(nextActions).toHaveLength(1);
    expect(nextActions[0]).toEqual({ type: 'NEXT_MATCH', targetVisualIndex: fullscreen[2] });

    const prevActions = pressKey(searchState({}, { currentMatchIndex: 1 }), 'N');
    expect(prevActions).toHaveLength(1);
    expect(prevActions[0]).toEqual({ type: 'PREV_MATCH', targetVisualIndex: fullscreen[1] });
  });

  it('search Enter dispatches CONFIRM_SEARCH at the fullscreen width while maximized and at the split width otherwise', () => {
    const maximized = searchState({ mode: 'search' }, { query: 'needle' });
    const maximizedActions = pressSearchKey(maximized, '', makeKey({ return: true }));
    expect(maximizedActions).toHaveLength(1);
    expect(maximizedActions[0]).toEqual({
      type: 'CONFIRM_SEARCH',
      firstMatchVisualIndex: bodyVisualStartAt(maximized, 'response')[1],
    });

    const splitState = searchState({ mode: 'search', maximizedPanel: null }, { query: 'needle' });
    const splitActions = pressSearchKey(splitState, '', makeKey({ return: true }));
    expect(splitActions).toHaveLength(1);
    expect(splitActions[0]).toEqual({
      type: 'CONFIRM_SEARCH',
      firstMatchVisualIndex: bodyVisualStartAt(splitState, null)[1],
    });
    expect(bodyVisualStartAt(splitState, null)[1]).toBeGreaterThan(bodyVisualStartAt(maximized, 'response')[1]);
  });
});

describe('handleSearchInput line editing', () => {
  function searchModeState(search: Partial<SearchState> = {}): AppState {
    return createInitialState({
      mode: 'search',
      search: { ...INITIAL_SEARCH, query: 'needle', cursor: 6, ...search },
    });
  }

  it('typing a character dispatches an insert op', () => {
    expect(pressSearchKey(searchModeState(), 'x')).toEqual([
      { type: 'SEARCH_KEY', op: 'insert', insert: 'x' },
    ]);
  });

  it('Backspace dispatches deleteBackward', () => {
    expect(pressSearchKey(searchModeState(), '', makeKey({ backspace: true }))).toEqual([
      { type: 'SEARCH_KEY', op: 'deleteBackward' },
    ]);
  });

  it('Delete dispatches deleteForward', () => {
    expect(pressSearchKey(searchModeState(), '', makeKey({ delete: true }))).toEqual([
      { type: 'SEARCH_KEY', op: 'deleteForward' },
    ]);
  });

  it('left and right arrows dispatch their motion ops', () => {
    expect(pressSearchKey(searchModeState(), '', makeKey({ leftArrow: true }))).toEqual([
      { type: 'SEARCH_KEY', op: 'left' },
    ]);
    expect(pressSearchKey(searchModeState(), '', makeKey({ rightArrow: true }))).toEqual([
      { type: 'SEARCH_KEY', op: 'right' },
    ]);
  });

  it('Home and Ctrl+A dispatch lineStart, End and Ctrl+E dispatch lineEnd', () => {
    expect(pressSearchKey(searchModeState(), '', makeKey({ home: true }))).toEqual([
      { type: 'SEARCH_KEY', op: 'lineStart' },
    ]);
    expect(pressSearchKey(searchModeState(), 'a', makeKey({ ctrl: true }))).toEqual([
      { type: 'SEARCH_KEY', op: 'lineStart' },
    ]);
    expect(pressSearchKey(searchModeState(), '', makeKey({ end: true }))).toEqual([
      { type: 'SEARCH_KEY', op: 'lineEnd' },
    ]);
    expect(pressSearchKey(searchModeState(), 'e', makeKey({ ctrl: true }))).toEqual([
      { type: 'SEARCH_KEY', op: 'lineEnd' },
    ]);
  });

  it('up and down arrows dispatch nothing on the single-line query', () => {
    expect(pressSearchKey(searchModeState(), '', makeKey({ upArrow: true }))).toEqual([]);
    expect(pressSearchKey(searchModeState(), '', makeKey({ downArrow: true }))).toEqual([]);
  });

  it('Escape still cancels and Enter still confirms', () => {
    expect(pressSearchKey(searchModeState(), '', makeKey({ escape: true }))).toEqual([
      { type: 'CANCEL_SEARCH' },
    ]);
    expect(pressSearchKey(searchModeState({ query: '' }), '', makeKey({ return: true }))).toEqual([
      { type: 'CONFIRM_SEARCH', firstMatchVisualIndex: undefined },
    ]);
  });

  it('edits the query at the cursor through the reducer', () => {
    let state = searchModeState();

    state = reducer(state, pressSearchKey(state, '', makeKey({ leftArrow: true }))[0]);
    expect(state.search.cursor).toBe(5);

    state = reducer(state, pressSearchKey(state, 'X')[0]);
    expect(state.search.query).toBe('needlXe');
    expect(state.search.cursor).toBe(6);

    state = reducer(state, pressSearchKey(state, '', makeKey({ backspace: true }))[0]);
    expect(state.search.query).toBe('needle');
    expect(state.search.cursor).toBe(5);
  });
});
