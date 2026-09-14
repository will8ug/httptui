import { describe, expect, it, vi } from 'vitest';
import type { Key } from 'ink';

import { handleFileLoadInput, handleNormalInput, handleSaveInput } from '../../src/app/input-handlers';
import type { Action, AppState } from '../../src/core/types';
import { makeKey } from '../helpers/keys';
import { createInitialState } from '../helpers/state';

function saveState(overrides: Partial<AppState> = {}): AppState {
  return createInitialState({
    mode: 'saveLoad',
    saveInput: 'api.http',
    saveCursor: 'api.http'.length,
    ...overrides,
  });
}

function pressSaveKey(state: AppState, input: string, key: Key = makeKey()): Action[] {
  const dispatched: Action[] = [];
  handleSaveInput({
    state,
    input,
    key,
    dispatch: (action) => dispatched.push(action),
  });
  return dispatched;
}

function pressNormalKey(state: AppState, input: string, key: Key = makeKey()): Action[] {
  const dispatched: Action[] = [];
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
    input,
    key,
    dispatch: (action) => dispatched.push(action),
  });
  return dispatched;
}

describe('handleNormalInput S', () => {
  it('enters save mode', () => {
    const actions = pressNormalKey(createInitialState(), 'S');

    expect(actions).toEqual([{ type: 'ENTER_SAVE' }]);
  });
});

describe('S-key mode isolation', () => {
  it('S while the file-load overlay is open types into the file path', () => {
    const dispatched: Action[] = [];

    handleFileLoadInput({
      state: createInitialState({
        mode: 'fileLoad',
        fileLoadInput: 'api.http',
        fileLoadCursor: 'api.http'.length,
      }),
      input: 'S',
      key: makeKey(),
      executorConfig: { insecure: false },
      dispatch: (action) => dispatched.push(action),
    });

    expect(dispatched).toEqual([{ type: 'UPDATE_FILE_LOAD_INPUT', value: 'api.httpS', cursor: 9 }]);
    expect(dispatched).not.toContainEqual({ type: 'ENTER_SAVE' });
  });

  it('S while the save overlay is open types into the save path', () => {
    const actions = pressSaveKey(saveState(), 'S');

    expect(actions).toEqual([{ type: 'UPDATE_SAVE_INPUT', value: 'api.httpS', cursor: 9 }]);
    expect(actions).not.toContainEqual({ type: 'ENTER_SAVE' });
  });
});

describe('handleSaveInput', () => {
  it('Escape cancels save mode', () => {
    const actions = pressSaveKey(saveState(), '', makeKey({ escape: true }));

    expect(actions).toEqual([{ type: 'CANCEL_SAVE' }]);
  });

  it('Enter with empty input sets the save error', () => {
    const actions = pressSaveKey(
      saveState({ saveInput: '   ', saveCursor: 3 }),
      '',
      makeKey({ return: true }),
    );

    expect(actions).toEqual([{ type: 'SET_SAVE_ERROR', error: 'Please enter a file path' }]);
  });

  it('typing a character inserts it at the cursor', () => {
    const actions = pressSaveKey(saveState({ saveInput: '', saveCursor: 0 }), 'a');

    expect(actions).toEqual([{ type: 'UPDATE_SAVE_INPUT', value: 'a', cursor: 1 }]);
  });

  it('Backspace deletes the character before the cursor', () => {
    const actions = pressSaveKey(
      saveState({ saveInput: 'abcdef', saveCursor: 3 }),
      '',
      makeKey({ backspace: true }),
    );

    expect(actions).toEqual([{ type: 'UPDATE_SAVE_INPUT', value: 'abdef', cursor: 2 }]);
  });

  it('left arrow moves the cursor left', () => {
    const actions = pressSaveKey(saveState(), '', makeKey({ leftArrow: true }));

    expect(actions).toEqual([{ type: 'MOVE_SAVE_CURSOR', cursor: 7 }]);
  });
});
