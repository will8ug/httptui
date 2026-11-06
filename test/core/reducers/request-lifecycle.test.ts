import { describe, expect, it } from 'vitest';

import { createMockResponse } from '../../helpers/responses';
import { createInitialState, reducer } from '../../helpers/state';
import { INITIAL_SEARCH } from '../../../src/core/reducers/helpers';

describe('SEND_REQUEST reducer', () => {
  it('clears a prior response and resets the response offsets', () => {
    const state = createInitialState({
      response: createMockResponse({ body: '{"hello":"world"}' }),
      responseScrollOffset: 7,
      responseHorizontalOffset: 3,
    });

    const result = reducer(state, { type: 'SEND_REQUEST' });

    expect(result.response).toBeNull();
    expect(result.responseScrollOffset).toBe(0);
    expect(result.responseHorizontalOffset).toBe(0);
    expect(result.isLoading).toBe(true);
  });

  it('clears a prior request error', () => {
    const state = createInitialState({
      requestError: { message: 'connect ECONNREFUSED', code: 'ECONNREFUSED' },
    });

    const result = reducer(state, { type: 'SEND_REQUEST' });

    expect(result.requestError).toBeNull();
    expect(result.isLoading).toBe(true);
  });
});

describe('RECEIVE_RESPONSE_HEADERS reducer', () => {
  const headersResponse = createMockResponse({
    body: '',
    rawBody: '',
    timing: { durationMs: 0 },
    size: { bodyBytes: 0 },
  });

  function loadingState() {
    return reducer(createInitialState(), { type: 'SEND_REQUEST' });
  }

  it('populates the response at headers time while the loading flag stays set', () => {
    const result = reducer(loadingState(), { type: 'RECEIVE_RESPONSE_HEADERS', response: headersResponse });

    expect(result.response).toEqual(headersResponse);
    expect(result.isLoading).toBe(true);
  });

  it('leaves the response offsets and search state untouched', () => {
    const state = createInitialState({
      isLoading: true,
      responseScrollOffset: 0,
      responseHorizontalOffset: 0,
      search: INITIAL_SEARCH,
    });

    const result = reducer(state, { type: 'RECEIVE_RESPONSE_HEADERS', response: headersResponse });

    expect(result.responseScrollOffset).toBe(0);
    expect(result.responseHorizontalOffset).toBe(0);
    expect(result.search).toEqual(INITIAL_SEARCH);
  });

  it('is replaced wholesale by RECEIVE_RESPONSE at completion, ending loading', () => {
    const atHeaders = reducer(loadingState(), { type: 'RECEIVE_RESPONSE_HEADERS', response: headersResponse });
    const completed = createMockResponse({
      body: '{"done":true}',
      rawBody: '{"done":true}',
      timing: { durationMs: 42 },
      size: { bodyBytes: 13 },
    });

    const result = reducer(atHeaders, { type: 'RECEIVE_RESPONSE', response: completed });

    expect(result.response).toEqual(completed);
    expect(result.isLoading).toBe(false);
    expect(result.search).toEqual(INITIAL_SEARCH);
  });
});
