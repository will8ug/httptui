import { describe, expect, it } from 'vitest';

import { INITIAL_SEARCH } from '../../../src/core/reducers/helpers';
import type { ParsedRequest } from '../../../src/core/types';
import { createMockResponse } from '../../helpers/responses';
import { createRequest } from '../../helpers/requests';
import { createInitialState, reducer } from '../../helpers/state';

function makeRequests(count: number): ParsedRequest[] {
  return Array.from({ length: count }, (_, i) =>
    createRequest({
      name: `Request ${i + 1}`,
    }),
  );
}

function pastedRequest(): ParsedRequest {
  return createRequest({
    name: 'GET /users',
    method: 'GET',
    url: 'https://api.example.com/users',
    isDirty: true,
  });
}

describe('APPEND_REQUEST reducer', () => {
  it('appends the request last and selects the new last index', () => {
    const state = createInitialState({ requests: makeRequests(3), selectedIndex: 0 });

    const result = reducer(state, { type: 'APPEND_REQUEST', request: pastedRequest() });

    expect(result.requests).toHaveLength(4);
    expect(result.requests[3]).toMatchObject({ name: 'GET /users', url: 'https://api.example.com/users' });
    expect(result.selectedIndex).toBe(3);
  });

  it('leaves existing requests untouched', () => {
    const requests = makeRequests(3);
    const state = createInitialState({ requests, selectedIndex: 1 });

    const result = reducer(state, { type: 'APPEND_REQUEST', request: pastedRequest() });

    expect(result.requests[0]).toBe(requests[0]);
    expect(result.requests[1]).toBe(requests[1]);
    expect(result.requests[2]).toBe(requests[2]);
  });

  it('clamps requestScrollOffset to bring the appended request into view', () => {
    const state = createInitialState({ requests: makeRequests(25), selectedIndex: 0, requestScrollOffset: 0 });

    const result = reducer(state, { type: 'APPEND_REQUEST', request: pastedRequest() });

    expect(result.selectedIndex).toBe(25);
    expect(result.requestScrollOffset).toBe(7);
  });

  it('resets horizontal and details offsets', () => {
    const state = createInitialState({
      requests: makeRequests(3),
      requestHorizontalOffset: 12,
      detailsScrollOffset: 5,
      detailsHorizontalOffset: 9,
    });

    const result = reducer(state, { type: 'APPEND_REQUEST', request: pastedRequest() });

    expect(result.requestHorizontalOffset).toBe(0);
    expect(result.detailsScrollOffset).toBe(0);
    expect(result.detailsHorizontalOffset).toBe(0);
  });

  it('preserves search state — the append moves the selection but leaves the response alone', () => {
    const state = createInitialState({
      requests: makeRequests(3),
      response: createMockResponse({ body: '{"ok":true}' }),
      search: { ...INITIAL_SEARCH, query: 'users', matches: [1, 3], currentMatchIndex: 1, lastQuery: 'users' },
    });

    const result = reducer(state, { type: 'APPEND_REQUEST', request: pastedRequest() });

    expect(result.search).toEqual({ query: 'users', cursor: 0, matches: [1, 3], currentMatchIndex: 1, lastQuery: 'users' });
  });

  it('leaves the response untouched', () => {
    const response = createMockResponse({ body: '{"ok":true}' });
    const state = createInitialState({ requests: makeRequests(3), response });

    const result = reducer(state, { type: 'APPEND_REQUEST', request: pastedRequest() });

    expect(result.response).toBe(response);
  });

  it('preserves isDirty from the pasted request', () => {
    const state = createInitialState({ requests: makeRequests(3) });

    const result = reducer(state, { type: 'APPEND_REQUEST', request: pastedRequest() });

    expect(result.requests[3]?.isDirty).toBe(true);
  });

  it('appends the pasted request verbatim without rewriting it', () => {
    const state = createInitialState({ requests: makeRequests(3) });
    const pasted = pastedRequest();

    const result = reducer(state, { type: 'APPEND_REQUEST', request: pasted });

    expect(result.requests[3]).toEqual(pasted);
  });

  // Characterization pin: a paste appends to whatever file is loaded, so the
  // source format of that file stays whatever it was.
  it('preserves the source format of the loaded file', () => {
    const state = createInitialState({ requests: makeRequests(3), sourceFormat: 'postman' });

    const result = reducer(state, { type: 'APPEND_REQUEST', request: pastedRequest() });

    expect(result.sourceFormat).toBe('postman');
  });
});
