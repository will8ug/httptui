import { describe, expect, it } from 'vitest';

import type { Action, AppState, ParsedRequest, FileVariable } from '../src/core/types';
import { createRequest } from './helpers/requests';
import { createInitialState, reducer } from './helpers/state';

const sampleRequests: ParsedRequest[] = [
  createRequest({
    name: 'Get users',
    method: 'GET',
    url: 'https://api.example.com/users',
    lineNumber: 1,
  }),
  createRequest({
    name: 'Create user',
    method: 'POST',
    url: 'https://api.example.com/users',
    headers: { 'Content-Type': 'application/json' },
    body: '{"name":"John"}',
    lineNumber: 8,
  }),
  createRequest({
    name: 'Delete user',
    method: 'DELETE',
    url: 'https://api.example.com/users/1',
    lineNumber: 15,
  }),
];

const sampleVariables: FileVariable[] = [
  { name: 'baseUrl', value: 'https://api.example.com' },
];

describe('RELOAD_FILE reducer', () => {
  it('replaces requests and variables', () => {
    const state = createInitialState();
    const action: Action = {
      type: 'RELOAD_FILE',
      requests: sampleRequests,
      variables: sampleVariables,
    };
    const result = reducer(state, action);

    expect(result.requests).toEqual(sampleRequests);
    expect(result.variables).toEqual(sampleVariables);
  });

  it('preserves selection by name when request still exists', () => {
    const state: AppState = {
      ...createInitialState(),
      requests: sampleRequests,
      selectedIndex: 1,
    };

    const newRequests: ParsedRequest[] = [
      sampleRequests[0],
      sampleRequests[1],
      sampleRequests[2],
    ];

    const result = reducer(state, {
      type: 'RELOAD_FILE',
      requests: newRequests,
      variables: [],
    });

    expect(result.selectedIndex).toBe(1);
  });

  it('resets selection to 0 when request name not found', () => {
    const state: AppState = {
      ...createInitialState(),
      requests: sampleRequests,
      selectedIndex: 1,
    };

    const newRequests: ParsedRequest[] = [
      sampleRequests[0],
    ];

    const result = reducer(state, {
      type: 'RELOAD_FILE',
      requests: newRequests,
      variables: [],
    });

    expect(result.selectedIndex).toBe(0);
  });

  it('clears response and error', () => {
    const state: AppState = {
      ...createInitialState(),
      response: {
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        body: 'old data',
        timing: { durationMs: 100 },
        size: { bodyBytes: 8 },
      },
      error: null,
      responseScrollOffset: 5,
    };

    const result = reducer(state, {
      type: 'RELOAD_FILE',
      requests: sampleRequests,
      variables: sampleVariables,
    });

    expect(result.response).toBeNull();
    expect(result.error).toBeNull();
    expect(result.responseScrollOffset).toBe(0);
  });

  it('sets reloadMessage to "Reloaded"', () => {
    const state = createInitialState();
    const result = reducer(state, {
      type: 'RELOAD_FILE',
      requests: sampleRequests,
      variables: sampleVariables,
    });

    expect(result.reloadMessage).toBe('Reloaded');
  });
});

describe('CLEAR_RELOAD_MESSAGE reducer', () => {
  it('clears the reload message', () => {
    const state: AppState = {
      ...createInitialState(),
      reloadMessage: 'Reloaded',
    };

    const result = reducer(state, { type: 'CLEAR_RELOAD_MESSAGE' });

    expect(result.reloadMessage).toBeNull();
  });

  it('does not change other state fields', () => {
    const state: AppState = {
      ...createInitialState(),
      requests: sampleRequests,
      selectedIndex: 2,
      reloadMessage: 'Reloaded',
    };

    const result = reducer(state, { type: 'CLEAR_RELOAD_MESSAGE' });

    expect(result.requests).toEqual(sampleRequests);
    expect(result.selectedIndex).toBe(2);
    expect(result.reloadMessage).toBeNull();
  });
});
