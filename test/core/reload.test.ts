import { describe, expect, it } from 'vitest';

import type { AppState, ParsedRequest } from '../../src/core/types';
import { sampleRequests, sampleVariables, toVarMap } from '../helpers/fixtures';
import { createInitialState, reducer } from '../helpers/state';

describe('RELOAD_FILE reducer', () => {
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

  it('clears response, error, and scroll offsets', () => {
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
      requestScrollOffset: 3,
      detailsScrollOffset: 2,
      detailsHorizontalOffset: 4,
    };

    const result = reducer(state, {
      type: 'RELOAD_FILE',
      requests: sampleRequests,
      variables: sampleVariables,
    });

    expect(result.response).toBeNull();
    expect(result.error).toBeNull();
    expect(result.responseScrollOffset).toBe(0);
    expect(result.requestScrollOffset).toBe(0);
    expect(result.detailsScrollOffset).toBe(0);
    expect(result.detailsHorizontalOffset).toBe(0);
  });
});

describe('CLEAR_RELOAD_MESSAGE reducer', () => {
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

describe('RELOAD_FILE preserves pristine file variables for later (none) switch', () => {
  it('after reloading the current file with an active env, switching to (none) falls back to the new file variables', () => {
    const state: AppState = {
      ...createInitialState(),
      requests: sampleRequests,
      environmentVariables: [{ name: 'baseUrl', value: 'from-env' }],
      variables: [{ name: 'baseUrl', value: 'from-env' }],
      fileVariables: [{ name: 'baseUrl', value: 'old-file-value' }],
      activeEnvName: 'Staging',
    };

    const afterReload = reducer(state, {
      type: 'RELOAD_FILE',
      requests: sampleRequests,
      variables: [{ name: 'baseUrl', value: 'new-file-value' }],
    });

    expect(afterReload.fileVariables).toEqual([{ name: 'baseUrl', value: 'new-file-value' }]);

    expect(toVarMap(afterReload.variables).get('baseUrl')).toBe('from-env');

    const afterNone = reducer(afterReload, {
      type: 'SWITCH_ENV',
      environmentVariables: [],
      envName: null,
    });

    expect(afterNone.activeEnvName).toBeNull();
    expect(afterNone.environmentVariables).toEqual([]);
    expect(toVarMap(afterNone.variables).get('baseUrl')).toBe('new-file-value');
  });
});