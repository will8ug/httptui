import { describe, expect, it } from 'vitest';

import { hasUnsavedChanges } from '../../../src/utils/request';
import type { AppState } from '../../../src/core/types';
import { INITIAL_SAVE_LOAD } from '../../../src/core/reducers/helpers';
import { createRequest } from '../../helpers/requests';
import { createInitialState, reducer } from '../../helpers/state';

describe('ENTER_SAVE reducer', () => {
  it('sets mode to saveLoad and clears the error', () => {
    const state: AppState = {
      ...createInitialState(),
      filePath: '/home/user/collections/MyAPI.json',
      saveLoad: { ...INITIAL_SAVE_LOAD, error: 'previous error' },
    };

    const result = reducer(state, { type: 'ENTER_SAVE' });

    expect(result.mode).toBe('saveLoad');
    expect(result.saveLoad.error).toBeNull();
  });

  it('computes default path by replacing extension with .http for .json files', () => {
    const state: AppState = {
      ...createInitialState(),
      filePath: '/home/user/collections/MyAPI.json',
    };

    const result = reducer(state, { type: 'ENTER_SAVE' });

    expect(result.saveLoad.input).toBe('MyAPI.http');
    expect(result.saveLoad.cursor).toBe('MyAPI.http'.length);
  });

  it('keeps .http extension unchanged for .http files', () => {
    const state: AppState = {
      ...createInitialState(),
      filePath: '/home/user/apis/test.http',
    };

    const result = reducer(state, { type: 'ENTER_SAVE' });

    expect(result.saveLoad.input).toBe('test.http');
  });

  it('replaces any extension with .http using only the file basename', () => {
    const state: AppState = {
      ...createInitialState(),
      filePath: 'path/to/My Collection.json',
    };

    const result = reducer(state, { type: 'ENTER_SAVE' });

    expect(result.saveLoad.input).toBe('My Collection.http');
  });

  it('strips directory components from the default save path', () => {
    const state: AppState = {
      ...createInitialState(),
      filePath: 'examples/basic.http',
    };

    const result = reducer(state, { type: 'ENTER_SAVE' });

    expect(result.saveLoad.input).toBe('basic.http');
  });
});

describe('SAVE_KEY reducer', () => {
  it('applies the op to the cluster buffer and clears the error', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'saveLoad',
      saveLoad: { ...INITIAL_SAVE_LOAD, input: '/default.http', cursor: 1, error: 'some error' },
    };

    const result = reducer(state, { type: 'SAVE_KEY', op: 'insert', insert: 'X' });

    expect(result.saveLoad.input).toBe('/Xdefault.http');
    expect(result.saveLoad.cursor).toBe(2);
    expect(result.saveLoad.error).toBeNull();
  });

  it('applies cursor motions without modifying saveLoad input', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'saveLoad',
      saveLoad: { ...INITIAL_SAVE_LOAD, input: '/tmp/output.http', cursor: 5 },
    };

    const result = reducer(state, { type: 'SAVE_KEY', op: 'left' });

    expect(result.saveLoad.cursor).toBe(4);
    expect(result.saveLoad.input).toBe('/tmp/output.http');
  });

  it('does not clear the error on cursor motions', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'saveLoad',
      saveLoad: { ...INITIAL_SAVE_LOAD, input: '/tmp/output.http', cursor: 5, error: 'Permission denied' },
    };

    const result = reducer(state, { type: 'SAVE_KEY', op: 'lineStart' });

    expect(result.saveLoad.cursor).toBe(0);
    expect(result.saveLoad.error).toBe('Permission denied');
  });
});

describe('SET_SAVE_ERROR reducer', () => {
  it('sets the error to the provided message', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'saveLoad',
      saveLoad: { ...INITIAL_SAVE_LOAD, input: '/tmp/output.http' },
    };

    const result = reducer(state, { type: 'SET_SAVE_ERROR', error: 'Permission denied' });

    expect(result.saveLoad.error).toBe('Permission denied');
    expect(result.mode).toBe('saveLoad');
    expect(result.saveLoad.input).toBe('/tmp/output.http');
  });
});

describe('saveLoad dormancy invariant', () => {
  // Characterization pin: the exit and commit resets already enforce dormancy.
  it('cluster deep-equals INITIAL_SAVE_LOAD after every exit/commit action', () => {
    const dirty: AppState = {
      ...createInitialState(),
      mode: 'saveLoad',
      saveLoad: { input: 'stale.http', cursor: 4, error: 'Permission denied' },
    };

    const afterCancel = reducer(dirty, { type: 'CANCEL_SAVE' });
    expect(afterCancel.mode).toBe('normal');
    expect(afterCancel.saveLoad).toEqual(INITIAL_SAVE_LOAD);

    const afterSave = reducer(dirty, {
      type: 'SAVE_FILE',
      message: 'Saved 5 requests to next.http',
      filePath: 'next.http',
    });
    expect(afterSave.mode).toBe('normal');
    expect(afterSave.saveLoad).toEqual(INITIAL_SAVE_LOAD);
  });
});

describe('SAVE_FILE reducer', () => {
  it('resets mode to normal, clears the input and error, sets transientMessage', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'saveLoad',
      saveLoad: { ...INITIAL_SAVE_LOAD, input: '/tmp/output.http', error: null },
    };

    const result = reducer(state, { type: 'SAVE_FILE', message: 'Saved 5 requests to /tmp/output.http', filePath: '/tmp/output.http' });

    expect(result.mode).toBe('normal');
    expect(result.saveLoad.input).toBe('');
    expect(result.saveLoad.error).toBeNull();
    expect(result.transientMessage).toBe('Saved 5 requests to /tmp/output.http');
    expect(result.filePath).toBe('/tmp/output.http');
  });

  it('clears a previous error on successful save', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'saveLoad',
      saveLoad: { ...INITIAL_SAVE_LOAD, input: '/tmp/output.http', error: 'Permission denied' },
    };

    const result = reducer(state, { type: 'SAVE_FILE', message: 'Saved 3 requests to /tmp/api.http', filePath: '/tmp/api.http' });

    expect(result.mode).toBe('normal');
    expect(result.saveLoad.error).toBeNull();
    expect(result.transientMessage).toBe('Saved 3 requests to /tmp/api.http');
    expect(result.filePath).toBe('/tmp/api.http');
  });

  it('clears a previous transientError on successful save', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'saveLoad',
      transientError: 'Save failed',
    };

    const result = reducer(state, { type: 'SAVE_FILE', message: 'Saved 3 requests to /tmp/api.http', filePath: '/tmp/api.http' });

    expect(result.transientError).toBeNull();
    expect(result.filePath).toBe('/tmp/api.http');
  });

  it('rebinds filePath to the written path on save-as', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'saveLoad',
      saveLoad: { ...INITIAL_SAVE_LOAD, input: 'api.http' },
      filePath: 'api.http',
    };

    const result = reducer(state, { type: 'SAVE_FILE', message: 'Saved 2 requests to api - 1.http', filePath: 'api - 1.http' });

    expect(result.filePath).toBe('api - 1.http');
    expect(hasUnsavedChanges(result.requests)).toBe(false);
  });

  it('clears per-request dirty markers after a successful save', () => {
    const state: AppState = {
      ...createInitialState({
        requests: [createRequest({ isDirty: true }), createRequest({ isDirty: true })],
      }),
      mode: 'saveLoad',
      saveLoad: { ...INITIAL_SAVE_LOAD, input: 'api.http' },
      filePath: 'api.http',
    };

    const result = reducer(state, { type: 'SAVE_FILE', message: 'Saved 2 requests to api.http', filePath: 'api.http' });

    expect(result.requests.every((r) => r.isDirty === false)).toBe(true);
    expect(hasUnsavedChanges(result.requests)).toBe(false);
  });
});

describe('CANCEL_SAVE reducer', () => {
  it('resets mode to normal, clears the input and error', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'saveLoad',
      saveLoad: { ...INITIAL_SAVE_LOAD, input: '/tmp/output.http', error: 'some error' },
    };

    const result = reducer(state, { type: 'CANCEL_SAVE' });

    expect(result.mode).toBe('normal');
    expect(result.saveLoad.input).toBe('');
    expect(result.saveLoad.error).toBeNull();
  });

  it('does not change other state fields', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'saveLoad',
      saveLoad: { ...INITIAL_SAVE_LOAD, input: '/tmp/output.http' },
      filePath: 'original.http',
    };

    const result = reducer(state, { type: 'CANCEL_SAVE' });

    expect(result.filePath).toBe('original.http');
    expect(result.mode).toBe('normal');
  });
});
