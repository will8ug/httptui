import { describe, expect, it } from 'vitest';

import { createInitialState, reducer } from '../helpers/state';

describe('transient channel exclusivity', () => {
  it('initializes transientWarning to null', () => {
    expect(createInitialState().transientWarning).toBeNull();
  });

  it('SET_TRANSIENT_WARNING sets the warning and clears message and error', () => {
    const state = {
      ...createInitialState(),
      transientMessage: 'Pasted request',
      transientError: 'Read failed',
    };

    const result = reducer(state, { type: 'SET_TRANSIENT_WARNING', warning: 'Pasted request — some curl options were skipped' });

    expect(result.transientWarning).toBe('Pasted request — some curl options were skipped');
    expect(result.transientMessage).toBeNull();
    expect(result.transientError).toBeNull();
  });

  it('SET_TRANSIENT_ERROR sets the error and clears message and warning', () => {
    const state = {
      ...createInitialState(),
      transientMessage: 'Pasted request',
      transientWarning: 'Pasted request — some curl options were skipped',
    };

    const result = reducer(state, { type: 'SET_TRANSIENT_ERROR', error: 'Not a curl command' });

    expect(result.transientError).toBe('Not a curl command');
    expect(result.transientMessage).toBeNull();
    expect(result.transientWarning).toBeNull();
  });

  it('SET_TRANSIENT_MESSAGE sets the message and clears warning and error', () => {
    const state = {
      ...createInitialState(),
      transientError: 'Read failed',
      transientWarning: 'Pasted request — some curl options were skipped',
    };

    const result = reducer(state, { type: 'SET_TRANSIENT_MESSAGE', message: 'Pasted request' });

    expect(result.transientMessage).toBe('Pasted request');
    expect(result.transientError).toBeNull();
    expect(result.transientWarning).toBeNull();
  });

  it('CLEAR_TRANSIENT_MESSAGE clears all three transient channels', () => {
    const state = {
      ...createInitialState(),
      transientMessage: 'Pasted request',
      transientError: 'Read failed',
      transientWarning: 'Pasted request — some curl options were skipped',
    };

    const result = reducer(state, { type: 'CLEAR_TRANSIENT_MESSAGE' });

    expect(result.transientMessage).toBeNull();
    expect(result.transientError).toBeNull();
    expect(result.transientWarning).toBeNull();
  });

  it('SET_TRANSIENT_WARNING leaves the rest of the state unchanged', () => {
    const state = {
      ...createInitialState(),
      transientMessage: 'Pasted request',
      selectedIndex: 2,
      isLoading: true,
    };

    const result = reducer(state, { type: 'SET_TRANSIENT_WARNING', warning: 'warned' });

    expect(result.selectedIndex).toBe(2);
    expect(result.isLoading).toBe(true);
  });
});
