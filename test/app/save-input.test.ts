import { describe, expect, it } from 'vitest';
import type { Key } from 'ink';

import { handleFileLoadInput, handleSaveInput } from '../../src/app/input-handlers';
import { INITIAL_FILE_LOAD, INITIAL_SAVE_LOAD } from '../../src/core/reducers/helpers';
import type { Action, AppState, TextEntryState } from '../../src/core/types';
import { pressKey } from '../helpers/dispatch';
import { makeKey } from '../helpers/keys';
import { createInitialState } from '../helpers/state';

function saveState(overrides: Partial<TextEntryState> = {}): AppState {
  return createInitialState({
    mode: 'saveLoad',
    saveLoad: { ...INITIAL_SAVE_LOAD, input: 'api.http', cursor: 'api.http'.length, ...overrides },
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

describe('handleNormalInput S', () => {
  it('enters save mode', () => {
    const actions = pressKey(createInitialState(), 'S');

    expect(actions).toEqual([{ type: 'ENTER_SAVE' }]);
  });
});

describe('S-key mode isolation', () => {
  it('S while the file-load overlay is open types into the file path', () => {
    const dispatched: Action[] = [];

    handleFileLoadInput({
      state: createInitialState({
        mode: 'fileLoad',
        fileLoad: { ...INITIAL_FILE_LOAD, input: 'api.http', cursor: 'api.http'.length },
      }),
      input: 'S',
      key: makeKey(),
      executorConfig: { insecure: false },
      dispatch: (action) => dispatched.push(action),
    });

    expect(dispatched).toEqual([{ type: 'FILE_LOAD_KEY', op: 'insert', insert: 'S' }]);
    expect(dispatched).not.toContainEqual({ type: 'ENTER_SAVE' });
  });

  it('S while the save overlay is open types into the save path', () => {
    const actions = pressSaveKey(saveState(), 'S');

    expect(actions).toEqual([{ type: 'SAVE_KEY', op: 'insert', insert: 'S' }]);
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
      saveState({ input: '   ', cursor: 3 }),
      '',
      makeKey({ return: true }),
    );

    expect(actions).toEqual([{ type: 'SET_SAVE_ERROR', error: 'Please enter a file path' }]);
  });

  it('typing a character dispatches an insert op', () => {
    const actions = pressSaveKey(saveState({ input: '', cursor: 0 }), 'a');

    expect(actions).toEqual([{ type: 'SAVE_KEY', op: 'insert', insert: 'a' }]);
  });

  it('Backspace dispatches deleteBackward', () => {
    const actions = pressSaveKey(
      saveState({ input: 'abcdef', cursor: 3 }),
      '',
      makeKey({ backspace: true }),
    );

    expect(actions).toEqual([{ type: 'SAVE_KEY', op: 'deleteBackward' }]);
  });

  it('left arrow dispatches the left motion', () => {
    const actions = pressSaveKey(saveState(), '', makeKey({ leftArrow: true }));

    expect(actions).toEqual([{ type: 'SAVE_KEY', op: 'left' }]);
  });

  it('up and down arrows dispatch nothing on the single-line path', () => {
    expect(pressSaveKey(saveState(), '', makeKey({ upArrow: true }))).toEqual([]);
    expect(pressSaveKey(saveState(), '', makeKey({ downArrow: true }))).toEqual([]);
  });
});
