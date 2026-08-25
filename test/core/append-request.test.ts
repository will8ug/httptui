import { describe, expect, it } from 'vitest';

import type { ParsedRequest } from '../../src/core/types';
import { createMockResponse } from '../helpers/responses';
import { createRequest } from '../helpers/requests';
import { createInitialState, reducer } from '../helpers/state';

function makeRequests(count: number): ParsedRequest[] {
  return Array.from({ length: count }, (_, i) =>
    createRequest({
      name: `Request ${i + 1}`,
      lineNumber: i + 1,
    }),
  );
}

function pastedRequest(): ParsedRequest {
  return createRequest({
    name: 'GET /users',
    method: 'GET',
    url: 'https://api.example.com/users',
    lineNumber: 0,
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

  it('clears search state', () => {
    const state = createInitialState({
      requests: makeRequests(3),
      searchQuery: 'users',
      searchMatches: [1, 3],
      currentMatchIndex: 1,
      lastSearchQuery: 'users',
    });

    const result = reducer(state, { type: 'APPEND_REQUEST', request: pastedRequest() });

    expect(result.searchQuery).toBe('');
    expect(result.searchMatches).toEqual([]);
    expect(result.currentMatchIndex).toBe(0);
    expect(result.lastSearchQuery).toBe('');
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

  it('replaces the lineNumber 0 placeholder with max existing lineNumber + 1', () => {
    const state = createInitialState({ requests: makeRequests(3) });

    const result = reducer(state, { type: 'APPEND_REQUEST', request: pastedRequest() });

    expect(result.requests[3]?.lineNumber).toBe(4);
  });

  it('assigns lineNumber 1 when the request list is empty', () => {
    const state = createInitialState({ requests: [] });

    const result = reducer(state, { type: 'APPEND_REQUEST', request: pastedRequest() });

    expect(result.requests[0]?.lineNumber).toBe(1);
  });

  it('assigns distinct non-zero lineNumbers to two identical pastes', () => {
    const state = createInitialState({ requests: makeRequests(3) });

    const first = reducer(state, { type: 'APPEND_REQUEST', request: pastedRequest() });
    const second = reducer(first, { type: 'APPEND_REQUEST', request: pastedRequest() });

    const firstLineNumber = first.requests[3]?.lineNumber;
    const secondLineNumber = second.requests[4]?.lineNumber;

    expect(firstLineNumber).toBe(4);
    expect(secondLineNumber).toBe(5);
    expect(new Set([firstLineNumber, secondLineNumber]).size).toBe(2);
  });
});
