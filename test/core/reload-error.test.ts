import { describe, expect, it } from 'vitest';

import { createInitialState, reducer } from '../helpers/state';
import { createMockResponse } from '../helpers/responses';

describe('RELOAD_ERROR reducer', () => {
  it('sets transientError and clears transientMessage', () => {
    const state = { ...createInitialState(), transientMessage: 'Reloaded' };
    const result = reducer(state, {
      type: 'RELOAD_ERROR',
      error: { message: 'File not found' },
    });
    expect(result.transientError).toBe('File not found');
    expect(result.transientMessage).toBeNull();
  });

  it('does NOT clear response', () => {
    const response = createMockResponse({
      body: '{"ok":true}',
      size: { bodyBytes: 10 },
    });
    const state = { ...createInitialState(), response };
    const result = reducer(state, {
      type: 'RELOAD_ERROR',
      error: { message: 'Parse error' },
    });
    expect(result.response).toBe(state.response);
  });

  it('does NOT clear search state', () => {
    const state = {
      ...createInitialState(),
      searchQuery: 'test',
      searchMatches: [1, 3, 5],
      currentMatchIndex: 1,
      lastSearchQuery: 'test',
    };
    const result = reducer(state, {
      type: 'RELOAD_ERROR',
      error: { message: 'File not found' },
    });
    expect(result.searchQuery).toBe('test');
    expect(result.searchMatches).toEqual([1, 3, 5]);
    expect(result.currentMatchIndex).toBe(1);
    expect(result.lastSearchQuery).toBe('test');
  });

  it('does NOT set error state', () => {
    const state = createInitialState();
    const result = reducer(state, {
      type: 'RELOAD_ERROR',
      error: { message: 'File not found' },
    });
    expect(result.requestError).toBeNull();
  });

  it('does NOT change isLoading', () => {
    const state = { ...createInitialState(), isLoading: true };
    const result = reducer(state, {
      type: 'RELOAD_ERROR',
      error: { message: 'File not found' },
    });
    expect(result.isLoading).toBe(true);
  });
});

describe('SET_TRANSIENT_MESSAGE clears transientError', () => {
  it('clears transientError when setting a transient message', () => {
    const state = { ...createInitialState(), transientError: 'Reload failed' };
    const result = reducer(state, {
      type: 'SET_TRANSIENT_MESSAGE',
      message: 'Reloaded',
    });
    expect(result.transientMessage).toBe('Reloaded');
    expect(result.transientError).toBeNull();
  });
});
