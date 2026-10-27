import { describe, expect, it } from 'vitest';

import { createInitialState as realCreateInitialState, reducer } from '../../../src/core/reducer';
import { mergeVariables } from '../../../src/core/variables';
import type { Action, AppState, EnvOption, FileVariable } from '../../../src/core/types';
import { INITIAL_ENV_SELECT } from '../../../src/core/reducers/helpers';
import { createInitialState, defaultAppProps } from '../../helpers/state';

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
    expect(result.envSelect).toEqual(INITIAL_ENV_SELECT);
  });
});

describe.each([
  {
    type: 'RELOAD_FILE' as const,
    format: 'http' as const,
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
    format: 'http' as const,
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
])('$type preserves active runtime environment', ({ type, format, envName, envVars, newFileVars, filePath, expectedMerged }) => {
  it('re-merges environmentVariables over the new fileVariables and keeps active env', () => {
    const state = makeActiveEnvState(envName, envVars, {
      fileVariables: [{ name: 'baseUrl', value: 'https://api.local' }],
    });

    const action = {
      type,
      format,
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
      format: 'http',
    });

    expect(result.activeEnvName).toBeNull();
    expect(result.fileVariables).toEqual([{ name: 'k', value: 'v' }]);
  });
});

describe('ENTER_ENV_SELECT reducer', () => {
  it('sets mode to envSelect and clears the envSelect error', () => {
    const state = makeInitialState({ envSelect: { ...INITIAL_ENV_SELECT, error: 'old error' } });
    const result = reducer(state, { type: 'ENTER_ENV_SELECT' });

    expect(result.mode).toBe('envSelect');
    expect(result.envSelect.error).toBeNull();
  });

  it('initializes the envSelect index to the active environment option index', () => {
    const state = makeInitialState({ activeEnvName: 'Staging' });
    const result = reducer(state, { type: 'ENTER_ENV_SELECT' });

    expect(result.envSelect.selectedIndex).toBe(STAGING_INDEX);
  });

  it('initializes the envSelect index to (none) when no environment is active', () => {
    const state = makeInitialState({ activeEnvName: null });
    const result = reducer(state, { type: 'ENTER_ENV_SELECT' });

    expect(result.envSelect.selectedIndex).toBe(NONE_INDEX);
  });

  it('falls back to (none) when activeEnvName is not in availableEnvironments', () => {
    const state = makeInitialState({ activeEnvName: 'Unknown' });
    const result = reducer(state, { type: 'ENTER_ENV_SELECT' });

    expect(result.envSelect.selectedIndex).toBe(NONE_INDEX);
  });
});

describe('MOVE_ENV_SELECTION reducer', () => {
  it('moves the envSelect index down within bounds', () => {
    const state = makeInitialState({ envSelect: { ...INITIAL_ENV_SELECT, selectedIndex: DEV_INDEX } });
    const result = reducer(state, { type: 'MOVE_ENV_SELECTION', direction: 'down' });

    expect(result.envSelect.selectedIndex).toBe(STAGING_INDEX);
  });

  it('moves the envSelect index up within bounds', () => {
    const state = makeInitialState({ envSelect: { ...INITIAL_ENV_SELECT, selectedIndex: STAGING_INDEX } });
    const result = reducer(state, { type: 'MOVE_ENV_SELECTION', direction: 'up' });

    expect(result.envSelect.selectedIndex).toBe(DEV_INDEX);
  });

  it('clamps to first option when moving up at first option (no wrap)', () => {
    const state = makeInitialState({ envSelect: { ...INITIAL_ENV_SELECT, selectedIndex: NONE_INDEX } });
    const result = reducer(state, { type: 'MOVE_ENV_SELECTION', direction: 'up' });

    expect(result.envSelect.selectedIndex).toBe(NONE_INDEX);
  });

  it('clamps to last option when moving down at last option (no wrap)', () => {
    const state = makeInitialState({ envSelect: { ...INITIAL_ENV_SELECT, selectedIndex: PROD_INDEX } });
    const result = reducer(state, { type: 'MOVE_ENV_SELECTION', direction: 'down' });

    expect(result.envSelect.selectedIndex).toBe(PROD_INDEX);
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
        rawBody: 'body',
        timing: { durationMs: 50 },
        size: { bodyBytes: 4 },
      },
      requestError: { message: 'old error' },
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
    expect(result.requestError).toBeNull();
    expect(result.responseScrollOffset).toBe(0);
    expect(result.requestScrollOffset).toBe(0);
    expect(result.detailsScrollOffset).toBe(0);
    expect(result.detailsHorizontalOffset).toBe(0);
    expect(result.responseHorizontalOffset).toBe(0);
    expect(result.requestHorizontalOffset).toBe(0);
  });

  it('returns to normal mode and clears the envSelect error', () => {
    const state = makeInitialState({ mode: 'envSelect', envSelect: { ...INITIAL_ENV_SELECT, error: 'old error' } });
    const result = reducer(state, {
      type: 'SWITCH_ENV',
      environmentVariables: devEnvVariables,
      envName: 'Development',
    });

    expect(result.mode).toBe('normal');
    expect(result.envSelect.error).toBeNull();
  });
});

describe('CANCEL_ENV_SELECT reducer', () => {
  it('returns to normal mode and clears the envSelect error', () => {
    const state = makeInitialState({
      mode: 'envSelect',
      envSelect: { ...INITIAL_ENV_SELECT, error: 'some error' },
      activeEnvName: 'Staging',
    });
    const result = reducer(state, { type: 'CANCEL_ENV_SELECT' });

    expect(result.mode).toBe('normal');
    expect(result.envSelect.error).toBeNull();
  });

  it('preserves active env state and variables by reference', () => {
    const state = makeInitialState({
      mode: 'envSelect',
      envSelect: { ...INITIAL_ENV_SELECT, error: 'some error' },
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
  it('sets the envSelect error and keeps mode as envSelect', () => {
    const state = makeInitialState({ mode: 'envSelect' });
    const result = reducer(state, {
      type: 'SET_ENV_SELECT_ERROR',
      error: 'File not found: env/dev.json',
    });

    expect(result.envSelect.error).toBe('File not found: env/dev.json');
    expect(result.mode).toBe('envSelect');
  });
});

describe('MOVE_ENV_SELECTION scroll offset', () => {
  it('advances offset when cursor moves past the bottom of the visible window', () => {
    const state = makeManyEnvState({ envSelect: { ...INITIAL_ENV_SELECT, selectedIndex: 7 } });
    const result = reducer(state, { type: 'MOVE_ENV_SELECTION', direction: 'down' });

    expect(result.envSelect.selectedIndex).toBe(8);
    expect(result.envSelect.scrollOffset).toBe(1);
  });

  it('retreats offset when cursor moves above the visible window', () => {
    const state = makeManyEnvState({ envSelect: { ...INITIAL_ENV_SELECT, selectedIndex: 4, scrollOffset: 4 } });
    const result = reducer(state, { type: 'MOVE_ENV_SELECTION', direction: 'up' });

    expect(result.envSelect.selectedIndex).toBe(3);
    expect(result.envSelect.scrollOffset).toBe(3);
  });

  it('keeps offset stable when cursor moves within the visible window', () => {
    const state = makeManyEnvState({ envSelect: { ...INITIAL_ENV_SELECT, selectedIndex: 3 } });
    const result = reducer(state, { type: 'MOVE_ENV_SELECTION', direction: 'down' });

    expect(result.envSelect.selectedIndex).toBe(4);
    expect(result.envSelect.scrollOffset).toBe(0);
  });

  it('derives the picker window from the state geometry', () => {
    // At 12 rows the picker shows min(8, 12 - 8) = 4 options, so moving to
    // index 4 scrolls to 4 - 4 + 1 = 1; the 8-row window of a 24-row
    // terminal would keep the offset at 0.
    const state = makeManyEnvState({
      envSelect: { ...INITIAL_ENV_SELECT, selectedIndex: 3 },
      geometry: { rows: 12, columns: 80 },
    });
    const result = reducer(state, { type: 'MOVE_ENV_SELECTION', direction: 'down' });

    expect(result.envSelect.selectedIndex).toBe(4);
    expect(result.envSelect.scrollOffset).toBe(1);
  });
});

describe('JUMP_ENV_SELECTION reducer', () => {
  it('jump to top sets index to 0 and offset to 0', () => {
    const state = makeManyEnvState({ envSelect: { ...INITIAL_ENV_SELECT, selectedIndex: 11, scrollOffset: 4 } });
    const result = reducer(state, { type: 'JUMP_ENV_SELECTION', target: 'top' });

    expect(result.envSelect.selectedIndex).toBe(0);
    expect(result.envSelect.scrollOffset).toBe(0);
  });

  it('jump to bottom sets index to last and syncs offset', () => {
    const state = makeManyEnvState({ envSelect: { ...INITIAL_ENV_SELECT, selectedIndex: 0, scrollOffset: 0 } });
    const result = reducer(state, { type: 'JUMP_ENV_SELECTION', target: 'bottom' });

    expect(result.envSelect.selectedIndex).toBe(11);
    expect(result.envSelect.scrollOffset).toBe(4);
  });

  it('is a no-op when availableEnvironments is empty', () => {
    const state = makeManyEnvState({ availableEnvironments: [] });
    const result = reducer(state, { type: 'JUMP_ENV_SELECTION', target: 'top' });

    expect(result).toBe(state);
  });
});

describe('ENTER_ENV_SELECT scroll offset', () => {
  it('computes offset to show active env when it is below the visible window', () => {
    const state = makeManyEnvState({ activeEnvName: 'Demo' });
    const result = reducer(state, { type: 'ENTER_ENV_SELECT' });

    expect(result.envSelect.selectedIndex).toBe(11);
    expect(result.envSelect.scrollOffset).toBe(4);
  });

  it('preserves offset when active env is already visible', () => {
    const state = makeManyEnvState({ activeEnvName: 'QA' });
    const result = reducer(state, { type: 'ENTER_ENV_SELECT' });

    expect(result.envSelect.selectedIndex).toBe(3);
    expect(result.envSelect.scrollOffset).toBe(0);
  });

  // Pure reducer semantics: app entry always starts from an offset of 0
  // because exit and commit reset the cluster.
  it('keeps a compatible offset when entering with the selected index already visible', () => {
    const state = makeManyEnvState({ activeEnvName: 'Demo', envSelect: { ...INITIAL_ENV_SELECT, scrollOffset: 4 } });
    const result = reducer(state, { type: 'ENTER_ENV_SELECT' });

    expect(result.envSelect.selectedIndex).toBe(11);
    expect(result.envSelect.scrollOffset).toBe(4);
  });

  it('corrects an offset that hides the selected index on entry', () => {
    const state = makeManyEnvState({ activeEnvName: 'Dev', envSelect: { ...INITIAL_ENV_SELECT, scrollOffset: 8 } });
    const result = reducer(state, { type: 'ENTER_ENV_SELECT' });

    expect(result.envSelect.selectedIndex).toBe(1);
    expect(result.envSelect.scrollOffset).toBe(1);
  });
});

describe('envSelect dormancy invariant', () => {
  // Characterization pin: the exit and commit resets already enforce dormancy.
  // scrollOffset derives from selectedIndex clamping; the whole-object reset
  // drops it with the index.
  it('cluster deep-equals INITIAL_ENV_SELECT after every exit/commit action', () => {
    const dirty = makeManyEnvState({ mode: 'envSelect', envSelect: { selectedIndex: 3, scrollOffset: 3, error: 'some error' } });

    const afterCancel = reducer(dirty, { type: 'CANCEL_ENV_SELECT' });
    expect(afterCancel.mode).toBe('normal');
    expect(afterCancel.envSelect).toEqual(INITIAL_ENV_SELECT);

    const afterSwitch = reducer(dirty, {
      type: 'SWITCH_ENV',
      environmentVariables: devEnvVariables,
      envName: 'Development',
    });
    expect(afterSwitch.mode).toBe('normal');
    expect(afterSwitch.envSelect).toEqual(INITIAL_ENV_SELECT);
  });
});
