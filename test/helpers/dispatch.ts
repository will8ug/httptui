import { vi } from 'vitest';
import type { Key } from 'ink';
import type { Mock } from 'vitest';

import { handleNormalInput } from '../../src/app/input-handlers';
import type { Action, AppState, FocusedPanel } from '../../src/core/types';
import { makeKey } from './keys';
import { createRequest } from './requests';
import { createMockResponse } from './responses';
import { createInitialState } from './state';

export type Panel = FocusedPanel | null;

interface NormalInputRun {
  actions: Action[];
  exit: Mock;
  suspend: Mock;
  clipboardRunner: Mock;
  clipboardReadRunner: Mock;
}

/**
 * Drives handleNormalInput — the single dispatch handler serving both split
 * view and fullscreen — capturing every observable sink: dispatched actions,
 * exit, suspend, and both clipboard runners.
 */
export function runNormalInput(
  state: AppState,
  input: string,
  key: Key = makeKey(),
  abortControllerRef: { current: AbortController | null } = { current: null },
): NormalInputRun {
  const actions: Action[] = [];
  const exit = vi.fn();
  const suspend = vi.fn();
  const clipboardRunner = vi.fn(async () => '');
  const clipboardReadRunner = vi.fn(async () => '');
  handleNormalInput({
    state,
    selectedRequest: state.requests[state.selectedIndex],
    exit,
    suspend,
    executorConfig: { insecure: false },
    clipboardRunner,
    clipboardReadRunner,
    abortControllerRef,
    input,
    key,
    dispatch: (action) => actions.push(action),
  });
  return { actions, exit, suspend, clipboardRunner, clipboardReadRunner };
}

export function pressKey(state: AppState, input: string, key: Key = makeKey()): Action[] {
  return runNormalInput(state, input, key).actions;
}

/**
 * State with the given panel maximized, honoring the maximized-focus invariant
 * (maximizedPanel, when set, equals focusedPanel). Null keeps split view.
 */
export function panelState(panel: Panel, overrides: Partial<AppState> = {}): AppState {
  return createInitialState(
    panel === null ? overrides : { maximizedPanel: panel, focusedPanel: panel, ...overrides },
  );
}

/**
 * Panel state where every binding has something to act on: a dirty request, a
 * loaded response, two environments. A key that dispatches nothing here is
 * gated by mode or visibility — never starved of data.
 */
export function populatedPanelState(panel: Panel, overrides: Partial<AppState> = {}): AppState {
  return panelState(panel, {
    requests: [createRequest({ name: 'Get Users', body: 'payload', isDirty: true })],
    selectedIndex: 0,
    response: createMockResponse({ body: '{"a":1}', rawBody: '{"a":1}' }),
    availableEnvironments: [
      { name: '(none)', file: null },
      { name: 'Dev', file: 'dev.json' },
    ],
    showRequestDetails: panel === 'details',
    ...overrides,
  });
}
