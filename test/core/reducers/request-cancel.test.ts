import { describe, expect, it } from 'vitest';

import { createMockResponse } from '../../helpers/responses';
import { createInitialState, createStreamingState, reducer } from '../../helpers/state';

function loadingState() {
  return createInitialState({
    isLoading: true,
    requestScrollOffset: 2,
    requestHorizontalOffset: 4,
    detailsScrollOffset: 5,
    detailsHorizontalOffset: 6,
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
      transientMessage: 'Copied as curl',
      transientError: 'Reload failed',
    };
    const result = reducer(state, { type: 'REQUEST_CANCEL', warning: 'Request canceled' });

    expect(result.transientMessage).toBeNull();
    expect(result.transientError).toBeNull();
  });

  it('leaves the response cleared when a flight dispatched over a prior response is cancelled', () => {
    const dispatched = reducer(createInitialState({ response: createMockResponse() }), { type: 'SEND_REQUEST' });
    const result = reducer(dispatched, { type: 'REQUEST_CANCEL', warning: 'Request canceled' });

    expect(result.response).toBeNull();
    expect(result.requestError).toBeNull();
  });

  it('leaves response and requestError null when nothing was received before', () => {
    const state = createInitialState({ isLoading: true });
    const result = reducer(state, { type: 'REQUEST_CANCEL', warning: 'Request canceled' });

    expect(result.response).toBeNull();
    expect(result.requestError).toBeNull();
  });

  it('leaves scroll offsets untouched', () => {
    const result = reducer(loadingState(), { type: 'REQUEST_CANCEL', warning: 'Request canceled' });

    expect(result.responseScrollOffset).toBe(0);
    expect(result.responseHorizontalOffset).toBe(0);
    expect(result.requestScrollOffset).toBe(2);
    expect(result.requestHorizontalOffset).toBe(4);
    expect(result.detailsScrollOffset).toBe(5);
    expect(result.detailsHorizontalOffset).toBe(6);
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

describe('REQUEST_CANCEL keeps a streaming partial body, marked canceled', () => {
  function partialBodyState() {
    return reducer(
      createStreamingState(),
      { type: 'APPEND_RESPONSE_BODY', chunk: { raw: 'data: partial\r', display: 'data: partial\n', bytes: 14 } },
    );
  }

  it('marks the response canceled while keeping the partial body verbatim', () => {
    const result = reducer(partialBodyState(), { type: 'REQUEST_CANCEL', warning: 'Request canceled' });

    expect(result.response?.canceled).toBe(true);
    expect(result.response?.body).toBe('data: partial\n');
    expect(result.response?.rawBody).toBe('data: partial\r');
    expect(result.response?.size.bodyBytes).toBe(14);
    expect(result.response?.statusCode).toBe(200);
  });

  it('marks the kept partial body canceled in a new response object', () => {
    const state = partialBodyState();
    const result = reducer(state, { type: 'REQUEST_CANCEL', warning: 'Request canceled' });

    expect(result.response).not.toBe(state.response);
  });

  it('discards a chunk appended after the cancel — the kept partial is the last-displayed state', () => {
    const canceled = reducer(partialBodyState(), { type: 'REQUEST_CANCEL', warning: 'Request canceled' });

    const result = reducer(canceled, { type: 'APPEND_RESPONSE_BODY', chunk: { raw: ' late', display: ' late', bytes: 5 } });

    expect(result).toBe(canceled);
    expect(result.response?.body).toBe('data: partial\n');
  });

  it('wipes the canceled response when a new request is sent', () => {
    const canceled = reducer(partialBodyState(), { type: 'REQUEST_CANCEL', warning: 'Request canceled' });

    const result = reducer(canceled, { type: 'SEND_REQUEST' });

    expect(result.response).toBeNull();
    expect(result.isLoading).toBe(true);
  });
});
