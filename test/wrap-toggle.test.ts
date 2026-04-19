import { describe, expect, it } from 'vitest';

import { createInitialState, reducer } from './helpers/state';

describe('TOGGLE_WRAP reducer', () => {
  it('resets responseScrollOffset to 0', () => {
    const state = createInitialState({
      responseScrollOffset: 10,
      wrapMode: 'nowrap',
    });
    const result = reducer(state, { type: 'TOGGLE_WRAP' });

    expect(result.responseScrollOffset).toBe(0);
  });

  it('resets responseHorizontalOffset to 0', () => {
    const state = createInitialState({
      responseHorizontalOffset: 20,
      wrapMode: 'nowrap',
    });
    const result = reducer(state, { type: 'TOGGLE_WRAP' });

    expect(result.responseHorizontalOffset).toBe(0);
  });

  it('preserves other state fields', () => {
    const state = createInitialState({
      verbose: true,
      focusedPanel: 'response',
      requests: [
        {
          name: 'Test',
          method: 'GET' as const,
          url: 'https://example.com',
          headers: {},
          body: undefined,
          lineNumber: 1,
        },
      ],
    });
    const result = reducer(state, { type: 'TOGGLE_WRAP' });

    expect(result.verbose).toBe(true);
    expect(result.focusedPanel).toBe('response');
    expect(result.requests).toHaveLength(1);
  });
});