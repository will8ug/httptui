import { describe, expect, it } from 'vitest';
import type { Key } from 'ink';

import { handleFileLoadInput } from '../../src/app/input-handlers';
import { INITIAL_FILE_LOAD } from '../../src/core/reducers/helpers';
import type { Action, AppState, FileLoadState } from '../../src/core/types';
import { pressKey } from '../helpers/dispatch';
import { makeKey } from '../helpers/keys';
import { createInitialState } from '../helpers/state';

function fileLoadState(overrides: Partial<FileLoadState> = {}): AppState {
  return createInitialState({
    mode: 'fileLoad',
    fileLoad: { ...INITIAL_FILE_LOAD, input: 'api.http', cursor: 'api.http'.length, ...overrides },
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

describe('handleNormalInput o', () => {
  it('enters file-load mode when there are no unsaved changes', () => {
    const actions = pressKey(createInitialState(), 'o');

    expect(actions).toEqual([{ type: 'ENTER_FILE_LOAD' }]);
  });
});

describe('handleFileLoadInput typing and cursor', () => {
  it('typing a character inserts it at the cursor', () => {
    const actions = pressFileLoadKey(fileLoadState({ input: '', cursor: 0 }), 'a');

    expect(actions).toEqual([{ type: 'UPDATE_FILE_LOAD_INPUT', value: 'a', cursor: 1 }]);
  });

  it('Backspace deletes the character before the cursor', () => {
    const actions = pressFileLoadKey(
      fileLoadState({ input: 'abcdef', cursor: 3 }),
      '',
      makeKey({ backspace: true }),
    );

    expect(actions).toEqual([{ type: 'UPDATE_FILE_LOAD_INPUT', value: 'abdef', cursor: 2 }]);
  });

  it('Delete removes the character after the cursor', () => {
    const actions = pressFileLoadKey(
      fileLoadState({ input: 'abcdef', cursor: 3 }),
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
      fileLoadState({ input: 'api.http', cursor: 2 }),
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
      fileLoadState({ input: 'api.http', cursor: 2 }),
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
      fileLoadState({ input: 'api.http', cursor: 2 }),
      'e',
      makeKey({ ctrl: true }),
    );

    expect(actions).toEqual([{ type: 'MOVE_FILE_LOAD_CURSOR', cursor: 8 }]);
  });

  it('Enter with empty input sets the file-load error', () => {
    const actions = pressFileLoadKey(
      fileLoadState({ input: '   ', cursor: 3 }),
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
