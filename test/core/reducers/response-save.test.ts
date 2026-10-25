import { describe, expect, it } from 'vitest';

import { INITIAL_RESPONSE_SAVE } from '../../../src/core/reducers/helpers';
import { createMockResponse } from '../../helpers/responses';
import { createRequest } from '../../helpers/requests';
import { createInitialState, reducer } from '../../helpers/state';

describe('ENTER_RESPONSE_SAVE reducer', () => {
  it('pre-fills the derived filename with the cursor at the end and clears any previous error', () => {
    const state = createInitialState({
      requests: [createRequest({ name: 'Get Users' })],
      response: createMockResponse({ body: '{"items":[]}' }),
      responseSave: { ...INITIAL_RESPONSE_SAVE, error: 'previous error' },
    });

    const result = reducer(state, { type: 'ENTER_RESPONSE_SAVE' });

    expect(result.mode).toBe('responseSave');
    expect(result.responseSave.input).toBe('Get Users.json');
    expect(result.responseSave.cursor).toBe('Get Users.json'.length);
    expect(result.responseSave.error).toBeNull();
  });

  it('derives the filename from the selected request, not the first request', () => {
    const state = createInitialState({
      requests: [createRequest({ name: 'First' }), createRequest({ name: 'Get Page' })],
      selectedIndex: 1,
      response: createMockResponse({ body: '<html></html>' }),
    });

    const result = reducer(state, { type: 'ENTER_RESPONSE_SAVE' });

    expect(result.responseSave.input).toBe('Get Page.txt');
  });

  it('falls back to .txt when there is no response body', () => {
    const state = createInitialState({
      requests: [createRequest({ name: 'Get Users' })],
      response: null,
    });

    const result = reducer(state, { type: 'ENTER_RESPONSE_SAVE' });

    expect(result.responseSave.input).toBe('Get Users.txt');
  });

  it('does not crash when the request list is empty', () => {
    const state = createInitialState({
      requests: [],
      response: createMockResponse({ body: '{"a":1}' }),
    });

    const result = reducer(state, { type: 'ENTER_RESPONSE_SAVE' });

    expect(result.responseSave.input).toBe('.json');
  });
});

describe('MOVE_RESPONSE_SAVE_CURSOR reducer', () => {
  it('moves the cursor without clearing an existing error', () => {
    const state = createInitialState({
      mode: 'responseSave',
      responseSave: {
        ...INITIAL_RESPONSE_SAVE,
        input: 'Get Users.json',
        cursor: 5,
        error: 'File exists: Get Users.json',
      },
    });

    const result = reducer(state, { type: 'MOVE_RESPONSE_SAVE_CURSOR', cursor: 3 });

    expect(result.responseSave.cursor).toBe(3);
    expect(result.responseSave.input).toBe('Get Users.json');
    expect(result.responseSave.error).toBe('File exists: Get Users.json');
  });
});

describe('SAVE_RESPONSE_FILE reducer', () => {
  it('returns to normal mode, resets the response-save fields, and sets the transient message', () => {
    const state = createInitialState({
      mode: 'responseSave',
      responseSave: { ...INITIAL_RESPONSE_SAVE, input: 'Get Users.json', cursor: 5, error: null },
    });

    const result = reducer(state, { type: 'SAVE_RESPONSE_FILE', message: 'Saved response to Get Users.json' });

    expect(result.mode).toBe('normal');
    expect(result.responseSave.input).toBe('');
    expect(result.responseSave.cursor).toBe(0);
    expect(result.responseSave.error).toBeNull();
    expect(result.transientMessage).toBe('Saved response to Get Users.json');
  });

  it('leaves filePath and per-request isDirty markers untouched', () => {
    const state = createInitialState({
      mode: 'responseSave',
      filePath: '/home/user/apis/api.http',
      responseSave: { ...INITIAL_RESPONSE_SAVE, input: 'Get Users.json' },
      requests: [createRequest({ isDirty: true }), createRequest({ isDirty: false })],
    });

    const result = reducer(state, { type: 'SAVE_RESPONSE_FILE', message: 'Saved response to Get Users.json' });

    expect(result.filePath).toBe('/home/user/apis/api.http');
    expect(result.requests[0].isDirty).toBe(true);
    expect(result.requests[1].isDirty).toBe(false);
  });
});

describe('CANCEL_RESPONSE_SAVE reducer', () => {
  it('returns to normal mode and resets the response-save fields', () => {
    const state = createInitialState({
      mode: 'responseSave',
      responseSave: {
        ...INITIAL_RESPONSE_SAVE,
        input: 'Get Users.json',
        cursor: 5,
        error: 'File exists: Get Users.json',
      },
    });

    const result = reducer(state, { type: 'CANCEL_RESPONSE_SAVE' });

    expect(result.mode).toBe('normal');
    expect(result.responseSave.input).toBe('');
    expect(result.responseSave.cursor).toBe(0);
    expect(result.responseSave.error).toBeNull();
  });
});

describe('responseSave dormancy invariant', () => {
  // Characterization pin: the exit and commit resets already enforce dormancy.
  it('cluster deep-equals INITIAL_RESPONSE_SAVE after every exit/commit action', () => {
    const dirty = createInitialState({
      mode: 'responseSave',
      responseSave: { input: 'stale.json', cursor: 4, error: 'File exists: stale.json' },
    });

    const afterCancel = reducer(dirty, { type: 'CANCEL_RESPONSE_SAVE' });
    expect(afterCancel.mode).toBe('normal');
    expect(afterCancel.responseSave).toEqual(INITIAL_RESPONSE_SAVE);

    const afterSave = reducer(dirty, { type: 'SAVE_RESPONSE_FILE', message: 'Saved response to next.json' });
    expect(afterSave.mode).toBe('normal');
    expect(afterSave.responseSave).toEqual(INITIAL_RESPONSE_SAVE);
  });
});

describe('SET_RESPONSE_SAVE_ERROR reducer', () => {
  it('persists the error until UPDATE_RESPONSE_SAVE_INPUT clears it', () => {
    const state = createInitialState({
      mode: 'responseSave',
      responseSave: { ...INITIAL_RESPONSE_SAVE, input: 'Get Users.json', cursor: 5 },
    });

    const errored = reducer(state, { type: 'SET_RESPONSE_SAVE_ERROR', error: 'File exists: Get Users.json' });
    expect(errored.responseSave.error).toBe('File exists: Get Users.json');
    expect(errored.responseSave.input).toBe('Get Users.json');

    const edited = reducer(errored, { type: 'UPDATE_RESPONSE_SAVE_INPUT', value: 'Get Users 2.json', cursor: 15 });
    expect(edited.responseSave.error).toBeNull();
    expect(edited.responseSave.input).toBe('Get Users 2.json');
    expect(edited.responseSave.cursor).toBe(15);
  });
});
