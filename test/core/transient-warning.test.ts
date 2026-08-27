import { describe, expect, it } from 'vitest';

import { createInitialState, reducer } from '../helpers/state';
import { createMockResponse } from '../helpers/responses';

describe('transient channel exclusivity', () => {
  it('initializes transientWarning to null', () => {
    expect(createInitialState().transientWarning).toBeNull();
  });

  it('SET_TRANSIENT_WARNING sets the warning and clears message and error', () => {
    const state = {
      ...createInitialState(),
      transientMessage: 'Pasted request',
      transientError: 'Read failed',
    };

    const result = reducer(state, { type: 'SET_TRANSIENT_WARNING', warning: 'Pasted request — some curl options were skipped' });

    expect(result.transientWarning).toBe('Pasted request — some curl options were skipped');
    expect(result.transientMessage).toBeNull();
    expect(result.transientError).toBeNull();
  });

  it('SET_TRANSIENT_ERROR sets the error and clears message and warning', () => {
    const state = {
      ...createInitialState(),
      transientMessage: 'Pasted request',
      transientWarning: 'Pasted request — some curl options were skipped',
    };

    const result = reducer(state, { type: 'SET_TRANSIENT_ERROR', error: 'Not a curl command' });

    expect(result.transientError).toBe('Not a curl command');
    expect(result.transientMessage).toBeNull();
    expect(result.transientWarning).toBeNull();
  });

  it('SET_TRANSIENT_MESSAGE sets the message and clears warning and error', () => {
    const state = {
      ...createInitialState(),
      transientError: 'Read failed',
      transientWarning: 'Pasted request — some curl options were skipped',
    };

    const result = reducer(state, { type: 'SET_TRANSIENT_MESSAGE', message: 'Pasted request' });

    expect(result.transientMessage).toBe('Pasted request');
    expect(result.transientError).toBeNull();
    expect(result.transientWarning).toBeNull();
  });

  it('CLEAR_TRANSIENT_MESSAGE clears all three transient channels', () => {
    const state = {
      ...createInitialState(),
      transientMessage: 'Pasted request',
      transientError: 'Read failed',
      transientWarning: 'Pasted request — some curl options were skipped',
    };

    const result = reducer(state, { type: 'CLEAR_TRANSIENT_MESSAGE' });

    expect(result.transientMessage).toBeNull();
    expect(result.transientError).toBeNull();
    expect(result.transientWarning).toBeNull();
  });

  it('SET_TRANSIENT_ERROR clears a showing transientWarning', () => {
    const state = {
      ...createInitialState(),
      transientWarning: 'Pasted request — some curl options were skipped',
    };

    const result = reducer(state, { type: 'SET_TRANSIENT_ERROR', error: 'File not found' });

    expect(result.transientError).toBe('File not found');
    expect(result.transientWarning).toBeNull();
  });

  it('SET_TRANSIENT_ERROR clears a showing transientMessage', () => {
    const state = {
      ...createInitialState(),
      transientMessage: 'Reloaded',
    };

    const result = reducer(state, { type: 'SET_TRANSIENT_ERROR', error: 'File not found' });

    expect(result.transientError).toBe('File not found');
    expect(result.transientMessage).toBeNull();
  });

  it('SET_TRANSIENT_ERROR leaves response, requestError, search state, and isLoading untouched', () => {
    const response = createMockResponse({
      body: '{"ok":true}',
      size: { bodyBytes: 10 },
    });
    const requestError = { message: 'Connection refused' };
    const state = {
      ...createInitialState(),
      response,
      requestError,
      searchQuery: 'test',
      searchMatches: [1, 3, 5],
      currentMatchIndex: 1,
      lastSearchQuery: 'test',
      isLoading: true,
    };

    const result = reducer(state, { type: 'SET_TRANSIENT_ERROR', error: 'File not found' });

    expect(result.response).toBe(response);
    expect(result.requestError).toBe(requestError);
    expect(result.searchQuery).toBe('test');
    expect(result.searchMatches).toEqual([1, 3, 5]);
    expect(result.currentMatchIndex).toBe(1);
    expect(result.lastSearchQuery).toBe('test');
    expect(result.isLoading).toBe(true);
  });

  it('SET_TRANSIENT_WARNING leaves the rest of the state unchanged', () => {
    const state = {
      ...createInitialState(),
      transientMessage: 'Pasted request',
      selectedIndex: 2,
      isLoading: true,
    };

    const result = reducer(state, { type: 'SET_TRANSIENT_WARNING', warning: 'warned' });

    expect(result.selectedIndex).toBe(2);
    expect(result.isLoading).toBe(true);
  });
});
