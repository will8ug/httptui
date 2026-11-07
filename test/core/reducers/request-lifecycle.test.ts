import { describe, expect, it } from 'vitest';

import { createHeadersTimeSnapshot, createMockResponse } from '../../helpers/responses';
import { createInitialState, createStreamingState, reducer } from '../../helpers/state';
import { INITIAL_SEARCH } from '../../../src/core/reducers/helpers';
import type { AppState } from '../../../src/core/types';

describe('APPEND_RESPONSE_BODY reducer', () => {
  const append = { chunk: { raw: 'lo world\r', display: 'lo world\n', bytes: 10 } } as const;

  // 28 body lines render status + separator + 28 = 30 visual lines; the
  // default 24-row geometry shows 20, so the max vertical offset is 10 and
  // the appended 29th line raises it to 11.
  const twentyEightLineBody = Array.from({ length: 28 }, (_, i) => `line-${i + 1}`).join('\n');
  const nextLine = { chunk: { raw: 'line-29\n', display: 'line-29\n', bytes: 8 } } as const;

  function streamingLongBodyState(overrides: Partial<AppState> = {}) {
    const state = reducer(
      reducer(createInitialState(), { type: 'SEND_REQUEST' }),
      {
        type: 'RECEIVE_RESPONSE_HEADERS',
        response: createHeadersTimeSnapshot({
          body: twentyEightLineBody,
          rawBody: twentyEightLineBody,
          size: { bodyBytes: 224 },
        }),
      },
    );
    return { ...state, ...overrides };
  }

  it('grows the partial body, raw body, and byte count while loading continues', () => {
    const state = createStreamingState();
    const grown = reducer(state, { type: 'APPEND_RESPONSE_BODY', ...append });

    expect(grown.response?.body).toBe('lo world\n');
    expect(grown.response?.rawBody).toBe('lo world\r');
    expect(grown.response?.size.bodyBytes).toBe(10);
    expect(grown.isLoading).toBe(true);
  });

  it('accumulates across successive appends and keeps status and headers intact', () => {
    const state = createStreamingState();
    const first = reducer(state, { type: 'APPEND_RESPONSE_BODY', chunk: { raw: 'Hel', display: 'Hel', bytes: 3 } });
    const second = reducer(first, { type: 'APPEND_RESPONSE_BODY', ...append });

    expect(second.response?.body).toBe('Hello world\n');
    expect(second.response?.rawBody).toBe('Hello world\r');
    expect(second.response?.size.bodyBytes).toBe(13);
    expect(second.response?.statusCode).toBe(200);
    expect(second.response?.headers).toEqual({});
  });

  it('produces a new response object so the viewport relayout memo keys on identity', () => {
    const state = createStreamingState();
    const grown = reducer(state, { type: 'APPEND_RESPONSE_BODY', ...append });

    expect(grown.response).not.toBe(state.response);
  });

  it('leaves the vertical offset alone while scrolled up, preserving search state and the horizontal offset', () => {
    const state = streamingLongBodyState({
      focusedPanel: 'response',
      responseScrollOffset: 4,
      responseHorizontalOffset: 2,
      search: { query: 'needle', cursor: 3, matches: [2], currentMatchIndex: 0, lastQuery: '' },
    });

    const grown = reducer(state, { type: 'APPEND_RESPONSE_BODY', ...nextLine });

    expect(grown.responseScrollOffset).toBe(4);
    expect(grown.responseHorizontalOffset).toBe(2);
    expect(grown.search).toEqual({ query: 'needle', cursor: 3, matches: [2], currentMatchIndex: 0, lastQuery: '' });
  });

  it('re-pins the vertical offset to the new bottom while at the bottom, preserving search state and the horizontal offset', () => {
    const state = streamingLongBodyState({
      focusedPanel: 'response',
      responseScrollOffset: 10,
      responseHorizontalOffset: 2,
      search: { query: 'needle', cursor: 3, matches: [2], currentMatchIndex: 0, lastQuery: '' },
    });

    const grown = reducer(state, { type: 'APPEND_RESPONSE_BODY', ...nextLine });

    expect(grown.responseScrollOffset).toBe(11);
    expect(grown.responseHorizontalOffset).toBe(2);
    expect(grown.search).toEqual({ query: 'needle', cursor: 3, matches: [2], currentMatchIndex: 0, lastQuery: '' });
  });

  describe('follow-tail', () => {
    it('re-pins to the newest bottom on every append while attached', () => {
      const first = reducer(
        streamingLongBodyState({ focusedPanel: 'response', responseScrollOffset: 10 }),
        { type: 'APPEND_RESPONSE_BODY', ...nextLine },
      );
      const second = reducer(first, {
        type: 'APPEND_RESPONSE_BODY',
        chunk: { raw: 'line-30\n', display: 'line-30\n', bytes: 8 },
      });

      expect(first.responseScrollOffset).toBe(11);
      expect(second.responseScrollOffset).toBe(12);
    });

    it('keeps the offset at the max when an append adds no new visual line', () => {
      const state = streamingLongBodyState({ focusedPanel: 'response', responseScrollOffset: 10 });

      const grown = reducer(state, {
        type: 'APPEND_RESPONSE_BODY',
        chunk: { raw: 'tail', display: 'tail', bytes: 4 },
      });

      expect(grown.responseScrollOffset).toBe(10);
    });

    it('re-attaches after the jump-to-bottom key so the next append re-pins', () => {
      const scrolledUp = streamingLongBodyState({ focusedPanel: 'response', responseScrollOffset: 4 });
      const atBottom = reducer(scrolledUp, { type: 'JUMP_VERTICAL', direction: 'end' });

      const grown = reducer(atBottom, { type: 'APPEND_RESPONSE_BODY', ...nextLine });

      expect(atBottom.responseScrollOffset).toBe(10);
      expect(grown.responseScrollOffset).toBe(11);
    });

    it('re-attaches after manually scrolling back down to the bottom', () => {
      const scrolledUp = streamingLongBodyState({ focusedPanel: 'response', responseScrollOffset: 9 });
      const atBottom = reducer(scrolledUp, { type: 'SCROLL', direction: 'down' });

      const grown = reducer(atBottom, { type: 'APPEND_RESPONSE_BODY', ...nextLine });

      expect(atBottom.responseScrollOffset).toBe(10);
      expect(grown.responseScrollOffset).toBe(11);
    });

    it('stays attached when a resize re-clamps the offset onto the new bottom', () => {
      const atBottom = streamingLongBodyState({ focusedPanel: 'response', responseScrollOffset: 10 });
      // 30 rows show 26 lines, so the 30-visual-line body's max drops to 4
      // and the geometry re-clamp lands the offset exactly on it.
      const resized = reducer(atBottom, { type: 'SET_GEOMETRY', rows: 30, columns: 80 });

      const grown = reducer(resized, { type: 'APPEND_RESPONSE_BODY', ...nextLine });

      expect(resized.responseScrollOffset).toBe(4);
      expect(grown.responseScrollOffset).toBe(5);
    });

    it('re-attaches when a resize clamps a detached offset onto the new bottom', () => {
      // Offset 6 is detached under the 24-row max of 10; 30 rows show 26
      // lines, dropping the max to 4, so the re-clamp lands the offset
      // exactly on the new bottom — attached again, and the append re-pins.
      const scrolledUp = streamingLongBodyState({ focusedPanel: 'response', responseScrollOffset: 6 });
      const resized = reducer(scrolledUp, { type: 'SET_GEOMETRY', rows: 30, columns: 80 });

      const grown = reducer(resized, { type: 'APPEND_RESPONSE_BODY', ...nextLine });

      expect(resized.responseScrollOffset).toBe(4);
      expect(grown.responseScrollOffset).toBe(5);
    });

    it('treats offset 0 as the bottom on a small body, making the re-pin a no-op', () => {
      const grown = reducer(createStreamingState(), { type: 'APPEND_RESPONSE_BODY', ...append });

      expect(grown.responseScrollOffset).toBe(0);
      expect(grown.response?.body).toBe('lo world\n');
    });

    it('treats an over-scrolled offset as attached and re-pins it down to the bottom', () => {
      // Offset > max is unreachable through the navigation reducers; this
      // pins the >= side of the attachment predicate so it stays determinate.
      const state = streamingLongBodyState({ focusedPanel: 'response', responseScrollOffset: 40 });

      const grown = reducer(state, { type: 'APPEND_RESPONSE_BODY', ...nextLine });

      expect(grown.responseScrollOffset).toBe(11);
    });
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
    const grown = reducer(createStreamingState(), { type: 'APPEND_RESPONSE_BODY', ...append });
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

  it('is a no-op when late headers arrive after cancellation, keeping the canceled partial', () => {
    const streaming = reducer(createStreamingState(), {
      type: 'APPEND_RESPONSE_BODY',
      chunk: { raw: 'data: partial\r', display: 'data: partial\n', bytes: 14 },
    });
    const canceled = reducer(streaming, { type: 'REQUEST_CANCEL', warning: 'Request canceled' });

    const result = reducer(canceled, { type: 'RECEIVE_RESPONSE_HEADERS', response: headersResponse });

    expect(result).toBe(canceled);
    expect(result.response?.canceled).toBe(true);
    expect(result.response?.body).toBe('data: partial\n');
  });

  it('is a no-op when late headers arrive after completion, keeping the completed response', () => {
    const completed = createMockResponse({ body: '{"done":true}' });
    const state = { ...createInitialState({ response: completed }), isLoading: false };

    const result = reducer(state, { type: 'RECEIVE_RESPONSE_HEADERS', response: headersResponse });

    expect(result).toBe(state);
    expect(result.response).toEqual(completed);
  });
});
