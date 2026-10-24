import { vi } from 'vitest';
import type { Key } from 'ink';
import type { Mock } from 'vitest';

import { handleNormalInput } from '../../src/app/input-handlers';
import type { ClipboardRunner } from '../../src/core/clipboard';
import type { Action, AppState, FocusedPanel } from '../../src/core/types';
import { makeKey } from './keys';
import { createRequest } from './requests';
import { createMockResponse } from './responses';
import { createInitialState } from './state';

export type Panel = FocusedPanel | null;

/** Sink overrides for tests that need to drive a sink themselves. */
export interface NormalInputOptions {
  clipboardRunner?: ClipboardRunner;
  clipboardReadRunner?: ClipboardRunner;
}

interface NormalInputRun {
  actions: Action[];
  dispatch: Mock;
  exit: Mock;
  suspend: Mock;
  clipboardRunner: Mock | ClipboardRunner;
  clipboardReadRunner: Mock | ClipboardRunner;
}

function isKey(value: Key | NormalInputOptions): value is Key {
  return 'upArrow' in value;
}

/**
 * Drives handleNormalInput, capturing dispatched actions, exit, suspend, both
 * clipboard runners, and the dispatch mock. Runner overrides
 * ({ clipboardRunner, clipboardReadRunner }) in the third argument are
 * discriminated from a Key at runtime by `'upArrow' in value`.
 */
export function runNormalInput(
  state: AppState,
  input: string,
  key?: Key,
  abortControllerRef?: { current: AbortController | null },
): NormalInputRun;
export function runNormalInput(
  state: AppState,
  input: string,
  options: NormalInputOptions,
  abortControllerRef?: { current: AbortController | null },
): NormalInputRun;
export function runNormalInput(
  state: AppState,
  input: string,
  keyOrOptions: Key | NormalInputOptions = makeKey(),
  abortControllerRef: { current: AbortController | null } = { current: null },
): NormalInputRun {
  const key = isKey(keyOrOptions) ? keyOrOptions : makeKey();
  const options = isKey(keyOrOptions) ? {} : keyOrOptions;
  const actions: Action[] = [];
  const dispatch = vi.fn((action: Action) => {
    actions.push(action);
  });
  const exit = vi.fn();
  const suspend = vi.fn();
  const clipboardRunner = options.clipboardRunner ?? vi.fn(async () => '');
  const clipboardReadRunner = options.clipboardReadRunner ?? vi.fn(async () => '');
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
    dispatch,
  });
  return { actions, dispatch, exit, suspend, clipboardRunner, clipboardReadRunner };
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
