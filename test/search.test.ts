import { describe, expect, it } from 'vitest';

import { createInitialState } from './helpers/state';
import { createMockResponse } from './helpers/responses';
import { formatResponseBody } from '../src/core/formatter';
import { reducer, CLEAR_SEARCH_STATE, computeSearchScrollOffset } from '../src/core/reducer';
import { computeResponseLayout } from '../src/core/responseLayout';
import type { Action, AppState, ResponseData } from '../src/core/types';

const LEDGER_CONTENT_WIDTH = 49;

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

    const result = reducer(state, { type: 'CONFIRM_SEARCH', firstMatchVisualIndex: expectedMatches[0] + 2 });

    expect(result.searchMatches).toEqual(expectedMatches);
  });

  it('matches case-insensitively', () => {
    const state: AppState = {
      ...stateWithResponse('{"name":"John"}'),
      mode: 'search',
      searchQuery: 'john',
    };

    const result = reducer(state, { type: 'CONFIRM_SEARCH', firstMatchVisualIndex: 1 + 1 });

    expect(result.searchMatches).toEqual([1]);
  });

  it('returns an empty searchMatches array when no matches exist', () => {
    const state: AppState = {
      ...stateWithResponse('{"name":"John"}'),
      mode: 'search',
      searchQuery: 'alice',
      responseScrollOffset: 4,
    };

    const result = reducer(state, { type: 'CONFIRM_SEARCH', firstMatchVisualIndex: undefined });

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

    const result = reducer(state, { type: 'CONFIRM_SEARCH', firstMatchVisualIndex: undefined });

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

    const result = reducer(state, { type: 'CONFIRM_SEARCH', firstMatchVisualIndex: 1 + 2 });

    expect(result.currentMatchIndex).toBe(0);
    expect(result.lastSearchQuery).toBe('john');
  });

  it('returns to normal mode after confirming search', () => {
    const state: AppState = {
      ...stateWithResponse('{"name":"John"}'),
      mode: 'search',
      searchQuery: 'john',
    };

    const result = reducer(state, { type: 'CONFIRM_SEARCH', firstMatchVisualIndex: 1 + 1 });

    expect(result.mode).toBe('normal');
  });

  it('updates responseScrollOffset to the first match position', () => {
    const body = 'first line\nsecond john line\nthird line';
    const state: AppState = {
      ...stateWithResponse(body),
      mode: 'search',
      searchQuery: 'john',
    };

    const result = reducer(state, { type: 'CONFIRM_SEARCH', firstMatchVisualIndex: 1 + 4 });

    expect(result.searchMatches).toEqual([1]);
    expect(result.responseScrollOffset).toBe(computeSearchScrollOffset(1 + 4));
  });

  it('finds matches across multiple lines', () => {
    const body = 'alpha\nbeta john\ngamma\ndelta JOHN\nepsilon';
    const state: AppState = {
      ...stateWithResponse(body),
      mode: 'search',
      searchQuery: 'john',
    };

    const result = reducer(state, { type: 'CONFIRM_SEARCH', firstMatchVisualIndex: 1 + 0 });

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
    const result = reducer(state, { type: 'NEXT_MATCH', targetVisualIndex: 5 + 1 });

    expect(result.currentMatchIndex).toBe(2);
  });

  it('wraps around from last match to first', () => {
    const state: AppState = { ...stateWithActiveSearch(), currentMatchIndex: 2 };
    const result = reducer(state, { type: 'NEXT_MATCH', targetVisualIndex: 0 + 1 });

    expect(result.currentMatchIndex).toBe(0);
  });

  it('is a no-op when searchMatches is empty', () => {
    const state: AppState = { ...stateWithResponse('{"name":"John"}'), currentMatchIndex: 0 };
    const result = reducer(state, { type: 'NEXT_MATCH', targetVisualIndex: 0 });

    expect(result).toEqual(state);
  });

  it('updates responseScrollOffset to the new match position', () => {
    const state = stateWithActiveSearch();
    const result = reducer(state, { type: 'NEXT_MATCH', targetVisualIndex: 5 + 3 });

    expect(result.currentMatchIndex).toBe(2);
    expect(result.responseScrollOffset).toBe(computeSearchScrollOffset(5 + 3));
  });
});

describe('PREV_MATCH reducer', () => {
  it('decrements currentMatchIndex by 1', () => {
    const state = stateWithActiveSearch();
    const result = reducer(state, { type: 'PREV_MATCH', targetVisualIndex: 0 + 2 });

    expect(result.currentMatchIndex).toBe(0);
  });

  it('wraps around from first match to last', () => {
    const state: AppState = { ...stateWithActiveSearch(), currentMatchIndex: 0 };
    const result = reducer(state, { type: 'PREV_MATCH', targetVisualIndex: 5 + 2 });

    expect(result.currentMatchIndex).toBe(2);
  });

  it('is a no-op when searchMatches is empty', () => {
    const state: AppState = { ...stateWithResponse('{"name":"John"}'), currentMatchIndex: 0 };
    const result = reducer(state, { type: 'PREV_MATCH', targetVisualIndex: 0 });

    expect(result).toEqual(state);
  });

  it('updates responseScrollOffset to the new match position', () => {
    const state = stateWithActiveSearch();
    const result = reducer(state, { type: 'PREV_MATCH', targetVisualIndex: 0 + 4 });

    expect(result.currentMatchIndex).toBe(0);
    expect(result.responseScrollOffset).toBe(computeSearchScrollOffset(0 + 4));
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
      searchQuery: query,
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
      body: 'alpha\nbeta needle\ngamma',
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

    expect(result.searchMatches).toEqual([1]);
    expect(result.responseScrollOffset).toBe(layout.bodyVisualStart[1]);
    expect(result.responseScrollOffset).toBeGreaterThan(1 + 1 + 1);
  });

  it('wrap + verbose + long header: scroll target accounts for wrapped header lines', () => {
    const response = createMockResponse({
      headers: {
        'x-trace-id': 'this-is-a-deliberately-long-header-value-that-definitely-exceeds-content-width',
        short: 'v',
      },
      body: 'alpha\nbeta needle\ngamma',
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

    expect(result.searchMatches).toEqual([1]);
    expect(result.responseScrollOffset).toBe(layout.bodyVisualStart[1]);
    const flattenedHeaderOffset = 1 + 2 + 1;
    expect(result.responseScrollOffset).toBeGreaterThan(1 + flattenedHeaderOffset);
  });

  it('wrap + wrapped preceding body line: scroll target accounts for wrapped body expansion', () => {
    const longLine = 'abcdefghijklmnopqrstuvwxyz '.repeat(5).trim();
    const body = `${longLine}\nneedle\ntrailing`;
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

    expect(result.searchMatches).toEqual([1]);
    expect(result.responseScrollOffset).toBe(layout.bodyVisualStart[1]);
    expect(layout.bodyVisualStart[1] - layout.bodyVisualStart[0]).toBeGreaterThan(1);
    const naiveOffset = 1 + 1 + 1;
    expect(result.responseScrollOffset).toBeGreaterThan(naiveOffset);
  });
});
