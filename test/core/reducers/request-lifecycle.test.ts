import { describe, expect, it } from 'vitest';

import { createHeadersTimeSnapshot, createMockResponse } from '../../helpers/responses';
import { createInitialState, reducer } from '../../helpers/state';
import { INITIAL_SEARCH } from '../../../src/core/reducers/helpers';

describe('APPEND_RESPONSE_BODY reducer', () => {
  const append = { chunk: { raw: 'lo world\r', display: 'lo world\n', bytes: 10 } } as const;

  function streamingState() {
    return reducer(
      reducer(createInitialState(), { type: 'SEND_REQUEST' }),
      { type: 'RECEIVE_RESPONSE_HEADERS', response: createHeadersTimeSnapshot() },
    );
  }

  it('grows the partial body, raw body, and byte count while loading continues', () => {
    const state = streamingState();
    const grown = reducer(state, { type: 'APPEND_RESPONSE_BODY', ...append });

    expect(grown.response?.body).toBe('lo world\n');
    expect(grown.response?.rawBody).toBe('lo world\r');
    expect(grown.response?.size.bodyBytes).toBe(10);
    expect(grown.isLoading).toBe(true);
  });

  it('accumulates across successive appends and keeps status and headers intact', () => {
    const state = streamingState();
    const first = reducer(state, { type: 'APPEND_RESPONSE_BODY', chunk: { raw: 'Hel', display: 'Hel', bytes: 3 } });
    const second = reducer(first, { type: 'APPEND_RESPONSE_BODY', ...append });

    expect(second.response?.body).toBe('Hello world\n');
    expect(second.response?.rawBody).toBe('Hello world\r');
    expect(second.response?.size.bodyBytes).toBe(13);
    expect(second.response?.statusCode).toBe(200);
    expect(second.response?.headers).toEqual({});
  });

  it('produces a new response object so the viewport relayout memo keys on identity', () => {
    const state = streamingState();
    const grown = reducer(state, { type: 'APPEND_RESPONSE_BODY', ...append });

    expect(grown.response).not.toBe(state.response);
  });

  it('preserves search state and leaves both response offsets untouched', () => {
    const state = {
      ...streamingState(),
      responseScrollOffset: 4,
      responseHorizontalOffset: 2,
      search: { query: 'needle', cursor: 3, matches: [2], currentMatchIndex: 0, lastQuery: '' },
    };

    const grown = reducer(state, { type: 'APPEND_RESPONSE_BODY', ...append });

    expect(grown.responseScrollOffset).toBe(4);
    expect(grown.responseHorizontalOffset).toBe(2);
    expect(grown.search).toEqual({ query: 'needle', cursor: 3, matches: [2], currentMatchIndex: 0, lastQuery: '' });
  });

  it('is a no-op when there is no response to append to', () => {
    const state = reducer(createInitialState(), { type: 'SEND_REQUEST' });

    const result = reducer(state, { type: 'APPEND_RESPONSE_BODY', ...append });

    expect(result).toBe(state);
    expect(result.response).toBeNull();
  });

  it('is a no-op once loading has ended', () => {
    const completed = createMockResponse({ body: 'done' });
    const state = { ...createInitialState({ response: completed }), isLoading: false };

    const result = reducer(state, { type: 'APPEND_RESPONSE_BODY', ...append });

    expect(result).toBe(state);
    expect(result.response?.body).toBe('done');
  });

  it('is replaced wholesale by RECEIVE_RESPONSE at completion', () => {
    const grown = reducer(streamingState(), { type: 'APPEND_RESPONSE_BODY', ...append });
    const completed = createMockResponse({
      body: 'lo world\n',
      rawBody: 'lo world\r',
      timing: { durationMs: 42 },
      size: { bodyBytes: 10 },
    });

    const result = reducer(grown, { type: 'RECEIVE_RESPONSE', response: completed });

    expect(result.response).toEqual(completed);
    expect(result.isLoading).toBe(false);
  });
});

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
  const headersResponse = createHeadersTimeSnapshot();

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
