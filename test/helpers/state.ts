import { createInitialState as _createInitialState, reducer } from '../../src/core/reducer';
import type { AppProps, AppState } from '../../src/core/types';

const defaultAppProps: AppProps = {
  filePath: 'test.http',
  requests: [],
  variables: [],
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

export { defaultAppProps, reducer };