import { describe, expect, it } from 'vitest';

import type { AppState } from '../../src/core/types';
import { createInitialState, reducer } from '../helpers/state';

describe('ENTER_SAVE reducer', () => {
  it('sets mode to saveLoad and clears saveError', () => {
    const state: AppState = {
      ...createInitialState(),
      filePath: '/home/user/collections/MyAPI.json',
      saveError: 'previous error',
    };

    const result = reducer(state, { type: 'ENTER_SAVE' });

    expect(result.mode).toBe('saveLoad');
    expect(result.saveError).toBeNull();
  });

  it('computes default path by replacing extension with .http for .json files', () => {
    const state: AppState = {
      ...createInitialState(),
      filePath: '/home/user/collections/MyAPI.json',
    };

    const result = reducer(state, { type: 'ENTER_SAVE' });

    expect(result.saveInput).toBe('MyAPI.http');
  });

  it('keeps .http extension unchanged for .http files', () => {
    const state: AppState = {
      ...createInitialState(),
      filePath: '/home/user/apis/test.http',
    };

    const result = reducer(state, { type: 'ENTER_SAVE' });

    expect(result.saveInput).toBe('test.http');
  });

  it('replaces any extension with .http using only the file basename', () => {
    const state: AppState = {
      ...createInitialState(),
      filePath: 'path/to/My Collection.json',
    };

    const result = reducer(state, { type: 'ENTER_SAVE' });

    expect(result.saveInput).toBe('My Collection.http');
  });

  it('strips directory components from the default save path', () => {
    const state: AppState = {
      ...createInitialState(),
      filePath: 'examples/basic.http',
    };

    const result = reducer(state, { type: 'ENTER_SAVE' });

    expect(result.saveInput).toBe('basic.http');
  });
});

describe('UPDATE_SAVE_INPUT reducer', () => {
  it('updates saveInput and clears saveError', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'saveLoad',
      saveInput: '/default.http',
      saveError: 'some error',
    };

    const result = reducer(state, { type: 'UPDATE_SAVE_INPUT', value: '/custom/path.http' });

    expect(result.saveInput).toBe('/custom/path.http');
    expect(result.saveError).toBeNull();
  });
});

describe('SET_SAVE_ERROR reducer', () => {
  it('sets saveError to the provided message', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'saveLoad',
      saveInput: '/tmp/output.http',
    };

    const result = reducer(state, { type: 'SET_SAVE_ERROR', error: 'Permission denied' });

    expect(result.saveError).toBe('Permission denied');
    expect(result.mode).toBe('saveLoad');
    expect(result.saveInput).toBe('/tmp/output.http');
  });
});

describe('SAVE_FILE reducer', () => {
  it('resets mode to normal, clears saveInput and saveError, sets transientMessage', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'saveLoad',
      saveInput: '/tmp/output.http',
      saveError: null,
    };

    const result = reducer(state, { type: 'SAVE_FILE', message: 'Saved 5 requests to /tmp/output.http' });

    expect(result.mode).toBe('normal');
    expect(result.saveInput).toBe('');
    expect(result.saveError).toBeNull();
    expect(result.transientMessage).toBe('Saved 5 requests to /tmp/output.http');
  });

  it('clears a previous saveError on successful save', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'saveLoad',
      saveInput: '/tmp/output.http',
      saveError: 'Permission denied',
    };

    const result = reducer(state, { type: 'SAVE_FILE', message: 'Saved 3 requests to /tmp/api.http' });

    expect(result.mode).toBe('normal');
    expect(result.saveError).toBeNull();
    expect(result.transientMessage).toBe('Saved 3 requests to /tmp/api.http');
  });
});

describe('CANCEL_SAVE reducer', () => {
  it('resets mode to normal, clears saveInput and saveError', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'saveLoad',
      saveInput: '/tmp/output.http',
      saveError: 'some error',
    };

    const result = reducer(state, { type: 'CANCEL_SAVE' });

    expect(result.mode).toBe('normal');
    expect(result.saveInput).toBe('');
    expect(result.saveError).toBeNull();
  });

  it('does not change other state fields', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'saveLoad',
      saveInput: '/tmp/output.http',
      filePath: 'original.http',
    };

    const result = reducer(state, { type: 'CANCEL_SAVE' });

    expect(result.filePath).toBe('original.http');
    expect(result.mode).toBe('normal');
  });
});