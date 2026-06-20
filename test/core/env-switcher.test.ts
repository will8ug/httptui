import { describe, expect, it } from 'vitest';

import { createInitialState as realCreateInitialState, reducer } from '../../src/core/reducer';
import { mergeVariables } from '../../src/core/variables';
import type { Action, AppState, EnvOption, FileVariable } from '../../src/core/types';
import { createInitialState, defaultAppProps } from '../helpers/state';

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

const manyEnvironments: EnvOption[] = [
  { name: '(none)', file: null },
  { name: 'Dev', file: 'env/dev.json' },
  { name: 'Staging', file: 'env/staging.json' },
  { name: 'QA', file: 'env/qa.json' },
  { name: 'Prod', file: 'env/prod.json' },
  { name: 'Sandbox', file: 'env/sandbox.json' },
  { name: 'Local', file: 'env/local.json' },
  { name: 'CI', file: 'env/ci.json' },
  { name: 'Beta', file: 'env/beta.json' },
  { name: 'Alpha', file: 'env/alpha.json' },
  { name: 'Test', file: 'env/test.json' },
  { name: 'Demo', file: 'env/demo.json' },
];

// Index lookups are derived from `availableEnvironments` so they stay in sync
// with the fixture order. A missing name throws at module load rather than
// silently producing wrong test results when the fixture is reordered.
const envIndex = (name: string): number => {
  const index = availableEnvironments.findIndex((option) => option.name === name);
  if (index < 0) {
    throw new Error(`Test fixture: required env name "${name}" missing from availableEnvironments`);
  }
  return index;
};

const NONE_INDEX = envIndex('(none)');
const DEV_INDEX = envIndex('Development');
const STAGING_INDEX = envIndex('Staging');
const PROD_INDEX = envIndex('Production');

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

function makeActiveEnvState(
  envName: string | null,
  envVars: FileVariable[],
  overrides: Partial<AppState> = {},
): AppState {
  return makeInitialState({
    activeEnvName: envName,
    environmentVariables: envVars,
    variables: mergeVariables(fileVariables, envVars),
    ...overrides,
  });
}

function makeManyEnvState(overrides: Partial<AppState> = {}): AppState {
  return makeInitialState({ availableEnvironments: manyEnvironments, ...overrides });
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

describe.each([
  {
    type: 'RELOAD_FILE' as const,
    envName: 'Staging',
    envVars: stagingEnvVariables,
    newFileVars: [{ name: 'token', value: 'abc' }],
    expectedMerged: {
      token: 'abc',
      stagingOnly: 'x',
      baseUrl: 'https://api.staging.com',
    },
  },
  {
    type: 'LOAD_FILE' as const,
    envName: 'Development',
    envVars: devEnvVariables,
    newFileVars: [{ name: 'host', value: 'example.com' }],
    filePath: 'other.http',
    expectedMerged: {
      host: 'example.com',
      apiKey: 'dev-key',
      baseUrl: 'https://api.dev.com',
    },
  },
])('$type preserves active runtime environment', ({ type, envName, envVars, newFileVars, filePath, expectedMerged }) => {
  it('re-merges environmentVariables over the new fileVariables and keeps active env', () => {
    const state = makeActiveEnvState(envName, envVars, {
      fileVariables: [{ name: 'baseUrl', value: 'https://api.local' }],
    });

    const action = {
      type,
      requests: [],
      variables: newFileVars,
      ...(filePath !== undefined ? { filePath } : {}),
    } as Action;

    const result = reducer(state, action);

    expect(result.fileVariables).toEqual(newFileVars);
    expect(result.activeEnvName).toBe(envName);
    const merged = varMap(result.variables);
    for (const [name, value] of Object.entries(expectedMerged)) {
      expect(merged.get(name)).toBe(value);
    }
  });
});

describe('RELOAD_FILE with no active environment', () => {
  it('keeps activeEnvName null and stores the new fileVariables', () => {
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

describe('ENTER_ENV_SELECT reducer', () => {
  it('sets mode to envSelect and clears envSelectError', () => {
    const state = makeInitialState({ envSelectError: 'old error' });
    const result = reducer(state, { type: 'ENTER_ENV_SELECT' });

    expect(result.mode).toBe('envSelect');
    expect(result.envSelectError).toBeNull();
  });

  it('initializes envSelectIndex to the active environment option index', () => {
    const state = makeInitialState({ activeEnvName: 'Staging' });
    const result = reducer(state, { type: 'ENTER_ENV_SELECT' });

    expect(result.envSelectIndex).toBe(STAGING_INDEX);
  });

  it('initializes envSelectIndex to (none) when no environment is active', () => {
    const state = makeInitialState({ activeEnvName: null });
    const result = reducer(state, { type: 'ENTER_ENV_SELECT' });

    expect(result.envSelectIndex).toBe(NONE_INDEX);
  });

  it('falls back to (none) when activeEnvName is not in availableEnvironments', () => {
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

  it('clamps to first option when moving up at first option (no wrap)', () => {
    const state = makeInitialState({ envSelectIndex: NONE_INDEX });
    const result = reducer(state, { type: 'MOVE_ENV_SELECTION', direction: 'up' });

    expect(result.envSelectIndex).toBe(NONE_INDEX);
  });

  it('clamps to last option when moving down at last option (no wrap)', () => {
    const state = makeInitialState({ envSelectIndex: PROD_INDEX });
    const result = reducer(state, { type: 'MOVE_ENV_SELECTION', direction: 'down' });

    expect(result.envSelectIndex).toBe(PROD_INDEX);
  });

  it('is a no-op when availableEnvironments is empty', () => {
    const state = makeInitialState({ availableEnvironments: [] });
    const result = reducer(state, { type: 'MOVE_ENV_SELECTION', direction: 'down' });

    expect(result).toBe(state);
  });
});

describe('SWITCH_ENV reducer', () => {
  it('re-merges fileVariables with new environmentVariables and preserves fileVariables base', () => {
    const fileOnlyVars: FileVariable[] = [{ name: 'token', value: 'fileToken' }];
    const state = makeActiveEnvState(null, [], {
      fileVariables: fileOnlyVars,
    });

    const result = reducer(state, {
      type: 'SWITCH_ENV',
      environmentVariables: stagingEnvVariables,
      envName: 'Staging',
    });

    expect(result.activeEnvName).toBe('Staging');
    expect(result.environmentVariables).toEqual(stagingEnvVariables);
    expect(result.fileVariables).toBe(fileOnlyVars);
    const merged = varMap(result.variables);
    expect(merged.get('baseUrl')).toBe('https://api.staging.com');
    expect(merged.get('stagingOnly')).toBe('x');
    expect(merged.get('token')).toBe('fileToken');
  });

  it('preserves environment-variable precedence after switch', () => {
    const state = makeActiveEnvState(null, [], {
      fileVariables: [{ name: 'baseUrl', value: 'https://api.local' }],
    });

    const result = reducer(state, {
      type: 'SWITCH_ENV',
      environmentVariables: devEnvVariables,
      envName: 'Development',
    });

    const merged = varMap(result.variables);
    expect(merged.get('baseUrl')).toBe('https://api.dev.com');
  });

  it('does not leak stale variables from a previous environment', () => {
    const state = makeActiveEnvState('Staging', stagingEnvVariables);

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
    const state = makeActiveEnvState('Development', devEnvVariables);

    const result = reducer(state, {
      type: 'SWITCH_ENV',
      environmentVariables: [],
      envName: null,
    });

    expect(result.activeEnvName).toBeNull();
    expect(result.environmentVariables).toEqual([]);
    expect(result.fileVariables).toEqual(fileVariables);
    const merged = varMap(result.variables);
    expect(merged.get('baseUrl')).toBe('https://api.local');
    expect(merged.has('apiKey')).toBe(false);
  });

  it('resets response, error, and scroll offsets', () => {
    const state = makeInitialState({
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

  it('preserves active env state and variables by reference', () => {
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
    expect(result.environmentVariables).toBe(state.environmentVariables);
    expect(result.variables).toBe(state.variables);
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

describe('MOVE_ENV_SELECTION scroll offset', () => {
  it('advances offset when cursor moves past the bottom of the visible window', () => {
    const state = makeManyEnvState({ envSelectIndex: 7, envSelectScrollOffset: 0 });
    const result = reducer(state, { type: 'MOVE_ENV_SELECTION', direction: 'down' });

    expect(result.envSelectIndex).toBe(8);
    expect(result.envSelectScrollOffset).toBe(1);
  });

  it('retreats offset when cursor moves above the visible window', () => {
    const state = makeManyEnvState({ envSelectIndex: 4, envSelectScrollOffset: 4 });
    const result = reducer(state, { type: 'MOVE_ENV_SELECTION', direction: 'up' });

    expect(result.envSelectIndex).toBe(3);
    expect(result.envSelectScrollOffset).toBe(3);
  });

  it('keeps offset stable when cursor moves within the visible window', () => {
    const state = makeManyEnvState({ envSelectIndex: 3, envSelectScrollOffset: 0 });
    const result = reducer(state, { type: 'MOVE_ENV_SELECTION', direction: 'down' });

    expect(result.envSelectIndex).toBe(4);
    expect(result.envSelectScrollOffset).toBe(0);
  });
});

describe('JUMP_ENV_SELECTION reducer', () => {
  it('jump to top sets index to 0 and offset to 0', () => {
    const state = makeManyEnvState({ envSelectIndex: 11, envSelectScrollOffset: 4 });
    const result = reducer(state, { type: 'JUMP_ENV_SELECTION', target: 'top' });

    expect(result.envSelectIndex).toBe(0);
    expect(result.envSelectScrollOffset).toBe(0);
  });

  it('jump to bottom sets index to last and syncs offset', () => {
    const state = makeManyEnvState({ envSelectIndex: 0, envSelectScrollOffset: 0 });
    const result = reducer(state, { type: 'JUMP_ENV_SELECTION', target: 'bottom' });

    expect(result.envSelectIndex).toBe(11);
    expect(result.envSelectScrollOffset).toBe(4);
  });

  it('is a no-op when availableEnvironments is empty', () => {
    const state = makeManyEnvState({ availableEnvironments: [] });
    const result = reducer(state, { type: 'JUMP_ENV_SELECTION', target: 'top' });

    expect(result).toBe(state);
  });
});

describe('ENTER_ENV_SELECT scroll offset', () => {
  it('computes offset to show active env when it is below the visible window', () => {
    const state = makeManyEnvState({ activeEnvName: 'Demo', envSelectScrollOffset: 0 });
    const result = reducer(state, { type: 'ENTER_ENV_SELECT' });

    expect(result.envSelectIndex).toBe(11);
    expect(result.envSelectScrollOffset).toBe(4);
  });

  it('preserves offset when active env is already visible', () => {
    const state = makeManyEnvState({ activeEnvName: 'QA', envSelectScrollOffset: 0 });
    const result = reducer(state, { type: 'ENTER_ENV_SELECT' });

    expect(result.envSelectIndex).toBe(3);
    expect(result.envSelectScrollOffset).toBe(0);
  });

  it('preserves persisted offset when active env is visible in it', () => {
    const state = makeManyEnvState({ activeEnvName: 'Demo', envSelectScrollOffset: 4 });
    const result = reducer(state, { type: 'ENTER_ENV_SELECT' });

    expect(result.envSelectIndex).toBe(11);
    expect(result.envSelectScrollOffset).toBe(4);
  });

  it('corrects stale offset when active env is outside persisted window', () => {
    const state = makeManyEnvState({ activeEnvName: 'Dev', envSelectScrollOffset: 8 });
    const result = reducer(state, { type: 'ENTER_ENV_SELECT' });

    expect(result.envSelectIndex).toBe(1);
    expect(result.envSelectScrollOffset).toBe(1);
  });
});

describe('CANCEL_ENV_SELECT preserves scroll offset', () => {
  it('preserves envSelectScrollOffset on cancel', () => {
    const state = makeManyEnvState({ mode: 'envSelect', envSelectScrollOffset: 3, envSelectError: 'some error' });
    const result = reducer(state, { type: 'CANCEL_ENV_SELECT' });

    expect(result.envSelectScrollOffset).toBe(3);
    expect(result.mode).toBe('normal');
    expect(result.envSelectError).toBeNull();
  });
});
