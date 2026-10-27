import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
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
  it('typing a character dispatches an insert op', () => {
    const actions = pressFileLoadKey(fileLoadState({ input: '', cursor: 0 }), 'a');

    expect(actions).toEqual([{ type: 'FILE_LOAD_KEY', op: 'insert', insert: 'a' }]);
  });

  it('Backspace dispatches deleteBackward', () => {
    const actions = pressFileLoadKey(
      fileLoadState({ input: 'abcdef', cursor: 3 }),
      '',
      makeKey({ backspace: true }),
    );

    expect(actions).toEqual([{ type: 'FILE_LOAD_KEY', op: 'deleteBackward' }]);
  });

  it('Delete dispatches deleteForward', () => {
    const actions = pressFileLoadKey(
      fileLoadState({ input: 'abcdef', cursor: 3 }),
      '',
      makeKey({ delete: true }),
    );

    expect(actions).toEqual([{ type: 'FILE_LOAD_KEY', op: 'deleteForward' }]);
  });

  it('left arrow dispatches the left motion', () => {
    const actions = pressFileLoadKey(fileLoadState(), '', makeKey({ leftArrow: true }));

    expect(actions).toEqual([{ type: 'FILE_LOAD_KEY', op: 'left' }]);
  });

  it('right arrow dispatches the right motion', () => {
    const actions = pressFileLoadKey(
      fileLoadState({ input: 'api.http', cursor: 2 }),
      '',
      makeKey({ rightArrow: true }),
    );

    expect(actions).toEqual([{ type: 'FILE_LOAD_KEY', op: 'right' }]);
  });

  it('Home dispatches lineStart', () => {
    const actions = pressFileLoadKey(fileLoadState(), '', makeKey({ home: true }));

    expect(actions).toEqual([{ type: 'FILE_LOAD_KEY', op: 'lineStart' }]);
  });

  it('End dispatches lineEnd', () => {
    const actions = pressFileLoadKey(
      fileLoadState({ input: 'api.http', cursor: 2 }),
      '',
      makeKey({ end: true }),
    );

    expect(actions).toEqual([{ type: 'FILE_LOAD_KEY', op: 'lineEnd' }]);
  });

  it('Ctrl+A aliases Home', () => {
    const actions = pressFileLoadKey(fileLoadState(), 'a', makeKey({ ctrl: true }));

    expect(actions).toEqual([{ type: 'FILE_LOAD_KEY', op: 'lineStart' }]);
  });

  it('Ctrl+E aliases End', () => {
    const actions = pressFileLoadKey(
      fileLoadState({ input: 'api.http', cursor: 2 }),
      'e',
      makeKey({ ctrl: true }),
    );

    expect(actions).toEqual([{ type: 'FILE_LOAD_KEY', op: 'lineEnd' }]);
  });

  it('up and down arrows dispatch nothing on the single-line path', () => {
    expect(pressFileLoadKey(fileLoadState(), '', makeKey({ upArrow: true }))).toEqual([]);
    expect(pressFileLoadKey(fileLoadState(), '', makeKey({ downArrow: true }))).toEqual([]);
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

describe('handleFileLoadInput Enter success path', () => {
  const WARNINGS_FIXTURE = 'test/fixtures/postman/postman-graphql-body.json';
  const CLEAN_FIXTURE = 'test/fixtures/http/load-revert-fixture.http';
  const originalHttpTuiConfig = process.env.HTTP_TUI_CONFIG;

  beforeEach(() => {
    // The Enter path reads the cert/editor config for the loaded file's
    // directory; a nonexistent config dir keeps the fixture loads hermetic
    // (HTTP_TUI_CONFIG outranks HOME and XDG_CONFIG_HOME).
    process.env.HTTP_TUI_CONFIG = 'nonexistent-httptui-config-dir';
  });

  afterEach(() => {
    if (originalHttpTuiConfig === undefined) {
      delete process.env.HTTP_TUI_CONFIG;
    } else {
      process.env.HTTP_TUI_CONFIG = originalHttpTuiConfig;
    }
  });

  it('Enter on a file whose import warns dispatches LOAD_FILE carrying the warning count', () => {
    const actions = pressFileLoadKey(
      fileLoadState({ input: WARNINGS_FIXTURE, cursor: WARNINGS_FIXTURE.length }),
      '',
      makeKey({ return: true }),
    );

    expect(actions).toEqual([{
      type: 'LOAD_FILE',
      requests: [expect.objectContaining({ name: 'GraphQL Request', method: 'POST' })],
      variables: [],
      filePath: resolve(WARNINGS_FIXTURE),
      format: 'postman',
      executorConfig: { insecure: false },
      warningCount: 1,
    }]);
  });

  it('Enter on a warnings-free file dispatches LOAD_FILE with zero warnings', () => {
    const actions = pressFileLoadKey(
      fileLoadState({ input: CLEAN_FIXTURE, cursor: CLEAN_FIXTURE.length }),
      '',
      makeKey({ return: true }),
    );

    expect(actions).toEqual([{
      type: 'LOAD_FILE',
      requests: [expect.objectContaining({ name: 'test request' })],
      variables: [{ name: 'baseUrl', value: 'http://file-value' }],
      filePath: resolve(CLEAN_FIXTURE),
      format: 'http',
      executorConfig: { insecure: false },
      warningCount: 0,
    }]);
  });
});
