import { describe, expect, it } from 'vitest';

import { createInitialState } from '../../helpers/state';
import { createRequest } from '../../helpers/requests';
import { createMockResponse } from '../../helpers/responses';
import { formatResponseBody } from '../../../src/core/formatter';
import { reducer, computeSearchScrollOffset, isSearchActive, searchBarFromState } from '../../../src/core/reducer';
import { INITIAL_SEARCH } from '../../../src/core/reducers/helpers';
import { computeResponseLayout } from '../../../src/core/response-layout';
import type { Action, AppState, ResponseData, SearchState } from '../../../src/core/types';

const LEDGER_CONTENT_WIDTH = 49;

const FILLER_LINES = Array.from({ length: 24 }, (_, i) => `filler-${i + 1}`);

function stateWithResponse(body: string): AppState {
  const response: ResponseData = createMockResponse({
    headers: { 'content-type': 'application/json' },
    body,
    size: { bodyBytes: body.length },
  });

  return createInitialState({ response });
}

// 30 plain body lines render status + separator + 30 = 32 visual lines; the
// lingering search bar claims one row of the 24 - 1 - 3 - 1 = 19-row window,
// so the derived max response offset is 13.
function stateWithActiveSearch(search: Partial<SearchState> = {}): AppState {
  return {
    ...stateWithResponse(['john alpha', 'plain-1', 'john beta', 'plain-2', 'plain-3', 'john gamma', ...FILLER_LINES].join('\n')),
    search: { ...INITIAL_SEARCH, query: 'john', matches: [0, 2, 5], currentMatchIndex: 1, lastQuery: 'john', ...search },
  };
}

function expectClearedSearchState(state: AppState): void {
  expect(state.search).toEqual(INITIAL_SEARCH);
}

function expectSearchStatePreserved(before: AppState, after: AppState): void {
  expect(after.search).toEqual(before.search);
}

describe('ENTER_SEARCH reducer', () => {
  it('sets mode to search, focuses response, and clears the search query when response exists', () => {
    const state = stateWithResponse('{"name":"John"}');
    const action: Action = { type: 'ENTER_SEARCH' };
    const result = reducer(state, action);

    expect(result.mode).toBe('search');
    expect(result.focusedPanel).toBe('response');
    expect(result.search.query).toBe('');
  });

  it('returns state unchanged when response is null', () => {
    const state = createInitialState();
    const result = reducer(state, { type: 'ENTER_SEARCH' });

    expect(result).toEqual(state);
  });

  it('clears previous matches and the current match index', () => {
    const state: AppState = {
      ...stateWithResponse('{"name":"John"}'),
      search: { ...INITIAL_SEARCH, query: 'stale', matches: [1, 3], currentMatchIndex: 1 },
    };

    const result = reducer(state, { type: 'ENTER_SEARCH' });

    expect(result.search.matches).toEqual([]);
    expect(result.search.currentMatchIndex).toBe(0);
    expect(result.search.query).toBe('');
  });

  // Characterization pin: re-entry resets the three live fields but keeps the
  // lingering last query, so the lingering bar stays anchored across modes.
  it('preserves a lingering last query while resetting the other search fields', () => {
    const state: AppState = {
      ...stateWithResponse('{"name":"John"}'),
      search: { ...INITIAL_SEARCH, lastQuery: 'old' },
    };

    const result = reducer(state, { type: 'ENTER_SEARCH' });

    expect(result.search).toEqual({ ...INITIAL_SEARCH, lastQuery: 'old' });
  });
});

describe('SEARCH_KEY reducer', () => {
  function searchModeState(search: Partial<SearchState> = {}): AppState {
    return {
      ...stateWithResponse('{"name":"John"}'),
      mode: 'search',
      search: { ...INITIAL_SEARCH, query: 'needle', cursor: 6, ...search },
    };
  }

  it('applies insert at the cursor and advances the cursor past the inserted text', () => {
    const result = reducer(searchModeState({ query: 'nedle', cursor: 2 }), {
      type: 'SEARCH_KEY',
      op: 'insert',
      insert: 'e',
    });

    expect(result.search.query).toBe('needle');
    expect(result.search.cursor).toBe(3);
  });

  it('applies deleteBackward at the cursor', () => {
    const result = reducer(searchModeState(), { type: 'SEARCH_KEY', op: 'deleteBackward' });

    expect(result.search.query).toBe('needl');
    expect(result.search.cursor).toBe(5);
  });

  it('applies deleteForward at the cursor', () => {
    const result = reducer(searchModeState({ cursor: 0 }), { type: 'SEARCH_KEY', op: 'deleteForward' });

    expect(result.search.query).toBe('eedle');
    expect(result.search.cursor).toBe(0);
  });

  it('applies left as a cursor-only motion preserving the query', () => {
    const result = reducer(searchModeState(), { type: 'SEARCH_KEY', op: 'left' });

    expect(result.search.query).toBe('needle');
    expect(result.search.cursor).toBe(5);
  });

  it('applies lineStart and lineEnd against the query bounds', () => {
    expect(reducer(searchModeState(), { type: 'SEARCH_KEY', op: 'lineStart' }).search.cursor).toBe(0);
    expect(reducer(searchModeState({ cursor: 2 }), { type: 'SEARCH_KEY', op: 'lineEnd' }).search.cursor).toBe(6);
  });

  it('treats up and down as no-ops on the single-line query', () => {
    const state = searchModeState();

    expect(reducer(state, { type: 'SEARCH_KEY', op: 'up' }).search).toEqual(state.search);
    expect(reducer(state, { type: 'SEARCH_KEY', op: 'down' }).search).toEqual(state.search);
  });

  it('preserves matches and the lingering last query while editing', () => {
    const result = reducer(searchModeState({ matches: [1, 2], lastQuery: 'old' }), {
      type: 'SEARCH_KEY',
      op: 'insert',
      insert: 'x',
    });

    expect(result.search.matches).toEqual([1, 2]);
    expect(result.search.lastQuery).toBe('old');
  });
});

describe('CONFIRM_SEARCH reducer', () => {
  it('computes matches correctly for known content', () => {
    const body = '{"users":[{"name":"John"},{"name":"Jane"},{"name":"John"}]}';
    const state: AppState = { ...stateWithResponse(body), mode: 'search', search: { ...INITIAL_SEARCH, query: 'John' } };
    const expectedMatches = formatResponseBody(body, false)
      .split('\n')
      .reduce<number[]>((matches, line, index) => {
        if (line.includes('John')) {
          matches.push(index);
        }
        return matches;
      }, []);

    const result = reducer(state, { type: 'CONFIRM_SEARCH', firstMatchVisualIndex: expectedMatches[0] + 2 });

    expect(result.search.matches).toEqual(expectedMatches);
  });

  it('matches case-insensitively', () => {
    const state: AppState = {
      ...stateWithResponse('{"name":"John"}'),
      mode: 'search',
      search: { ...INITIAL_SEARCH, query: 'john' },
    };

    const result = reducer(state, { type: 'CONFIRM_SEARCH', firstMatchVisualIndex: 1 + 1 });

    expect(result.search.matches).toEqual([1]);
  });

  it('returns an empty matches array when no matches exist', () => {
    const state: AppState = {
      ...stateWithResponse('{"name":"John"}'),
      mode: 'search',
      search: { ...INITIAL_SEARCH, query: 'alice' },
      responseScrollOffset: 4,
    };

    const result = reducer(state, { type: 'CONFIRM_SEARCH', firstMatchVisualIndex: undefined });

    expect(result.search.matches).toEqual([]);
    expect(result.responseScrollOffset).toBe(4);
  });

  it('clears all search state for an empty query', () => {
    const state: AppState = {
      ...stateWithActiveSearch({ query: '', lastQuery: 'stale' }),
      mode: 'search',
    };

    const result = reducer(state, { type: 'CONFIRM_SEARCH', firstMatchVisualIndex: undefined });

    expect(result.mode).toBe('normal');
    expectClearedSearchState(result);
  });

  it('re-clamps responseScrollOffset when an empty query hides the search bar', () => {
    // 30 body lines render 32 visual lines; the bar-visible window is
    // 24 - 1 - 3 - 1 = 19 rows, so max is 13. The empty confirm hides the
    // lingering bar, growing the window to 20 rows and dropping max to 12.
    const state: AppState = {
      ...stateWithActiveSearch({ query: '' }),
      mode: 'search',
      responseScrollOffset: 13,
    };

    const result = reducer(state, { type: 'CONFIRM_SEARCH', firstMatchVisualIndex: undefined });

    expect(result.responseScrollOffset).toBe(12);
  });

  it('sets the current match index to 0 and the last query to the confirmed query', () => {
    const state: AppState = {
      ...stateWithResponse('{"users":[{"name":"John"},{"name":"John"}]}'),
      mode: 'search',
      search: { ...INITIAL_SEARCH, query: 'john', currentMatchIndex: 2, lastQuery: 'old' },
    };

    const result = reducer(state, { type: 'CONFIRM_SEARCH', firstMatchVisualIndex: 1 + 2 });

    expect(result.search.currentMatchIndex).toBe(0);
    expect(result.search.lastQuery).toBe('john');
  });

  it('returns to normal mode after confirming search', () => {
    const state: AppState = {
      ...stateWithResponse('{"name":"John"}'),
      mode: 'search',
      search: { ...INITIAL_SEARCH, query: 'john' },
    };

    const result = reducer(state, { type: 'CONFIRM_SEARCH', firstMatchVisualIndex: 1 + 1 });

    expect(result.mode).toBe('normal');
  });

  it('updates responseScrollOffset to the first match position', () => {
    // 27 body lines render 29 visual lines; in search mode the window is
    // 24 - 1 - 3 - 1 = 19 rows, so the derived max offset is 10 and the
    // target 5 lands unclamped.
    const body = ['first line', 'second john line', 'third line', ...FILLER_LINES].join('\n');
    const state: AppState = {
      ...stateWithResponse(body),
      mode: 'search',
      search: { ...INITIAL_SEARCH, query: 'john' },
    };

    const result = reducer(state, { type: 'CONFIRM_SEARCH', firstMatchVisualIndex: 1 + 4 });

    expect(result.search.matches).toEqual([1]);
    expect(result.responseScrollOffset).toBe(computeSearchScrollOffset(1 + 4, 10));
  });

  it('finds matches across multiple lines', () => {
    const body = 'alpha\nbeta john\ngamma\ndelta JOHN\nepsilon';
    const state: AppState = {
      ...stateWithResponse(body),
      mode: 'search',
      search: { ...INITIAL_SEARCH, query: 'john' },
    };

    const result = reducer(state, { type: 'CONFIRM_SEARCH', firstMatchVisualIndex: 1 + 0 });

    expect(result.search.matches).toEqual([1, 3]);
  });
});

describe('CANCEL_SEARCH reducer', () => {
  it('returns to normal mode', () => {
    const state: AppState = { ...stateWithActiveSearch(), mode: 'search' };
    const result = reducer(state, { type: 'CANCEL_SEARCH' });

    expect(result.mode).toBe('normal');
  });

  it('clears all search state', () => {
    const state: AppState = { ...stateWithActiveSearch(), mode: 'search' };
    const result = reducer(state, { type: 'CANCEL_SEARCH' });

    expectClearedSearchState(result);
  });

  it('re-clamps responseScrollOffset when cancelling hides the search bar', () => {
    // 30 body lines render 32 visual lines; the bar-visible window is
    // 24 - 1 - 3 - 1 = 19 rows, so max is 13. Cancelling hides the bar,
    // growing the window to 20 rows and dropping max to 12.
    const state: AppState = {
      ...stateWithActiveSearch(),
      mode: 'search',
      responseScrollOffset: 13,
    };

    const result = reducer(state, { type: 'CANCEL_SEARCH' });

    expect(result.responseScrollOffset).toBe(12);
  });
});

describe('NEXT_MATCH reducer', () => {
  it('increments the current match index by 1', () => {
    const state = stateWithActiveSearch();
    const result = reducer(state, { type: 'NEXT_MATCH', targetVisualIndex: 5 + 1 });

    expect(result.search.currentMatchIndex).toBe(2);
  });

  it('wraps around from last match to first', () => {
    const state = stateWithActiveSearch({ currentMatchIndex: 2 });
    const result = reducer(state, { type: 'NEXT_MATCH', targetVisualIndex: 0 + 1 });

    expect(result.search.currentMatchIndex).toBe(0);
  });

  it('is a no-op when the matches are empty', () => {
    const state: AppState = { ...stateWithResponse('{"name":"John"}'), search: { ...INITIAL_SEARCH, currentMatchIndex: 0 } };
    const result = reducer(state, { type: 'NEXT_MATCH', targetVisualIndex: 0 });

    expect(result).toEqual(state);
  });

  it('updates responseScrollOffset to the new match position', () => {
    const state = stateWithActiveSearch();
    const result = reducer(state, { type: 'NEXT_MATCH', targetVisualIndex: 5 + 3 });

    expect(result.search.currentMatchIndex).toBe(2);
    expect(result.responseScrollOffset).toBe(computeSearchScrollOffset(5 + 3, 13));
  });

  it('clamps the match offset at the bound derived from state geometry', () => {
    const state = stateWithActiveSearch();
    const result = reducer(state, { type: 'NEXT_MATCH', targetVisualIndex: 99 });

    expect(result.responseScrollOffset).toBe(13);
  });
});

describe('PREV_MATCH reducer', () => {
  it('decrements the current match index by 1', () => {
    const state = stateWithActiveSearch();
    const result = reducer(state, { type: 'PREV_MATCH', targetVisualIndex: 0 + 2 });

    expect(result.search.currentMatchIndex).toBe(0);
  });

  it('wraps around from first match to last', () => {
    const state = stateWithActiveSearch({ currentMatchIndex: 0 });
    const result = reducer(state, { type: 'PREV_MATCH', targetVisualIndex: 5 + 2 });

    expect(result.search.currentMatchIndex).toBe(2);
  });

  it('is a no-op when the matches are empty', () => {
    const state: AppState = { ...stateWithResponse('{"name":"John"}'), search: { ...INITIAL_SEARCH, currentMatchIndex: 0 } };
    const result = reducer(state, { type: 'PREV_MATCH', targetVisualIndex: 0 });

    expect(result).toEqual(state);
  });

  it('updates responseScrollOffset to the new match position', () => {
    const state = stateWithActiveSearch();
    const result = reducer(state, { type: 'PREV_MATCH', targetVisualIndex: 0 + 4 });

    expect(result.search.currentMatchIndex).toBe(0);
    expect(result.responseScrollOffset).toBe(computeSearchScrollOffset(0 + 4, 13));
  });
});

describe('Search state clearing reducer cases', () => {
  it('SEND_REQUEST clears all search state', () => {
    const result = reducer(stateWithActiveSearch(), { type: 'SEND_REQUEST' });
    expectClearedSearchState(result);
  });

  it('RECEIVE_RESPONSE clears all search state', () => {
    const response: ResponseData = createMockResponse({
      headers: { 'content-type': 'application/json' },
      body: '{"updated":true}',
      timing: { durationMs: 50 },
      size: { bodyBytes: 16 },
    });

    const result = reducer(stateWithActiveSearch(), {
      type: 'RECEIVE_RESPONSE',
      response,
    });

    expectClearedSearchState(result);
  });

  it('REQUEST_ERROR clears all search state', () => {
    const result = reducer(stateWithActiveSearch(), {
      type: 'REQUEST_ERROR',
      error: { message: 'Network error' },
    });

    expectClearedSearchState(result);
  });

  it('SWITCH_PANEL leaving the response panel clears all search state', () => {
    const state: AppState = { ...stateWithActiveSearch(), focusedPanel: 'response' };

    const result = reducer(state, { type: 'SWITCH_PANEL' });

    expect(result.focusedPanel).toBe('requests');
    expectClearedSearchState(result);
  });

  it('TOGGLE_RAW clears all search state', () => {
    const result = reducer(stateWithActiveSearch(), { type: 'TOGGLE_RAW' });
    expectClearedSearchState(result);
  });

  it('LOAD_FILE clears all search state', () => {
    const result = reducer(stateWithActiveSearch(), {
      type: 'LOAD_FILE',
      requests: [],
      variables: [],
      filePath: 'other.http',
    });

    expect(result.response).toBeNull();
    expectClearedSearchState(result);
  });

  it('RELOAD_FILE clears all search state', () => {
    const result = reducer(stateWithActiveSearch(), {
      type: 'RELOAD_FILE',
      requests: [],
      variables: [],
    });

    expect(result.response).toBeNull();
    expectClearedSearchState(result);
  });

  it('SWITCH_ENV clears all search state', () => {
    const result = reducer(stateWithActiveSearch(), {
      type: 'SWITCH_ENV',
      environmentVariables: [],
      envName: null,
    });

    expect(result.response).toBeNull();
    expectClearedSearchState(result);
  });
});

describe('search persistence', () => {
  // Characterization pin: the search cluster survives the confirm path back to
  // normal mode and clears on response changes, focus departure, raw reformat,
  // and its own dismissal paths; it otherwise persists across modes.
  it('the cluster survives the confirm path to normal mode', () => {
    const confirmed = reducer(
      { ...stateWithResponse('{"name":"John"}'), mode: 'search', search: { ...INITIAL_SEARCH, query: 'john' } },
      { type: 'CONFIRM_SEARCH', firstMatchVisualIndex: 2 },
    );

    expect(confirmed.mode).toBe('normal');
    expect(confirmed.search).toEqual({ query: 'john', cursor: 0, matches: [1], currentMatchIndex: 0, lastQuery: 'john' });
  });
});

describe('Selection movement preserves search state', () => {
  const stateWithRequests = (): AppState => ({
    ...stateWithActiveSearch(),
    requests: [createRequest({ name: 'first' }), createRequest({ name: 'second' })],
  });

  it('SELECT_REQUEST keeps the search on the still-displayed response', () => {
    const state = stateWithRequests();

    const result = reducer(state, { type: 'SELECT_REQUEST', index: 1 });

    expect(result.selectedIndex).toBe(1);
    expectSearchStatePreserved(state, result);
  });

  it('MOVE_SELECTION keeps the search on the still-displayed response', () => {
    const state = stateWithRequests();

    const result = reducer(state, { type: 'MOVE_SELECTION', direction: 'down' });

    expect(result.selectedIndex).toBe(1);
    expectSearchStatePreserved(state, result);
  });
});

describe('Panel-departure search clearing', () => {
  it('SWITCH_PANEL from requests to response preserves search state', () => {
    const state: AppState = { ...stateWithActiveSearch(), focusedPanel: 'requests' };

    const result = reducer(state, { type: 'SWITCH_PANEL' });

    expect(result.focusedPanel).toBe('response');
    expectSearchStatePreserved(state, result);
  });

  it('SWITCH_PANEL from requests to details preserves search state', () => {
    const state: AppState = {
      ...stateWithActiveSearch(),
      focusedPanel: 'requests',
      showRequestDetails: true,
    };

    const result = reducer(state, { type: 'SWITCH_PANEL' });

    expect(result.focusedPanel).toBe('details');
    expectSearchStatePreserved(state, result);
  });

  it('SWITCH_PANEL from details to response preserves search state', () => {
    const state: AppState = { ...stateWithActiveSearch(), focusedPanel: 'details' };

    const result = reducer(state, { type: 'SWITCH_PANEL' });

    expect(result.focusedPanel).toBe('response');
    expectSearchStatePreserved(state, result);
  });

  it('a confirmed search cannot survive into a non-response maximized state', () => {
    // Confirming pins focus to the response, Tab is the only focus-departure
    // mechanism and clears the search, and fullscreen maximizes the focused
    // panel, so no non-response maximized state can carry an active search.
    const entered = reducer(stateWithResponse('{"name":"John"}'), { type: 'ENTER_SEARCH' });
    const confirmed = reducer(
      reducer(entered, { type: 'SEARCH_KEY', op: 'insert', insert: 'john' }),
      { type: 'CONFIRM_SEARCH' },
    );
    expect(isSearchActive(confirmed)).toBe(true);
    expect(confirmed.focusedPanel).toBe('response');

    const maximized = reducer(
      reducer(confirmed, { type: 'SWITCH_PANEL' }),
      { type: 'TOGGLE_FULLSCREEN' },
    );

    expect(maximized.maximizedPanel).toBe('requests');
    expect(isSearchActive(maximized)).toBe(false);
  });
});

describe('Dismissing active search results in normal mode', () => {
  it('CANCEL_SEARCH clears search state when in normal mode with active matches', () => {
    const state = stateWithActiveSearch();
    expect(state.mode).toBe('normal');
    expect(state.search.matches.length).toBeGreaterThan(0);

    const result = reducer(state, { type: 'CANCEL_SEARCH' });

    expect(result.mode).toBe('normal');
    expectClearedSearchState(result);
  });

  it('CANCEL_SEARCH clears search state when only the last query is set (no matches)', () => {
    const state: AppState = {
      ...stateWithResponse('{"name":"John"}'),
      search: { ...INITIAL_SEARCH, lastQuery: 'xyz' },
    };

    const result = reducer(state, { type: 'CANCEL_SEARCH' });

    expectClearedSearchState(result);
  });
});

describe('isSearchActive predicate', () => {
  function confirmSearch(query: string): AppState {
    return reducer(
      { ...stateWithResponse('{"name":"John"}'), mode: 'search', search: { ...INITIAL_SEARCH, query } },
      { type: 'CONFIRM_SEARCH' },
    );
  }

  it('is inactive in a fresh state', () => {
    expect(isSearchActive(createInitialState())).toBe(false);
  });

  it('is active while the search bar is open before any query is confirmed', () => {
    const entered = reducer(stateWithResponse('{"name":"John"}'), { type: 'ENTER_SEARCH' });

    expect(entered.mode).toBe('search');
    expect(entered.search.lastQuery).toBe('');
    expect(isSearchActive(entered)).toBe(true);
  });

  it('is active for a confirmed query with matches', () => {
    const confirmed = confirmSearch('john');

    expect(confirmed.search.matches.length).toBeGreaterThan(0);
    expect(isSearchActive(confirmed)).toBe(true);
  });

  it('is active for a confirmed query with no matches', () => {
    const confirmed = confirmSearch('alice');

    expect(confirmed.search.matches).toEqual([]);
    expect(isSearchActive(confirmed)).toBe(true);
  });

  it('is inactive after the confirmed search is dismissed', () => {
    const dismissed = reducer(confirmSearch('john'), { type: 'CANCEL_SEARCH' });

    expect(isSearchActive(dismissed)).toBe(false);
  });
});

describe('searchBarFromState', () => {
  it('is hidden in a fresh state', () => {
    expect(searchBarFromState(createInitialState())).toEqual({ kind: 'hidden' });
  });

  it('is active with the typed query and cursor while in search mode', () => {
    const state: AppState = {
      ...stateWithResponse('{"name":"John"}'),
      mode: 'search',
      search: { ...INITIAL_SEARCH, query: 'jo', cursor: 1 },
    };

    expect(searchBarFromState(state)).toEqual({ kind: 'active', query: 'jo', cursor: 1 });
  });

  it('stays active while re-editing even when a previous query lingers', () => {
    const state: AppState = {
      ...stateWithActiveSearch(),
      mode: 'search',
      search: { ...INITIAL_SEARCH, query: 'al', cursor: 2, lastQuery: 'john' },
    };

    expect(searchBarFromState(state)).toEqual({ kind: 'active', query: 'al', cursor: 2 });
  });

  it('lingers with the confirmed query in normal mode', () => {
    expect(searchBarFromState(stateWithActiveSearch())).toEqual({ kind: 'lingering', lastQuery: 'john' });
  });

  it('lingers with the confirmed query even when it had no matches', () => {
    const state = stateWithActiveSearch({ query: 'alice', matches: [], currentMatchIndex: 0, lastQuery: 'alice' });

    expect(searchBarFromState(state)).toEqual({ kind: 'lingering', lastQuery: 'alice' });
  });

  it('is hidden after the confirmed search is dismissed', () => {
    const dismissed = reducer(stateWithActiveSearch(), { type: 'CANCEL_SEARCH' });

    expect(searchBarFromState(dismissed)).toEqual({ kind: 'hidden' });
  });
});

describe('ledger-derived scroll targets (wrap mode)', () => {
  function confirmSearchWithLedger(options: {
    response: ResponseData;
    wrapMode: 'wrap' | 'nowrap';
    verbose: boolean;
    rawMode: boolean;
    query: string;
  }): AppState {
    const { response, wrapMode, verbose, rawMode, query } = options;
    const state: AppState = {
      ...createInitialState({ response }),
      wrapMode,
      verbose,
      rawMode,
      mode: 'search',
      search: { ...INITIAL_SEARCH, query },
    };

    const formattedBody = formatResponseBody(response.body, rawMode);
    const layout = computeResponseLayout({
      response,
      verbose,
      rawMode,
      wrapMode,
      contentWidth: LEDGER_CONTENT_WIDTH,
      formattedBody,
    });

    const bodyLines = formattedBody.split('\n');
    const queryLower = query.toLowerCase();
    const matches: number[] = [];
    for (let i = 0; i < bodyLines.length; i += 1) {
      if (bodyLines[i].toLowerCase().includes(queryLower)) {
        matches.push(i);
      }
    }

    const firstMatchVisualIndex = matches.length > 0 ? layout.bodyVisualStart[matches[0]] : undefined;

    return reducer(state, { type: 'CONFIRM_SEARCH', firstMatchVisualIndex });
  }

  it('wrap + long status: scroll target accounts for wrapped status lines', () => {
    const response = createMockResponse({
      statusText: 'Non-Authoritative Information With Extra Long Text To Force Wrapping',
      body: ['alpha', 'beta needle', 'gamma', ...FILLER_LINES].join('\n'),
      size: { bodyBytes: 0 },
    });

    const result = confirmSearchWithLedger({
      response,
      wrapMode: 'wrap',
      verbose: false,
      rawMode: true,
      query: 'needle',
    });

    const formattedBody = formatResponseBody(response.body, true);
    const layout = computeResponseLayout({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'wrap',
      contentWidth: LEDGER_CONTENT_WIDTH,
      formattedBody,
    });
    const statusSection = layout.sections.find((s) => s.kind === 'status');
    expect(statusSection?.visualLines.length).toBeGreaterThanOrEqual(2);

    expect(result.search.matches).toEqual([1]);
    expect(result.responseScrollOffset).toBe(layout.bodyVisualStart[1]);
    expect(result.responseScrollOffset).toBeGreaterThan(1 + 1 + 1);
  });

  it('wrap + verbose + long header: scroll target accounts for wrapped header lines', () => {
    const response = createMockResponse({
      headers: {
        'x-trace-id': 'this-is-a-deliberately-long-header-value-that-definitely-exceeds-content-width',
        short: 'v',
      },
      body: ['alpha', 'beta needle', 'gamma', ...FILLER_LINES].join('\n'),
      size: { bodyBytes: 0 },
    });

    const result = confirmSearchWithLedger({
      response,
      wrapMode: 'wrap',
      verbose: true,
      rawMode: true,
      query: 'needle',
    });

    const formattedBody = formatResponseBody(response.body, true);
    const layout = computeResponseLayout({
      response,
      verbose: true,
      rawMode: true,
      wrapMode: 'wrap',
      contentWidth: LEDGER_CONTENT_WIDTH,
      formattedBody,
    });
    const headerVisualTotal = layout.sections
      .filter((s) => s.kind === 'header')
      .reduce((sum, h) => sum + h.visualLines.length, 0);
    expect(headerVisualTotal).toBeGreaterThan(2);

    expect(result.search.matches).toEqual([1]);
    expect(result.responseScrollOffset).toBe(layout.bodyVisualStart[1]);
    const flattenedHeaderOffset = 1 + 2 + 1;
    expect(result.responseScrollOffset).toBeGreaterThan(1 + flattenedHeaderOffset);
  });

  it('wrap + wrapped preceding body line: scroll target accounts for wrapped body expansion', () => {
    const longLine = 'abcdefghijklmnopqrstuvwxyz '.repeat(5).trim();
    const body = [longLine, 'needle', 'trailing', ...FILLER_LINES].join('\n');
    const response = createMockResponse({ body, size: { bodyBytes: body.length } });

    const result = confirmSearchWithLedger({
      response,
      wrapMode: 'wrap',
      verbose: false,
      rawMode: true,
      query: 'needle',
    });

    const formattedBody = formatResponseBody(response.body, true);
    const layout = computeResponseLayout({
      response,
      verbose: false,
      rawMode: true,
      wrapMode: 'wrap',
      contentWidth: LEDGER_CONTENT_WIDTH,
      formattedBody,
    });

    expect(result.search.matches).toEqual([1]);
    expect(result.responseScrollOffset).toBe(layout.bodyVisualStart[1]);
    expect(layout.bodyVisualStart[1] - layout.bodyVisualStart[0]).toBeGreaterThan(1);
    const naiveOffset = 1 + 1 + 1;
    expect(result.responseScrollOffset).toBeGreaterThan(naiveOffset);
  });
});
