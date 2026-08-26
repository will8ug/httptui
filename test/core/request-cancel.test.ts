import { describe, expect, it } from 'vitest';

import { createInitialState, reducer } from '../helpers/state';
import type { ResponseData } from '../../src/core/types';

const priorResponse: ResponseData = {
  statusCode: 200,
  statusText: 'OK',
  headers: { 'content-type': 'application/json' },
  body: '{"hello":"world"}',
  timing: { durationMs: 42 },
  size: { bodyBytes: 19 },
};

const priorRequestError = { message: 'connect ECONNREFUSED', code: 'ECONNREFUSED' };

function loadingState() {
  return createInitialState({
    isLoading: true,
    response: priorResponse,
    responseScrollOffset: 7,
    responseHorizontalOffset: 3,
    requestScrollOffset: 2,
    requestHorizontalOffset: 4,
    searchQuery: 'hello',
    searchMatches: [1, 3],
    currentMatchIndex: 1,
    lastSearchQuery: 'hello',
  });
}

describe('REQUEST_CANCEL reducer', () => {
  it('clears isLoading', () => {
    const result = reducer(loadingState(), { type: 'REQUEST_CANCEL', warning: 'Request canceled' });

    expect(result.isLoading).toBe(false);
  });

  it('sets transientWarning to the dispatched warning', () => {
    const result = reducer(loadingState(), { type: 'REQUEST_CANCEL', warning: 'Request canceled' });

    expect(result.transientWarning).toBe('Request canceled');
  });

  it('clears the other transient channels', () => {
    const state = {
      ...loadingState(),
      transientMessage: 'Sending request',
      transientError: 'Reload failed',
    };
    const result = reducer(state, { type: 'REQUEST_CANCEL', warning: 'Request canceled' });

    expect(result.transientMessage).toBeNull();
    expect(result.transientError).toBeNull();
  });

  it('preserves the previously displayed response untouched', () => {
    const result = reducer(loadingState(), { type: 'REQUEST_CANCEL', warning: 'Request canceled' });

    expect(result.response).toBe(priorResponse);
  });

  it('preserves a prior requestError untouched', () => {
    const state = createInitialState({
      isLoading: true,
      response: null,
      requestError: priorRequestError,
    });
    const result = reducer(state, { type: 'REQUEST_CANCEL', warning: 'Request canceled' });

    expect(result.requestError).toBe(priorRequestError);
  });

  it('leaves response and requestError null when nothing was received before', () => {
    const state = createInitialState({ isLoading: true });
    const result = reducer(state, { type: 'REQUEST_CANCEL', warning: 'Request canceled' });

    expect(result.response).toBeNull();
    expect(result.requestError).toBeNull();
  });

  it('leaves scroll offsets untouched', () => {
    const result = reducer(loadingState(), { type: 'REQUEST_CANCEL', warning: 'Request canceled' });

    expect(result.responseScrollOffset).toBe(7);
    expect(result.responseHorizontalOffset).toBe(3);
    expect(result.requestScrollOffset).toBe(2);
    expect(result.requestHorizontalOffset).toBe(4);
    expect(result.detailsScrollOffset).toBe(0);
    expect(result.detailsHorizontalOffset).toBe(0);
  });

  it('leaves search state untouched', () => {
    const result = reducer(loadingState(), { type: 'REQUEST_CANCEL', warning: 'Request canceled' });

    expect(result.searchQuery).toBe('hello');
    expect(result.searchMatches).toEqual([1, 3]);
    expect(result.currentMatchIndex).toBe(1);
    expect(result.lastSearchQuery).toBe('hello');
  });

  it('preserves selection and panel focus', () => {
    const state = createInitialState({
      isLoading: true,
      selectedIndex: 2,
      focusedPanel: 'response',
      mode: 'normal',
    });
    const result = reducer(state, { type: 'REQUEST_CANCEL', warning: 'Request canceled' });

    expect(result.selectedIndex).toBe(2);
    expect(result.focusedPanel).toBe('response');
    expect(result.mode).toBe('normal');
  });
});
