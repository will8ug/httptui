import { describe, expect, it, vi } from 'vitest';
import type { Key } from 'ink';

import { handleFileLoadInput, handleNormalInput } from '../../src/app/input-handlers';
import type { Action, AppState } from '../../src/core/types';
import { makeKey } from '../helpers/keys';
import { createInitialState } from '../helpers/state';

function fileLoadState(overrides: Partial<AppState> = {}): AppState {
  return createInitialState({
    mode: 'fileLoad',
    fileLoadInput: 'api.http',
    fileLoadCursor: 'api.http'.length,
    ...overrides,
  });
}

function pressFileLoadKey(state: AppState, input: string, key: Key = makeKey()): Action[] {
  const dispatched: Action[] = [];
  handleFileLoadInput({
    state,
    input,
    key,
    executorConfig: { insecure: false },
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

describe('handleNormalInput o', () => {
  it('enters file-load mode when there are no unsaved changes', () => {
    const actions = pressNormalKey(createInitialState(), 'o');

    expect(actions).toEqual([{ type: 'ENTER_FILE_LOAD' }]);
  });
});

describe('handleFileLoadInput typing and cursor', () => {
  it('typing a character inserts it at the cursor', () => {
    const actions = pressFileLoadKey(fileLoadState({ fileLoadInput: '', fileLoadCursor: 0 }), 'a');

    expect(actions).toEqual([{ type: 'UPDATE_FILE_LOAD_INPUT', value: 'a', cursor: 1 }]);
  });

  it('Backspace deletes the character before the cursor', () => {
    const actions = pressFileLoadKey(
      fileLoadState({ fileLoadInput: 'abcdef', fileLoadCursor: 3 }),
      '',
      makeKey({ backspace: true }),
    );

    expect(actions).toEqual([{ type: 'UPDATE_FILE_LOAD_INPUT', value: 'abdef', cursor: 2 }]);
  });

  it('Delete removes the character after the cursor', () => {
    const actions = pressFileLoadKey(
      fileLoadState({ fileLoadInput: 'abcdef', fileLoadCursor: 3 }),
      '',
      makeKey({ delete: true }),
    );

    expect(actions).toEqual([{ type: 'UPDATE_FILE_LOAD_INPUT', value: 'abcef', cursor: 3 }]);
  });

  it('left arrow moves the cursor left', () => {
    const actions = pressFileLoadKey(fileLoadState(), '', makeKey({ leftArrow: true }));

    expect(actions).toEqual([{ type: 'MOVE_FILE_LOAD_CURSOR', cursor: 7 }]);
  });

  it('right arrow moves the cursor right', () => {
    const actions = pressFileLoadKey(
      fileLoadState({ fileLoadInput: 'api.http', fileLoadCursor: 2 }),
      '',
      makeKey({ rightArrow: true }),
    );

    expect(actions).toEqual([{ type: 'MOVE_FILE_LOAD_CURSOR', cursor: 3 }]);
  });

  it('Home moves the cursor to the start', () => {
    const actions = pressFileLoadKey(fileLoadState(), '', makeKey({ home: true }));

    expect(actions).toEqual([{ type: 'MOVE_FILE_LOAD_CURSOR', cursor: 0 }]);
  });

  it('End moves the cursor to the end', () => {
    const actions = pressFileLoadKey(
      fileLoadState({ fileLoadInput: 'api.http', fileLoadCursor: 2 }),
      '',
      makeKey({ end: true }),
    );

    expect(actions).toEqual([{ type: 'MOVE_FILE_LOAD_CURSOR', cursor: 8 }]);
  });

  it('Ctrl+A aliases Home', () => {
    const actions = pressFileLoadKey(fileLoadState(), 'a', makeKey({ ctrl: true }));

    expect(actions).toEqual([{ type: 'MOVE_FILE_LOAD_CURSOR', cursor: 0 }]);
  });

  it('Ctrl+E aliases End', () => {
    const actions = pressFileLoadKey(
      fileLoadState({ fileLoadInput: 'api.http', fileLoadCursor: 2 }),
      'e',
      makeKey({ ctrl: true }),
    );

    expect(actions).toEqual([{ type: 'MOVE_FILE_LOAD_CURSOR', cursor: 8 }]);
  });

  it('Enter with empty input sets the file-load error', () => {
    const actions = pressFileLoadKey(
      fileLoadState({ fileLoadInput: '   ', fileLoadCursor: 3 }),
      '',
      makeKey({ return: true }),
    );

    expect(actions).toEqual([{ type: 'SET_FILE_LOAD_ERROR', error: 'Please enter a file path' }]);
  });

  it('Escape cancels file-load mode', () => {
    const actions = pressFileLoadKey(fileLoadState(), '', makeKey({ escape: true }));

    expect(actions).toEqual([{ type: 'CANCEL_FILE_LOAD' }]);
  });
});

describe('handleFileLoadInput mode isolation', () => {
  it('Ctrl+G does not dispatch an editor-handoff action', () => {
    const actions = pressFileLoadKey(fileLoadState(), 'g', makeKey({ ctrl: true }));

    expect(actions).toEqual([]);
  });
});
