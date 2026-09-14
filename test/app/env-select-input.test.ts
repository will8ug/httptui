import { describe, expect, it, vi } from 'vitest';
import type { Key } from 'ink';

import {
  handleEnvSelectInput,
  handleFileLoadInput,
  handleHelpInput,
  handleNormalInput,
  handleSearchInput,
} from '../../src/app/input-handlers';
import type { Action, AppState, EnvOption } from '../../src/core/types';
import { makeKey } from '../helpers/keys';
import { createRequest } from '../helpers/requests';
import { createInitialState } from '../helpers/state';

const environments: EnvOption[] = [
  { name: '(none)', file: null },
  { name: 'Development', file: '/does-not-matter/dev.json' },
  { name: 'Staging', file: '/does-not-matter/staging.json' },
];

function runNormalInput(state: AppState, input: string, key: Key = makeKey()) {
  const dispatched: Action[] = [];
  handleNormalInput({
    state,
    selectedRequest: state.requests[state.selectedIndex],
    columns: 80,
    rows: 24,
    effectiveResponseHeight: 10,
    effectiveDetailMaxContent: 40,
    editorVisibleHeight: 10,
    editorContentWidth: 40,
    exit: vi.fn(),
    suspend: vi.fn(),
    executorConfig: { insecure: false },
    clipboardRunner: vi.fn(async () => ''),
    clipboardReadRunner: vi.fn(async () => ''),
    abortControllerRef: { current: null },
    input,
    key,
    dispatch: (action) => dispatched.push(action),
  });
  return dispatched;
}

function pressEnvKey(state: AppState, input: string, key: Key = makeKey()): Action[] {
  const dispatched: Action[] = [];
  handleEnvSelectInput({
    state,
    input,
    key,
    dispatch: (action) => dispatched.push(action),
  });
  return dispatched;
}

function envSelectState(overrides: Partial<AppState> = {}): AppState {
  return createInitialState({
    mode: 'envSelect',
    requests: [createRequest()],
    selectedIndex: 0,
    availableEnvironments: environments,
    envSelectIndex: 0,
    ...overrides,
  });
}

describe('handleNormalInput E', () => {
  it('E with environments available dispatches ENTER_ENV_SELECT', () => {
    const actions = runNormalInput(
      createInitialState({
        requests: [createRequest()],
        selectedIndex: 0,
        availableEnvironments: environments,
      }),
      'E',
    );

    expect(actions).toEqual([{ type: 'ENTER_ENV_SELECT' }]);
  });

  it('E with only (none) available reports that no environments are configured', () => {
    const actions = runNormalInput(
      createInitialState({
        requests: [createRequest()],
        selectedIndex: 0,
        availableEnvironments: [{ name: '(none)', file: null }],
      }),
      'E',
    );

    expect(actions).toEqual([{ type: 'SET_TRANSIENT_MESSAGE', message: 'No environments configured' }]);
  });
});

describe('E is ignored in non-normal handlers', () => {
  it('handleHelpInput does not enter env select', () => {
    const dispatched: Action[] = [];
    handleHelpInput({ input: 'E', key: makeKey(), dispatch: (action) => dispatched.push(action) });

    expect(dispatched).toEqual([]);
  });

  it('handleFileLoadInput treats E as path input rather than env select', () => {
    const dispatched: Action[] = [];
    handleFileLoadInput({
      state: createInitialState({
        mode: 'fileLoad',
        fileLoadInput: '',
        fileLoadCursor: 0,
      }),
      input: 'E',
      key: makeKey(),
      executorConfig: { insecure: false },
      dispatch: (action) => dispatched.push(action),
    });

    expect(dispatched).toEqual([{ type: 'UPDATE_FILE_LOAD_INPUT', value: 'E', cursor: 1 }]);
    expect(dispatched.map((action) => action.type)).not.toContain('ENTER_ENV_SELECT');
  });

  it('handleSearchInput treats E as query input rather than env select', () => {
    const dispatched: Action[] = [];
    handleSearchInput({
      state: createInitialState({ mode: 'search', searchQuery: '' }),
      columns: 80,
      effectiveResponseHeight: 10,
      effectiveDetailMaxContent: 40,
      input: 'E',
      key: makeKey(),
      dispatch: (action) => dispatched.push(action),
    });

    expect(dispatched).toEqual([{ type: 'UPDATE_SEARCH_INPUT', value: 'E' }]);
    expect(dispatched.map((action) => action.type)).not.toContain('ENTER_ENV_SELECT');
  });
});

describe('handleEnvSelectInput', () => {
  it('j moves the selection down', () => {
    expect(pressEnvKey(envSelectState(), 'j')).toEqual([{ type: 'MOVE_ENV_SELECTION', direction: 'down' }]);
  });

  it('k moves the selection up', () => {
    expect(pressEnvKey(envSelectState({ envSelectIndex: 1 }), 'k')).toEqual([
      { type: 'MOVE_ENV_SELECTION', direction: 'up' },
    ]);
  });

  it('arrow keys move the selection the same as j and k', () => {
    expect(pressEnvKey(envSelectState(), '', makeKey({ downArrow: true }))).toEqual([
      { type: 'MOVE_ENV_SELECTION', direction: 'down' },
    ]);
    expect(pressEnvKey(envSelectState({ envSelectIndex: 1 }), '', makeKey({ upArrow: true }))).toEqual([
      { type: 'MOVE_ENV_SELECTION', direction: 'up' },
    ]);
  });

  it('Escape cancels env select', () => {
    expect(pressEnvKey(envSelectState(), '', makeKey({ escape: true }))).toEqual([{ type: 'CANCEL_ENV_SELECT' }]);
  });

  it('g jumps to the top and G jumps to the bottom', () => {
    expect(pressEnvKey(envSelectState({ envSelectIndex: 2 }), 'g')).toEqual([
      { type: 'JUMP_ENV_SELECTION', target: 'top' },
    ]);
    expect(pressEnvKey(envSelectState(), 'G')).toEqual([{ type: 'JUMP_ENV_SELECTION', target: 'bottom' }]);
  });

  it('Enter on (none) switches to a cleared environment', () => {
    expect(pressEnvKey(envSelectState({ envSelectIndex: 0 }), '', makeKey({ return: true }))).toEqual([
      { type: 'SWITCH_ENV', environmentVariables: [], envName: null },
    ]);
  });
});
