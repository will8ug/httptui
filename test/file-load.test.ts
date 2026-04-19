import { describe, expect, it } from 'vitest';

import { createRequest } from './helpers/requests';
import { createInitialState, reducer } from './helpers/state';
import type { Action, AppState, ParsedRequest, FileVariable } from '../src/core/types';

const sampleRequests: ParsedRequest[] = [
  createRequest({ name: 'Get users', method: 'GET', url: 'https://api.example.com/users', lineNumber: 1 }),
  createRequest({
    name: 'Create user',
    method: 'POST',
    url: 'https://api.example.com/users',
    headers: { 'Content-Type': 'application/json' },
    body: '{"name":"John"}',
    lineNumber: 8,
  }),
];

const sampleVariables: FileVariable[] = [
  { name: 'baseUrl', value: 'https://api.example.com' },
];

describe('ENTER_FILE_LOAD reducer', () => {
  it('sets mode to fileLoad and clears input and error', () => {
    const state = createInitialState();
    const action: Action = { type: 'ENTER_FILE_LOAD' };
    const result = reducer(state, action);

    expect(result.mode).toBe('fileLoad');
    expect(result.fileLoadInput).toBe('');
    expect(result.fileLoadError).toBeNull();
  });

  it('clears previous input and error when entering file-load mode', () => {
    const state: AppState = {
      ...createInitialState(),
      fileLoadInput: 'stale path',
      fileLoadError: 'stale error',
    };

    const result = reducer(state, { type: 'ENTER_FILE_LOAD' });

    expect(result.fileLoadInput).toBe('');
    expect(result.fileLoadError).toBeNull();
  });
});

describe('UPDATE_FILE_LOAD_INPUT reducer', () => {
  it('appends characters to the input', () => {
    const state: AppState = { ...createInitialState(), mode: 'fileLoad', fileLoadInput: 'path' };
    const result = reducer(state, { type: 'UPDATE_FILE_LOAD_INPUT', value: 'path/to' });

    expect(result.fileLoadInput).toBe('path/to');
  });
});

describe('SET_FILE_LOAD_ERROR reducer', () => {
  it('sets the error message', () => {
    const state: AppState = { ...createInitialState(), mode: 'fileLoad' };
    const result = reducer(state, { type: 'SET_FILE_LOAD_ERROR', error: 'File not found: bad.http' });

    expect(result.fileLoadError).toBe('File not found: bad.http');
  });

  it('stays in fileLoad mode after error', () => {
    const state: AppState = { ...createInitialState(), mode: 'fileLoad', fileLoadInput: 'bad.http' };
    const result = reducer(state, { type: 'SET_FILE_LOAD_ERROR', error: 'File not found: bad.http' });

    expect(result.mode).toBe('fileLoad');
    expect(result.fileLoadInput).toBe('bad.http');
  });
});

describe('LOAD_FILE reducer', () => {
  it('replaces requests, variables, and filePath', () => {
    const state = createInitialState();
    const result = reducer(state, {
      type: 'LOAD_FILE',
      requests: sampleRequests,
      variables: sampleVariables,
      filePath: '/new/path/api.http',
    });

    expect(result.requests).toEqual(sampleRequests);
    expect(result.variables).toEqual(sampleVariables);
    expect(result.filePath).toBe('/new/path/api.http');
  });

  it('preserves selection by name when request still exists', () => {
    const state: AppState = {
      ...createInitialState(),
      requests: sampleRequests,
      selectedIndex: 1,
    };

    const result = reducer(state, {
      type: 'LOAD_FILE',
      requests: sampleRequests,
      variables: sampleVariables,
      filePath: 'other.http',
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
      { name: 'Different request', method: 'GET', url: 'https://new.api/other', headers: {}, body: undefined, lineNumber: 1 },
    ];

    const result = reducer(state, {
      type: 'LOAD_FILE',
      requests: newRequests,
      variables: [],
      filePath: 'other.http',
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
    };

    const result = reducer(state, {
      type: 'LOAD_FILE',
      requests: sampleRequests,
      variables: sampleVariables,
      filePath: 'new.http',
    });

    expect(result.response).toBeNull();
    expect(result.error).toBeNull();
    expect(result.responseScrollOffset).toBe(0);
    expect(result.requestScrollOffset).toBe(0);
  });

  it('sets mode to normal and clears fileLoadInput and fileLoadError', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'fileLoad',
      fileLoadInput: 'some/path.http',
      fileLoadError: null,
    };

    const result = reducer(state, {
      type: 'LOAD_FILE',
      requests: sampleRequests,
      variables: sampleVariables,
      filePath: 'some/path.http',
    });

    expect(result.mode).toBe('normal');
    expect(result.fileLoadInput).toBe('');
    expect(result.fileLoadError).toBeNull();
  });

  it('sets reloadMessage with basename of filePath', () => {
    const state = createInitialState();
    const result = reducer(state, {
      type: 'LOAD_FILE',
      requests: sampleRequests,
      variables: sampleVariables,
      filePath: '/some/deep/path/api.http',
    });

    expect(result.reloadMessage).toBe('Loaded: api.http');
  });
});

describe('CANCEL_FILE_LOAD reducer', () => {
  it('resets mode to normal and clears input and error', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'fileLoad',
      fileLoadInput: 'partial/path',
      fileLoadError: 'some error',
    };

    const result = reducer(state, { type: 'CANCEL_FILE_LOAD' });

    expect(result.mode).toBe('normal');
    expect(result.fileLoadInput).toBe('');
    expect(result.fileLoadError).toBeNull();
  });

  it('does not change existing requests or filePath', () => {
    const state: AppState = {
      ...createInitialState(),
      mode: 'fileLoad',
      requests: sampleRequests,
      filePath: 'original.http',
    };

    const result = reducer(state, { type: 'CANCEL_FILE_LOAD' });

    expect(result.requests).toEqual(sampleRequests);
    expect(result.filePath).toBe('original.http');
  });
});
