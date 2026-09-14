import { describe, expect, it, vi } from 'vitest';
import type { Key } from 'ink';

import { handleConfirmDiscardInput, handleNormalInput } from '../../src/app/input-handlers';
import type { Action, AppState } from '../../src/core/types';
import { makeKey } from '../helpers/keys';
import { createRequest } from '../helpers/requests';
import { createInitialState } from '../helpers/state';

function runNormalInput(state: AppState, input: string, key: Key = makeKey()) {
  const dispatched: Action[] = [];
  const exit = vi.fn();
  handleNormalInput({
    state,
    selectedRequest: state.requests[state.selectedIndex],
    columns: 80,
    rows: 24,
    effectiveResponseHeight: 10,
    effectiveDetailMaxContent: 40,
    editorVisibleHeight: 10,
    editorContentWidth: 40,
    exit,
    suspend: vi.fn(),
    executorConfig: { insecure: false },
    clipboardRunner: vi.fn(async () => ''),
    clipboardReadRunner: vi.fn(async () => ''),
    abortControllerRef: { current: null },
    input,
    key,
    dispatch: (action) => dispatched.push(action),
  });
  return { actions: dispatched, exit };
}

function runConfirmInput(state: AppState, input: string, key: Key = makeKey()) {
  const dispatched: Action[] = [];
  const exit = vi.fn();
  handleConfirmDiscardInput({
    state,
    exit,
    suspend: vi.fn(),
    input,
    key,
    dispatch: (action) => dispatched.push(action),
  });
  return { actions: dispatched, exit };
}

function dirtyState(overrides: Partial<AppState> = {}): AppState {
  return createInitialState({
    requests: [createRequest({ isDirty: true })],
    selectedIndex: 0,
    ...overrides,
  });
}

function cleanState(overrides: Partial<AppState> = {}): AppState {
  return createInitialState({
    requests: [createRequest({ isDirty: false })],
    selectedIndex: 0,
    ...overrides,
  });
}

function confirming(action: NonNullable<AppState['pendingDiscardAction']>, overrides: Partial<AppState> = {}): AppState {
  return dirtyState({
    mode: 'confirmDiscard',
    pendingDiscardAction: action,
    ...overrides,
  });
}

describe('handleNormalInput discard confirm', () => {
  it('R while dirty dispatches REQUEST_DISCARD_CONFIRM for reload', () => {
    const { actions } = runNormalInput(dirtyState(), 'R');

    expect(actions).toEqual([{ type: 'REQUEST_DISCARD_CONFIRM', action: 'reload' }]);
  });

  it('o while dirty dispatches REQUEST_DISCARD_CONFIRM for fileLoad', () => {
    const { actions } = runNormalInput(dirtyState(), 'o');

    expect(actions).toEqual([{ type: 'REQUEST_DISCARD_CONFIRM', action: 'fileLoad' }]);
  });

  it('q while dirty dispatches REQUEST_DISCARD_CONFIRM for quit and does not exit', () => {
    const { actions, exit } = runNormalInput(dirtyState(), 'q');

    expect(actions).toEqual([{ type: 'REQUEST_DISCARD_CONFIRM', action: 'quit' }]);
    expect(exit).not.toHaveBeenCalled();
  });

  it('R while clean does not request discard confirmation', () => {
    const { actions } = runNormalInput(cleanState({ filePath: '/nonexistent/reload.http' }), 'R');

    expect(actions.map((action) => action.type)).not.toContain('REQUEST_DISCARD_CONFIRM');
  });

  it('o while clean enters file-load mode', () => {
    const { actions } = runNormalInput(cleanState(), 'o');

    expect(actions).toEqual([{ type: 'ENTER_FILE_LOAD' }]);
  });

  it('q while clean exits without a discard prompt', () => {
    const { actions, exit } = runNormalInput(cleanState(), 'q');

    expect(actions).toEqual([]);
    expect(exit).toHaveBeenCalledOnce();
  });
});

describe('handleConfirmDiscardInput', () => {
  it('y proceeds with the pending fileLoad action', () => {
    const { actions } = runConfirmInput(confirming('fileLoad'), 'y');

    expect(actions).toEqual([{ type: 'CONFIRM_DISCARD' }, { type: 'ENTER_FILE_LOAD' }]);
  });

  it('y on a failed reload confirms discard then reports the error without RELOAD_FILE', () => {
    const { actions } = runConfirmInput(confirming('reload', { filePath: '/nonexistent/gone.http' }), 'y');

    expect(actions[0]).toEqual({ type: 'CONFIRM_DISCARD' });
    expect(actions.map((action) => action.type)).toContain('SET_TRANSIENT_ERROR');
    expect(actions.map((action) => action.type)).not.toContain('RELOAD_FILE');
  });

  it('y on quit confirms discard and exits', () => {
    const { actions, exit } = runConfirmInput(confirming('quit'), 'y');

    expect(actions).toEqual([{ type: 'CONFIRM_DISCARD' }]);
    expect(exit).toHaveBeenCalledOnce();
  });

  it('n abandons and dispatches CANCEL_DISCARD', () => {
    const { actions, exit } = runConfirmInput(confirming('fileLoad'), 'n');

    expect(actions).toEqual([{ type: 'CANCEL_DISCARD' }]);
    expect(exit).not.toHaveBeenCalled();
  });

  it('Escape abandons and dispatches CANCEL_DISCARD', () => {
    const { actions, exit } = runConfirmInput(confirming('fileLoad'), '', makeKey({ escape: true }));

    expect(actions).toEqual([{ type: 'CANCEL_DISCARD' }]);
    expect(exit).not.toHaveBeenCalled();
  });
});
