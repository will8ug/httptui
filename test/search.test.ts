import { describe, expect, it } from 'vitest';

import { createInitialState } from './helpers/state';
import { createMockResponse } from './helpers/responses';
import { formatResponseBody } from '../src/core/formatter';
import { reducer, CLEAR_SEARCH_STATE, computeSearchScrollOffset } from '../src/core/reducer';
import type { Action, AppState, ResponseData } from '../src/core/types';

function stateWithResponse(body: string): AppState {
  const response: ResponseData = createMockResponse({
    headers: { 'content-type': 'application/json' },
    body,
    size: { bodyBytes: body.length },
  });

  return createInitialState({ response });
}

function stateWithActiveSearch(): AppState {
  return {
    ...stateWithResponse('{"name":"John"}'),
    searchMatches: [0, 2, 5],
    currentMatchIndex: 1,
    lastSearchQuery: 'john',
    searchQuery: 'john',
  };
}

function expectClearedSearchState(state: AppState): void {
  expect({
    searchQuery: state.searchQuery,
    searchMatches: state.searchMatches,
    currentMatchIndex: state.currentMatchIndex,
    lastSearchQuery: state.lastSearchQuery,
  }).toEqual(CLEAR_SEARCH_STATE);
}

describe('ENTER_SEARCH reducer', () => {
  it('sets mode to search, focuses response, and clears searchQuery when response exists', () => {
    const state = stateWithResponse('{"name":"John"}');
    const action: Action = { type: 'ENTER_SEARCH' };
    const result = reducer(state, action);

    expect(result.mode).toBe('search');
    expect(result.focusedPanel).toBe('response');
    expect(result.searchQuery).toBe('');
  });

  it('returns state unchanged when response is null', () => {
    const state = createInitialState();
    const result = reducer(state, { type: 'ENTER_SEARCH' });

    expect(result).toEqual(state);
  });

  it('clears previous searchMatches and currentMatchIndex', () => {
    const state: AppState = {
      ...stateWithResponse('{"name":"John"}'),
      searchMatches: [1, 3],
      currentMatchIndex: 1,
      searchQuery: 'stale',
    };

    const result = reducer(state, { type: 'ENTER_SEARCH' });

    expect(result.searchMatches).toEqual([]);
    expect(result.currentMatchIndex).toBe(0);
    expect(result.searchQuery).toBe('');
  });
});

describe('UPDATE_SEARCH_INPUT reducer', () => {
  it('updates searchQuery with the new value', () => {
    const state: AppState = { ...stateWithResponse('{"name":"John"}'), mode: 'search' };
    const result = reducer(state, { type: 'UPDATE_SEARCH_INPUT', value: 'john' });

    expect(result.searchQuery).toBe('john');
  });
});

describe('CONFIRM_SEARCH reducer', () => {
  it('computes matches correctly for known content', () => {
    const body = '{"users":[{"name":"John"},{"name":"Jane"},{"name":"John"}]}';
    const state: AppState = { ...stateWithResponse(body), mode: 'search', searchQuery: 'John' };
    const expectedMatches = formatResponseBody(body, false)
      .split('\n')
      .reduce<number[]>((matches, line, index) => {
        if (line.includes('John')) {
          matches.push(index);
        }
        return matches;
      }, []);

    const result = reducer(state, { type: 'CONFIRM_SEARCH', headerOffset: 2 });

    expect(result.searchMatches).toEqual(expectedMatches);
  });

  it('matches case-insensitively', () => {
    const state: AppState = {
      ...stateWithResponse('{"name":"John"}'),
      mode: 'search',
      searchQuery: 'john',
    };

    const result = reducer(state, { type: 'CONFIRM_SEARCH', headerOffset: 1 });

    expect(result.searchMatches).toEqual([1]);
  });

  it('returns an empty searchMatches array when no matches exist', () => {
    const state: AppState = {
      ...stateWithResponse('{"name":"John"}'),
      mode: 'search',
      searchQuery: 'alice',
      responseScrollOffset: 4,
    };

    const result = reducer(state, { type: 'CONFIRM_SEARCH', headerOffset: 3 });

    expect(result.searchMatches).toEqual([]);
    expect(result.responseScrollOffset).toBe(4);
  });

  it('clears all search state for an empty query', () => {
    const state: AppState = {
      ...stateWithActiveSearch(),
      mode: 'search',
      searchQuery: '',
      lastSearchQuery: 'stale',
    };

    const result = reducer(state, { type: 'CONFIRM_SEARCH', headerOffset: 2 });

    expect(result.mode).toBe('normal');
    expectClearedSearchState(result);
  });

  it('sets currentMatchIndex to 0 and lastSearchQuery to the confirmed query', () => {
    const state: AppState = {
      ...stateWithResponse('{"users":[{"name":"John"},{"name":"John"}]}'),
      mode: 'search',
      searchQuery: 'john',
      currentMatchIndex: 2,
      lastSearchQuery: 'old',
    };

    const result = reducer(state, { type: 'CONFIRM_SEARCH', headerOffset: 2 });

    expect(result.currentMatchIndex).toBe(0);
    expect(result.lastSearchQuery).toBe('john');
  });

  it('returns to normal mode after confirming search', () => {
    const state: AppState = {
      ...stateWithResponse('{"name":"John"}'),
      mode: 'search',
      searchQuery: 'john',
    };

    const result = reducer(state, { type: 'CONFIRM_SEARCH', headerOffset: 1 });

    expect(result.mode).toBe('normal');
  });

  it('updates responseScrollOffset to the first match position', () => {
    const body = 'first line\nsecond john line\nthird line';
    const state: AppState = {
      ...stateWithResponse(body),
      mode: 'search',
      searchQuery: 'john',
    };

    const result = reducer(state, { type: 'CONFIRM_SEARCH', headerOffset: 4 });

    expect(result.searchMatches).toEqual([1]);
    expect(result.responseScrollOffset).toBe(computeSearchScrollOffset(1, 4));
  });

  it('finds matches across multiple lines', () => {
    const body = 'alpha\nbeta john\ngamma\ndelta JOHN\nepsilon';
    const state: AppState = {
      ...stateWithResponse(body),
      mode: 'search',
      searchQuery: 'john',
    };

    const result = reducer(state, { type: 'CONFIRM_SEARCH', headerOffset: 0 });

    expect(result.searchMatches).toEqual([1, 3]);
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
});

describe('NEXT_MATCH reducer', () => {
  it('increments currentMatchIndex by 1', () => {
    const state = stateWithActiveSearch();
    const result = reducer(state, { type: 'NEXT_MATCH', headerOffset: 1 });

    expect(result.currentMatchIndex).toBe(2);
  });

  it('wraps around from last match to first', () => {
    const state: AppState = { ...stateWithActiveSearch(), currentMatchIndex: 2 };
    const result = reducer(state, { type: 'NEXT_MATCH', headerOffset: 1 });

    expect(result.currentMatchIndex).toBe(0);
  });

  it('is a no-op when searchMatches is empty', () => {
    const state: AppState = { ...stateWithResponse('{"name":"John"}'), currentMatchIndex: 0 };
    const result = reducer(state, { type: 'NEXT_MATCH', headerOffset: 1 });

    expect(result).toEqual(state);
  });

  it('updates responseScrollOffset to the new match position', () => {
    const state = stateWithActiveSearch();
    const result = reducer(state, { type: 'NEXT_MATCH', headerOffset: 3 });

    expect(result.currentMatchIndex).toBe(2);
    expect(result.responseScrollOffset).toBe(computeSearchScrollOffset(5, 3));
  });
});

describe('PREV_MATCH reducer', () => {
  it('decrements currentMatchIndex by 1', () => {
    const state = stateWithActiveSearch();
    const result = reducer(state, { type: 'PREV_MATCH', headerOffset: 2 });

    expect(result.currentMatchIndex).toBe(0);
  });

  it('wraps around from first match to last', () => {
    const state: AppState = { ...stateWithActiveSearch(), currentMatchIndex: 0 };
    const result = reducer(state, { type: 'PREV_MATCH', headerOffset: 2 });

    expect(result.currentMatchIndex).toBe(2);
  });

  it('is a no-op when searchMatches is empty', () => {
    const state: AppState = { ...stateWithResponse('{"name":"John"}'), currentMatchIndex: 0 };
    const result = reducer(state, { type: 'PREV_MATCH', headerOffset: 1 });

    expect(result).toEqual(state);
  });

  it('updates responseScrollOffset to the new match position', () => {
    const state = stateWithActiveSearch();
    const result = reducer(state, { type: 'PREV_MATCH', headerOffset: 4 });

    expect(result.currentMatchIndex).toBe(0);
    expect(result.responseScrollOffset).toBe(computeSearchScrollOffset(0, 4));
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

  it('SELECT_REQUEST clears all search state', () => {
    const result = reducer(stateWithActiveSearch(), { type: 'SELECT_REQUEST', index: 1 });
    expectClearedSearchState(result);
  });

  it('MOVE_SELECTION clears all search state', () => {
    const result = reducer(stateWithActiveSearch(), { type: 'MOVE_SELECTION', direction: 'down' });
    expectClearedSearchState(result);
  });

  it('TOGGLE_RAW clears all search state', () => {
    const result = reducer(stateWithActiveSearch(), { type: 'TOGGLE_RAW' });
    expectClearedSearchState(result);
  });
});

describe('Escape dismisses active search results in normal mode', () => {
  it('CANCEL_SEARCH clears search state when in normal mode with active matches', () => {
    const state = stateWithActiveSearch();
    expect(state.mode).toBe('normal');
    expect(state.searchMatches.length).toBeGreaterThan(0);

    const result = reducer(state, { type: 'CANCEL_SEARCH' });

    expect(result.mode).toBe('normal');
    expectClearedSearchState(result);
  });

  it('CANCEL_SEARCH clears search state when only lastSearchQuery is set (no matches)', () => {
    const state: AppState = {
      ...stateWithResponse('{"name":"John"}'),
      lastSearchQuery: 'xyz',
      searchMatches: [],
      currentMatchIndex: 0,
    };

    const result = reducer(state, { type: 'CANCEL_SEARCH' });

    expectClearedSearchState(result);
  });
});
