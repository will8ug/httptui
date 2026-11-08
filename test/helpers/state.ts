import { createInitialState as _createInitialState, reducer } from '../../src/core/reducer';
import type { AppProps, AppState } from '../../src/core/types';
import { createHeadersTimeSnapshot } from './responses';

const defaultAppProps: AppProps = {
  filePath: 'test.http',
  sourceFormat: 'http',
  requests: [],
  variables: [],
  warnings: [],
  environmentVariables: [],
  fileVariables: [],
  activeEnvName: null,
  availableEnvironments: [],
  executorConfig: { insecure: false },
};

/**
 * Create an AppState for testing. Wraps the real createInitialState
 * with test-friendly defaults and allows partial overrides.
 */
export function createInitialState(overrides: Partial<AppState> = {}): AppState {
  const base = _createInitialState(defaultAppProps);
  return { ...base, ...overrides };
}

/** Headers received but still loading, the state that chunk appends and cancel act on. */
export function createStreamingState(): AppState {
  return reducer(
    reducer(createInitialState(), { type: 'SEND_REQUEST' }),
    { type: 'RECEIVE_RESPONSE_HEADERS', response: createHeadersTimeSnapshot() },
  );
}

export function createEditState(overrides: Partial<AppState> = {}): AppState {
  return { ...createInitialState(), mode: 'edit', ...overrides };
}

export { defaultAppProps, reducer };