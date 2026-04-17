import { describe, expect, it } from 'vitest';

import type { Action, AppState } from '../src/core/types';

function createInitialState(): AppState {
  return {
    requests: [],
    variables: [],
    selectedIndex: 0,
    focusedPanel: 'requests' as const,
    response: null,
    isLoading: false,
    error: null,
    insecure: false,
    verbose: false,
    showHelp: false,
    filePath: 'test.http',
    responseScrollOffset: 0,
    requestScrollOffset: 0,
    requestHorizontalOffset: 0,
    responseHorizontalOffset: 0,
    showRequestDetails: false,
    rawMode: false,
    detailsScrollOffset: 0,
    detailsHorizontalOffset: 0,
    reloadMessage: null,
    mode: 'normal' as const,
    fileLoadInput: '',
    fileLoadError: null,
    wrapMode: 'nowrap' as const,
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'TOGGLE_WRAP':
      return {
        ...state,
        wrapMode: state.wrapMode === 'nowrap' ? 'wrap' : 'nowrap',
        responseScrollOffset: 0,
        responseHorizontalOffset: 0,
      };

    default:
      return state;
  }
}

describe('TOGGLE_WRAP reducer', () => {
  it('toggles from nowrap to wrap', () => {
    const state = createInitialState();
    const result = reducer(state, { type: 'TOGGLE_WRAP' });

    expect(result.wrapMode).toBe('wrap');
  });

  it('toggles from wrap to nowrap', () => {
    const state: AppState = { ...createInitialState(), wrapMode: 'wrap' };
    const result = reducer(state, { type: 'TOGGLE_WRAP' });

    expect(result.wrapMode).toBe('nowrap');
  });

  it('resets responseScrollOffset to 0', () => {
    const state: AppState = {
      ...createInitialState(),
      responseScrollOffset: 10,
      wrapMode: 'nowrap',
    };
    const result = reducer(state, { type: 'TOGGLE_WRAP' });

    expect(result.responseScrollOffset).toBe(0);
  });

  it('resets responseHorizontalOffset to 0', () => {
    const state: AppState = {
      ...createInitialState(),
      responseHorizontalOffset: 20,
      wrapMode: 'nowrap',
    };
    const result = reducer(state, { type: 'TOGGLE_WRAP' });

    expect(result.responseHorizontalOffset).toBe(0);
  });

  it('preserves other state fields', () => {
    const state: AppState = {
      ...createInitialState(),
      verbose: true,
      focusedPanel: 'response',
      requests: [
        {
          name: 'Test',
          method: 'GET',
          url: 'https://example.com',
          headers: {},
          body: undefined,
          lineNumber: 1,
        },
      ],
    };
    const result = reducer(state, { type: 'TOGGLE_WRAP' });

    expect(result.verbose).toBe(true);
    expect(result.focusedPanel).toBe('response');
    expect(result.requests).toHaveLength(1);
  });
});
