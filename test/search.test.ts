import { describe, expect, it } from 'vitest';

import { formatResponseBody } from '../src/core/formatter';
import type { Action, AppState } from '../src/core/types';

const CLEAR_SEARCH_STATE = {
  searchQuery: '',
  searchMatches: [] as number[],
  currentMatchIndex: 0,
  lastSearchQuery: '',
};

function createInitialState(): AppState {
  return {
    requests: [],
    variables: [],
    selectedIndex: 0,
    focusedPanel: 'requests',
    response: null,
    isLoading: false,
    error: null,
    insecure: false,
    verbose: false,
    showHelp: false,
    filePath: 'test.http',
    responseScrollOffset: 0,
    requestScrollOffset: 0,
    requestHorizontalOffset: 0,
    responseHorizontalOffset: 0,
    detailsScrollOffset: 0,
    detailsHorizontalOffset: 0,
    reloadMessage: null,
    mode: 'normal',
    fileLoadInput: '',
    fileLoadError: null,
    wrapMode: 'nowrap',
    showRequestDetails: false,
    rawMode: false,
    searchQuery: '',
    searchMatches: [],
    currentMatchIndex: 0,
    lastSearchQuery: '',
  };
}

function computeSearchScrollOffset(bodyLineIndex: number, headerOffset: number, maxOffset?: number): number {
  const targetOffset = bodyLineIndex + headerOffset;
  if (maxOffset !== undefined) {
    return Math.min(Math.max(0, targetOffset), maxOffset);
  }

  return Math.max(0, targetOffset);
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ENTER_SEARCH': {
      if (!state.response) {
        return state;
      }

      return {
        ...state,
        mode: 'search',
        focusedPanel: 'response',
        searchQuery: '',
        searchMatches: [],
        currentMatchIndex: 0,
      };
    }

    case 'UPDATE_SEARCH_INPUT':
      return {
        ...state,
        searchQuery: action.value,
      };

    case 'CONFIRM_SEARCH': {
      if (!state.searchQuery || !state.response) {
        return {
          ...state,
          mode: 'normal',
          ...CLEAR_SEARCH_STATE,
        };
      }

      const formattedBody = formatResponseBody(state.response.body, state.rawMode);
      const bodyLines = formattedBody.split('\n');
      const queryLower = state.searchQuery.toLowerCase();
      const matches: number[] = [];

      for (let i = 0; i < bodyLines.length; i++) {
        if (bodyLines[i].toLowerCase().includes(queryLower)) {
          matches.push(i);
        }
      }

      const scrollOffset = matches.length > 0
        ? computeSearchScrollOffset(matches[0], action.headerOffset, action.maxOffset)
        : state.responseScrollOffset;

      return {
        ...state,
        mode: 'normal',
        searchMatches: matches,
        currentMatchIndex: 0,
        lastSearchQuery: state.searchQuery,
        responseScrollOffset: scrollOffset,
      };
    }

    case 'CANCEL_SEARCH':
      return {
        ...state,
        mode: 'normal',
        ...CLEAR_SEARCH_STATE,
      };

    case 'NEXT_MATCH': {
      if (state.searchMatches.length === 0) {
        return state;
      }

      const nextIndex = (state.currentMatchIndex + 1) % state.searchMatches.length;
      const scrollOffset = computeSearchScrollOffset(
        state.searchMatches[nextIndex],
        action.headerOffset,
        action.maxOffset,
      );

      return {
        ...state,
        currentMatchIndex: nextIndex,
        responseScrollOffset: scrollOffset,
      };
    }

    case 'PREV_MATCH': {
      if (state.searchMatches.length === 0) {
        return state;
      }

      const prevIndex = (state.currentMatchIndex - 1 + state.searchMatches.length) % state.searchMatches.length;
      const scrollOffset = computeSearchScrollOffset(
        state.searchMatches[prevIndex],
        action.headerOffset,
        action.maxOffset,
      );

      return {
        ...state,
        currentMatchIndex: prevIndex,
        responseScrollOffset: scrollOffset,
      };
    }

    case 'SEND_REQUEST':
      return {
        ...state,
        isLoading: true,
        error: null,
        responseScrollOffset: 0,
        responseHorizontalOffset: 0,
        ...CLEAR_SEARCH_STATE,
      };

    case 'RECEIVE_RESPONSE':
      return {
        ...state,
        response: action.response,
        error: null,
        isLoading: false,
        responseScrollOffset: 0,
        ...CLEAR_SEARCH_STATE,
      };

    case 'REQUEST_ERROR':
      return {
        ...state,
        response: null,
        error: action.error,
        isLoading: false,
        responseScrollOffset: 0,
        ...CLEAR_SEARCH_STATE,
      };

    case 'SELECT_REQUEST':
      return {
        ...state,
        selectedIndex: action.index,
        ...CLEAR_SEARCH_STATE,
      };

    case 'MOVE_SELECTION':
      return {
        ...state,
        selectedIndex: action.direction === 'up' ? Math.max(0, state.selectedIndex - 1) : state.selectedIndex + 1,
        ...CLEAR_SEARCH_STATE,
      };

    case 'TOGGLE_RAW':
      return {
        ...state,
        rawMode: !state.rawMode,
        ...CLEAR_SEARCH_STATE,
      };

    default:
      return state;
  }
}

function stateWithResponse(body: string): AppState {
  return {
    ...createInitialState(),
    response: {
      statusCode: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body,
      timing: { durationMs: 100 },
      size: { bodyBytes: body.length },
    },
  };
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
  expect(state.searchQuery).toBe('');
  expect(state.searchMatches).toEqual([]);
  expect(state.currentMatchIndex).toBe(0);
  expect(state.lastSearchQuery).toBe('');
}

describe('ENTER_SEARCH reducer', () => {
  it('sets mode to search, focuses response, and clears searchQuery when response exists', () => {
    const state = stateWithResponse('{"name":"John"}');
    const result = reducer(state, { type: 'ENTER_SEARCH' });

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
    expect(result.responseScrollOffset).toBe(5);
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
    expect(result.responseScrollOffset).toBe(8);
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
    expect(result.responseScrollOffset).toBe(4);
  });
});

describe('Search state clearing reducer cases', () => {
  it('SEND_REQUEST clears all search state', () => {
    const result = reducer(stateWithActiveSearch(), { type: 'SEND_REQUEST' });
    expectClearedSearchState(result);
  });

  it('RECEIVE_RESPONSE clears all search state', () => {
    const result = reducer(stateWithActiveSearch(), {
      type: 'RECEIVE_RESPONSE',
      response: {
        statusCode: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: '{"updated":true}',
        timing: { durationMs: 50 },
        size: { bodyBytes: 16 },
      },
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
