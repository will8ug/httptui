import { describe, expect, it } from 'vitest';

import { createMockResponse } from '../helpers/responses';
import { createInitialState, reducer } from '../helpers/state';

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
