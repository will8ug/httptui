import { describe, expect, it } from 'vitest';

import { deriveResponseSaveFilename } from '../../src/core/response-save';
import { createMockResponse } from '../helpers/responses';
import { createRequest } from '../helpers/requests';
import { createInitialState, reducer } from '../helpers/state';

describe('deriveResponseSaveFilename', () => {
  it('appends .json when the body parses as JSON', () => {
    expect(deriveResponseSaveFilename('Get Users', '{"a":1}')).toBe('Get Users.json');
  });

  it('appends .txt when the body is not JSON', () => {
    expect(deriveResponseSaveFilename('Get Users', '<html/>')).toBe('Get Users.txt');
  });

  it('replaces every slash in a Postman-style folder name with a hyphen', () => {
    expect(deriveResponseSaveFilename('Auth / Login', '<html/>')).toBe('Auth - Login.txt');
  });

  it('chooses .json for a JSON body regardless of the request name', () => {
    expect(deriveResponseSaveFilename('Auth / Login', '{"a":1}')).toBe('Auth - Login.json');
  });

  it('replaces multiple slashes in the request name', () => {
    expect(deriveResponseSaveFilename('A / B / C', 'plain text')).toBe('A - B - C.txt');
  });

  it('treats an empty body as non-JSON', () => {
    expect(deriveResponseSaveFilename('Get Users', '')).toBe('Get Users.txt');
  });
});

describe('ENTER_RESPONSE_SAVE reducer', () => {
  it('pre-fills the derived filename with the cursor at the end and clears any previous error', () => {
    const state = createInitialState({
      requests: [createRequest({ name: 'Get Users' })],
      response: createMockResponse({ body: '{"items":[]}' }),
      responseSaveError: 'previous error',
    });

    const result = reducer(state, { type: 'ENTER_RESPONSE_SAVE' });

    expect(result.mode).toBe('responseSave');
    expect(result.responseSaveInput).toBe('Get Users.json');
    expect(result.responseSaveCursor).toBe('Get Users.json'.length);
    expect(result.responseSaveError).toBeNull();
  });

  it('derives the filename from the selected request, not the first request', () => {
    const state = createInitialState({
      requests: [createRequest({ name: 'First' }), createRequest({ name: 'Get Page' })],
      selectedIndex: 1,
      response: createMockResponse({ body: '<html></html>' }),
    });

    const result = reducer(state, { type: 'ENTER_RESPONSE_SAVE' });

    expect(result.responseSaveInput).toBe('Get Page.txt');
  });

  it('falls back to .txt when there is no response body', () => {
    const state = createInitialState({
      requests: [createRequest({ name: 'Get Users' })],
      response: null,
    });

    const result = reducer(state, { type: 'ENTER_RESPONSE_SAVE' });

    expect(result.responseSaveInput).toBe('Get Users.txt');
  });

  it('does not crash when the request list is empty', () => {
    const state = createInitialState({
      requests: [],
      response: createMockResponse({ body: '{"a":1}' }),
    });

    const result = reducer(state, { type: 'ENTER_RESPONSE_SAVE' });

    expect(result.responseSaveInput).toBe('.json');
  });
});

describe('MOVE_RESPONSE_SAVE_CURSOR reducer', () => {
  it('moves the cursor without clearing an existing error', () => {
    const state = createInitialState({
      mode: 'responseSave',
      responseSaveInput: 'Get Users.json',
      responseSaveCursor: 5,
      responseSaveError: 'File exists: Get Users.json',
    });

    const result = reducer(state, { type: 'MOVE_RESPONSE_SAVE_CURSOR', cursor: 3 });

    expect(result.responseSaveCursor).toBe(3);
    expect(result.responseSaveInput).toBe('Get Users.json');
    expect(result.responseSaveError).toBe('File exists: Get Users.json');
  });
});

describe('SAVE_RESPONSE_FILE reducer', () => {
  it('returns to normal mode, resets the response-save fields, and sets the transient message', () => {
    const state = createInitialState({
      mode: 'responseSave',
      responseSaveInput: 'Get Users.json',
      responseSaveCursor: 5,
      responseSaveError: null,
    });

    const result = reducer(state, { type: 'SAVE_RESPONSE_FILE', message: 'Saved response to Get Users.json' });

    expect(result.mode).toBe('normal');
    expect(result.responseSaveInput).toBe('');
    expect(result.responseSaveCursor).toBe(0);
    expect(result.responseSaveError).toBeNull();
    expect(result.transientMessage).toBe('Saved response to Get Users.json');
  });

  it('leaves filePath and per-request isDirty markers untouched', () => {
    const state = createInitialState({
      mode: 'responseSave',
      filePath: '/home/user/apis/api.http',
      responseSaveInput: 'Get Users.json',
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
      responseSaveInput: 'Get Users.json',
      responseSaveCursor: 5,
      responseSaveError: 'File exists: Get Users.json',
    });

    const result = reducer(state, { type: 'CANCEL_RESPONSE_SAVE' });

    expect(result.mode).toBe('normal');
    expect(result.responseSaveInput).toBe('');
    expect(result.responseSaveCursor).toBe(0);
    expect(result.responseSaveError).toBeNull();
  });
});

describe('SET_RESPONSE_SAVE_ERROR reducer', () => {
  it('persists the error until UPDATE_RESPONSE_SAVE_INPUT clears it', () => {
    const state = createInitialState({
      mode: 'responseSave',
      responseSaveInput: 'Get Users.json',
      responseSaveCursor: 5,
    });

    const errored = reducer(state, { type: 'SET_RESPONSE_SAVE_ERROR', error: 'File exists: Get Users.json' });
    expect(errored.responseSaveError).toBe('File exists: Get Users.json');
    expect(errored.responseSaveInput).toBe('Get Users.json');

    const edited = reducer(errored, { type: 'UPDATE_RESPONSE_SAVE_INPUT', value: 'Get Users 2.json', cursor: 15 });
    expect(edited.responseSaveError).toBeNull();
    expect(edited.responseSaveInput).toBe('Get Users 2.json');
    expect(edited.responseSaveCursor).toBe(15);
  });
});
