import { describe, expect, it } from 'vitest';

import { createInitialState as realCreateInitialState, createInitialState, defaultAppProps, reducer } from '../helpers/state';
import type { AppState, EnvOption, FileVariable } from '../../src/core/types';

const fileVariables: FileVariable[] = [
  { name: 'baseUrl', value: 'https://api.local' },
];

const devEnvVariables: FileVariable[] = [
  { name: 'baseUrl', value: 'https://api.dev.com' },
  { name: 'apiKey', value: 'dev-key' },
];

const stagingEnvVariables: FileVariable[] = [
  { name: 'baseUrl', value: 'https://api.staging.com' },
  { name: 'stagingOnly', value: 'x' },
];

const prodEnvVariables: FileVariable[] = [
  { name: 'baseUrl', value: 'https://api.prod.com' },
];

const availableEnvironments: EnvOption[] = [
  { name: '(none)', file: null },
  { name: 'Development', file: 'env/dev.json' },
  { name: 'Staging', file: 'env/staging.json' },
  { name: 'Production', file: 'env/prod.json' },
];

const STAGING_INDEX = 2;
const NONE_INDEX = 0;
const DEV_INDEX = 1;
const PROD_INDEX = 3;

function makeInitialState(overrides: Partial<AppState> = {}): AppState {
  return createInitialState({
    fileVariables,
    variables: fileVariables,
    environmentVariables: [],
    activeEnvName: null,
    availableEnvironments,
    envSelectIndex: 0,
    envSelectError: null,
    ...overrides,
  });
}

function varMap(vars: FileVariable[]): Map<string, string> {
  return new Map(vars.map((v) => [v.name, v.value]));
}

describe('createInitialState env fields', () => {
  it('populates fileVariables, activeEnvName, availableEnvironments from props', () => {
    const props = {
      ...defaultAppProps,
      fileVariables: [{ name: 'x', value: '1' }],
      activeEnvName: 'Development',
      availableEnvironments: [
        { name: '(none)', file: null },
        { name: 'Development', file: 'env/dev.json' },
      ],
    };

    const result = realCreateInitialState(props);

    expect(result.fileVariables).toEqual([{ name: 'x', value: '1' }]);
    expect(result.activeEnvName).toBe('Development');
    expect(result.availableEnvironments).toEqual([
      { name: '(none)', file: null },
      { name: 'Development', file: 'env/dev.json' },
    ]);
    expect(result.envSelectIndex).toBe(0);
    expect(result.envSelectError).toBeNull();
  });
});

describe('RELOAD_FILE preserves active runtime environment', () => {
  it('re-merges environmentVariables over the new fileVariables', () => {
    const state = makeInitialState({
      environmentVariables: stagingEnvVariables,
      variables: [
        { name: 'baseUrl', value: 'https://api.staging.com' },
        { name: 'stagingOnly', value: 'x' },
      ],
      activeEnvName: 'Staging',
      fileVariables: [{ name: 'baseUrl', value: 'https://api.local' }],
    });

    const newFileVars: FileVariable[] = [{ name: 'token', value: 'abc' }];
    const result = reducer(state, {
      type: 'RELOAD_FILE',
      requests: [],
      variables: newFileVars,
    });

    expect(result.fileVariables).toEqual(newFileVars);
    expect(result.activeEnvName).toBe('Staging');
    const merged = varMap(result.variables);
    expect(merged.get('token')).toBe('abc');
    expect(merged.get('stagingOnly')).toBe('x');
    expect(merged.get('baseUrl')).toBe('https://api.staging.com');
  });

  it('keeps activeEnvName null when no environment is active', () => {
    const state = makeInitialState({ activeEnvName: null });
    const result = reducer(state, {
      type: 'RELOAD_FILE',
      requests: [],
      variables: [{ name: 'k', value: 'v' }],
    });

    expect(result.activeEnvName).toBeNull();
    expect(result.fileVariables).toEqual([{ name: 'k', value: 'v' }]);
  });
});

describe('LOAD_FILE preserves active runtime environment', () => {
  it('re-merges environmentVariables over the new fileVariables', () => {
    const state = makeInitialState({
      environmentVariables: devEnvVariables,
      variables: [
        { name: 'baseUrl', value: 'https://api.dev.com' },
        { name: 'apiKey', value: 'dev-key' },
      ],
      activeEnvName: 'Development',
      fileVariables: [{ name: 'baseUrl', value: 'https://api.local' }],
    });

    const newFileVars: FileVariable[] = [{ name: 'host', value: 'example.com' }];
    const result = reducer(state, {
      type: 'LOAD_FILE',
      requests: [],
      variables: newFileVars,
      filePath: 'other.http',
    });

    expect(result.fileVariables).toEqual(newFileVars);
    expect(result.activeEnvName).toBe('Development');
    const merged = varMap(result.variables);
    expect(merged.get('host')).toBe('example.com');
    expect(merged.get('apiKey')).toBe('dev-key');
    expect(merged.get('baseUrl')).toBe('https://api.dev.com');
  });
});

describe('ENTER_ENV_SELECT reducer', () => {
  it('sets mode to envSelect and clears envSelectError', () => {
    const state = makeInitialState({ envSelectError: 'old error' });
    const result = reducer(state, { type: 'ENTER_ENV_SELECT' });

    expect(result.mode).toBe('envSelect');
    expect(result.envSelectError).toBeNull();
  });

  it('initializes envSelectIndex to active environment option index', () => {
    const state = makeInitialState({ activeEnvName: 'Staging' });
    const result = reducer(state, { type: 'ENTER_ENV_SELECT' });

    expect(result.envSelectIndex).toBe(STAGING_INDEX);
  });

  it('initializes envSelectIndex to (none) when no environment is active', () => {
    const state = makeInitialState({ activeEnvName: null });
    const result = reducer(state, { type: 'ENTER_ENV_SELECT' });

    expect(result.envSelectIndex).toBe(NONE_INDEX);
  });

  it('initializes envSelectIndex to (none) when activeEnvName is not in availableEnvironments', () => {
    const state = makeInitialState({ activeEnvName: 'Unknown' });
    const result = reducer(state, { type: 'ENTER_ENV_SELECT' });

    expect(result.envSelectIndex).toBe(NONE_INDEX);
  });
});

describe('MOVE_ENV_SELECTION reducer', () => {
  it('moves envSelectIndex down within bounds', () => {
    const state = makeInitialState({ envSelectIndex: DEV_INDEX });
    const result = reducer(state, { type: 'MOVE_ENV_SELECTION', direction: 'down' });

    expect(result.envSelectIndex).toBe(STAGING_INDEX);
  });

  it('moves envSelectIndex up within bounds', () => {
    const state = makeInitialState({ envSelectIndex: STAGING_INDEX });
    const result = reducer(state, { type: 'MOVE_ENV_SELECTION', direction: 'up' });

    expect(result.envSelectIndex).toBe(DEV_INDEX);
  });

  it('clamps to 0 when moving up at first option (no wrap)', () => {
    const state = makeInitialState({ envSelectIndex: NONE_INDEX });
    const result = reducer(state, { type: 'MOVE_ENV_SELECTION', direction: 'up' });

    expect(result.envSelectIndex).toBe(NONE_INDEX);
  });

  it('clamps to last index when moving down at last option (no wrap)', () => {
    const state = makeInitialState({ envSelectIndex: PROD_INDEX });
    const result = reducer(state, { type: 'MOVE_ENV_SELECTION', direction: 'down' });

    expect(result.envSelectIndex).toBe(PROD_INDEX);
  });
});

describe('SWITCH_ENV reducer', () => {
  it('re-merges fileVariables with new environmentVariables', () => {
    const fileOnlyVars: FileVariable[] = [{ name: 'token', value: 'fileToken' }];
    const state = makeInitialState({
      fileVariables: fileOnlyVars,
      variables: fileOnlyVars,
      activeEnvName: null,
      environmentVariables: [],
    });

    const result = reducer(state, {
      type: 'SWITCH_ENV',
      environmentVariables: stagingEnvVariables,
      envName: 'Staging',
    });

    expect(result.activeEnvName).toBe('Staging');
    expect(result.environmentVariables).toEqual(stagingEnvVariables);
    const merged = varMap(result.variables);
    expect(merged.get('baseUrl')).toBe('https://api.staging.com');
    expect(merged.get('stagingOnly')).toBe('x');
    expect(merged.get('token')).toBe('fileToken');
  });

  it('preserves file-variable precedence after switch', () => {
    const state = makeInitialState({
      fileVariables: [{ name: 'baseUrl', value: 'https://api.local' }],
      activeEnvName: null,
      environmentVariables: [],
      variables: [{ name: 'baseUrl', value: 'https://api.local' }],
    });

    const result = reducer(state, {
      type: 'SWITCH_ENV',
      environmentVariables: devEnvVariables,
      envName: 'Development',
    });

    const merged = varMap(result.variables);
    expect(merged.get('baseUrl')).toBe('https://api.local');
  });

  it('does not leak stale variables from a previous environment', () => {
    const state = makeInitialState({
      fileVariables: [],
      activeEnvName: 'Staging',
      environmentVariables: stagingEnvVariables,
      variables: [
        { name: 'baseUrl', value: 'https://api.staging.com' },
        { name: 'stagingOnly', value: 'x' },
      ],
    });

    const result = reducer(state, {
      type: 'SWITCH_ENV',
      environmentVariables: prodEnvVariables,
      envName: 'Production',
    });

    const merged = varMap(result.variables);
    expect(merged.has('stagingOnly')).toBe(false);
    expect(merged.get('baseUrl')).toBe('https://api.prod.com');
  });

  it('applies (none) by clearing environmentVariables and activeEnvName', () => {
    const state = makeInitialState({
      fileVariables,
      activeEnvName: 'Development',
      environmentVariables: devEnvVariables,
      variables: [
        { name: 'baseUrl', value: 'https://api.local' },
        { name: 'apiKey', value: 'dev-key' },
      ],
    });

    const result = reducer(state, {
      type: 'SWITCH_ENV',
      environmentVariables: [],
      envName: null,
    });

    expect(result.activeEnvName).toBeNull();
    expect(result.environmentVariables).toEqual([]);
    const merged = varMap(result.variables);
    expect(merged.get('baseUrl')).toBe('https://api.local');
    expect(merged.has('apiKey')).toBe(false);
  });

  it('resets response, error, and scroll offsets', () => {
    const state: AppState = makeInitialState({
      response: {
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        body: 'body',
        timing: { durationMs: 50 },
        size: { bodyBytes: 4 },
      },
      error: { message: 'old error' },
      responseScrollOffset: 5,
      requestScrollOffset: 3,
      detailsScrollOffset: 2,
      detailsHorizontalOffset: 1,
      responseHorizontalOffset: 4,
      requestHorizontalOffset: 7,
    });

    const result = reducer(state, {
      type: 'SWITCH_ENV',
      environmentVariables: devEnvVariables,
      envName: 'Development',
    });

    expect(result.response).toBeNull();
    expect(result.error).toBeNull();
    expect(result.responseScrollOffset).toBe(0);
    expect(result.requestScrollOffset).toBe(0);
    expect(result.detailsScrollOffset).toBe(0);
    expect(result.detailsHorizontalOffset).toBe(0);
    expect(result.responseHorizontalOffset).toBe(0);
    expect(result.requestHorizontalOffset).toBe(0);
  });

  it('returns to normal mode and clears envSelectError', () => {
    const state = makeInitialState({ mode: 'envSelect', envSelectError: 'old error' });
    const result = reducer(state, {
      type: 'SWITCH_ENV',
      environmentVariables: devEnvVariables,
      envName: 'Development',
    });

    expect(result.mode).toBe('normal');
    expect(result.envSelectError).toBeNull();
  });
});

describe('CANCEL_ENV_SELECT reducer', () => {
  it('returns to normal mode and clears envSelectError', () => {
    const state = makeInitialState({
      mode: 'envSelect',
      envSelectError: 'some error',
      activeEnvName: 'Staging',
    });
    const result = reducer(state, { type: 'CANCEL_ENV_SELECT' });

    expect(result.mode).toBe('normal');
    expect(result.envSelectError).toBeNull();
  });

  it('leaves activeEnvName, environmentVariables, and variables unchanged', () => {
    const state = makeInitialState({
      mode: 'envSelect',
      envSelectError: 'some error',
      activeEnvName: 'Staging',
      environmentVariables: stagingEnvVariables,
      variables: [
        { name: 'baseUrl', value: 'https://api.staging.com' },
        { name: 'stagingOnly', value: 'x' },
      ],
    });

    const result = reducer(state, { type: 'CANCEL_ENV_SELECT' });

    expect(result.activeEnvName).toBe('Staging');
    expect(result.environmentVariables).toEqual(stagingEnvVariables);
    expect(result.variables).toEqual(state.variables);
  });
});

describe('SET_ENV_SELECT_ERROR reducer', () => {
  it('sets envSelectError and keeps mode as envSelect', () => {
    const state = makeInitialState({ mode: 'envSelect', envSelectError: null });
    const result = reducer(state, {
      type: 'SET_ENV_SELECT_ERROR',
      error: 'File not found: env/dev.json',
    });

    expect(result.envSelectError).toBe('File not found: env/dev.json');
    expect(result.mode).toBe('envSelect');
  });
});
