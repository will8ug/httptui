import { describe, expect, it } from 'vitest';

import { createInitialState, reducer } from '../helpers/state';

describe('TOGGLE_FULLSCREEN reducer', () => {
  it('entering response fullscreen resets responseScrollOffset and responseHorizontalOffset', () => {
    const state = createInitialState({
      maximizedPanel: null,
      focusedPanel: 'response',
      responseScrollOffset: 7,
      responseHorizontalOffset: 5,
    });
    const result = reducer(state, { type: 'TOGGLE_FULLSCREEN' });

    expect(result.maximizedPanel).toBe('response');
    expect(result.responseScrollOffset).toBe(0);
    expect(result.responseHorizontalOffset).toBe(0);
  });

  it('exiting response fullscreen resets responseScrollOffset and responseHorizontalOffset', () => {
    const state = createInitialState({
      maximizedPanel: 'response',
      focusedPanel: 'response',
      responseScrollOffset: 7,
      responseHorizontalOffset: 5,
    });
    const result = reducer(state, { type: 'TOGGLE_FULLSCREEN' });

    expect(result.maximizedPanel).toBe(null);
    expect(result.responseScrollOffset).toBe(0);
    expect(result.responseHorizontalOffset).toBe(0);
  });

  it('entering requests fullscreen leaves responseScrollOffset unchanged', () => {
    const state = createInitialState({
      maximizedPanel: null,
      focusedPanel: 'requests',
      responseScrollOffset: 7,
    });
    const result = reducer(state, { type: 'TOGGLE_FULLSCREEN' });

    expect(result.maximizedPanel).toBe('requests');
    expect(result.responseScrollOffset).toBe(7);
  });

  it('entering details fullscreen leaves responseScrollOffset unchanged', () => {
    const state = createInitialState({
      maximizedPanel: null,
      focusedPanel: 'details',
      responseScrollOffset: 7,
    });
    const result = reducer(state, { type: 'TOGGLE_FULLSCREEN' });

    expect(result.maximizedPanel).toBe('details');
    expect(result.responseScrollOffset).toBe(7);
  });
});
