import { describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { handleNormalInput, handleResponseSaveInput, handleSaveInput } from '../../src/app/input-handlers';
import type { Action, AppState } from '../../src/core/types';
import { makeKey } from '../helpers/keys';
import { createMockResponse } from '../helpers/responses';
import { createRequest } from '../helpers/requests';
import { createInitialState } from '../helpers/state';

function pressNormalS(state: AppState, dispatch: (action: Action) => void): void {
  handleNormalInput({
    state,
    selectedRequest: undefined,
    columns: 80,
    rows: 24,
    effectiveResponseHeight: 10,
    effectiveDetailMaxContent: 40,
    editorVisibleHeight: 10,
    editorContentWidth: 40,
    exit: () => {},
    suspend: vi.fn(),
    executorConfig: { insecure: false },
    clipboardRunner: undefined,
    clipboardReadRunner: undefined,
    abortControllerRef: { current: null },
    input: 's',
    key: makeKey(),
    dispatch,
  });
}

describe('handleResponseSaveInput', () => {
  it('writes the raw body with the original CRLF line endings, not the normalized body', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-save-resp-unit-'));
    try {
      const state = createInitialState({
        filePath: join(tmpDir, 'api.http'),
        mode: 'responseSave',
        responseSaveInput: 'resp.txt',
        responseSaveCursor: 'resp.txt'.length,
        response: createMockResponse({ body: 'line1\nline2', rawBody: 'line1\r\nline2' }),
      });

      handleResponseSaveInput({ state, input: '', key: makeKey({ return: true }), dispatch: vi.fn() });

      expect(readFileSync(join(tmpDir, 'resp.txt'), 'utf8')).toBe('line1\r\nline2');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('Enter with an existing target dispatches SET_RESPONSE_SAVE_ERROR and does not overwrite', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-save-resp-unit-'));
    try {
      writeFileSync(join(tmpDir, 'resp.txt'), 'existing content', 'utf8');
      const state = createInitialState({
        filePath: join(tmpDir, 'api.http'),
        mode: 'responseSave',
        responseSaveInput: 'resp.txt',
        responseSaveCursor: 'resp.txt'.length,
        response: createMockResponse({ body: 'new body', rawBody: 'new body' }),
      });
      const dispatch = vi.fn();

      handleResponseSaveInput({ state, input: '', key: makeKey({ return: true }), dispatch });

      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_RESPONSE_SAVE_ERROR', error: 'File exists: resp.txt' });
      expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'SAVE_RESPONSE_FILE' }));
      expect(readFileSync(join(tmpDir, 'resp.txt'), 'utf8')).toBe('existing content');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('handleNormalInput s guard', () => {
  it('refuses an empty-body response with a transient message and does not enter the overlay', () => {
    const state = createInitialState({
      requests: [createRequest({ name: 'Head Users' })],
      response: createMockResponse({ statusCode: 204, body: '', rawBody: '' }),
    });
    const dispatch = vi.fn();

    pressNormalS(state, dispatch);

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_TRANSIENT_MESSAGE', message: 'No response body to save' });
    expect(dispatch).not.toHaveBeenCalledWith({ type: 'ENTER_RESPONSE_SAVE' });
  });

  it('still reports No response to save when no response is displayed', () => {
    const state = createInitialState({ response: null });
    const dispatch = vi.fn();

    pressNormalS(state, dispatch);

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_TRANSIENT_MESSAGE', message: 'No response to save' });
    expect(dispatch).not.toHaveBeenCalledWith({ type: 'ENTER_RESPONSE_SAVE' });
  });

  it('enters the response-save overlay when the response has a non-empty body', () => {
    const state = createInitialState({
      requests: [createRequest({ name: 'Get Users' })],
      response: createMockResponse({ body: '{"a":1}', rawBody: '{"a":1}' }),
    });
    const dispatch = vi.fn();

    pressNormalS(state, dispatch);

    expect(dispatch).toHaveBeenCalledWith({ type: 'ENTER_RESPONSE_SAVE' });
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_TRANSIENT_MESSAGE' }));
  });
});

describe('s-key mode isolation', () => {
  it('s while the save-as overlay is open types into the save path', () => {
    const state = createInitialState({
      mode: 'saveLoad',
      saveInput: 'api.http',
      saveCursor: 'api.http'.length,
      response: createMockResponse({ body: '{"a":1}', rawBody: '{"a":1}' }),
    });
    const dispatched: Action[] = [];

    handleSaveInput({
      state,
      input: 's',
      key: makeKey(),
      dispatch: (action) => dispatched.push(action),
    });

    expect(dispatched).toEqual([{ type: 'UPDATE_SAVE_INPUT', value: 'api.https', cursor: 9 }]);
  });

  it('s while the response-save overlay is open inserts the character into the path', () => {
    const state = createInitialState({
      mode: 'responseSave',
      responseSaveInput: 'Get Users.json',
      responseSaveCursor: 'Get Users.json'.length,
      response: createMockResponse({ body: '{"a":1}', rawBody: '{"a":1}' }),
    });
    const dispatched: Action[] = [];

    handleResponseSaveInput({
      state,
      input: 's',
      key: makeKey(),
      dispatch: (action) => dispatched.push(action),
    });

    expect(dispatched).toEqual([{ type: 'UPDATE_RESPONSE_SAVE_INPUT', value: 'Get Users.jsons', cursor: 15 }]);
  });
});

