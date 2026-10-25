import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Key } from 'ink';

import { handleEditInput } from '../../src/app/input-handlers';
import { headersToText } from '../../src/core/headers';
import { INITIAL_EDIT } from '../../src/core/reducers/helpers';
import type { Action, AppState, EditState, ParsedRequest } from '../../src/core/types';
import { EDIT_CANCEL_WINDOW_MS } from '../../src/utils/timing';
import { runNormalInput } from '../helpers/dispatch';
import { makeKey } from '../helpers/keys';
import { createRequest } from '../helpers/requests';
import { createEditState, createInitialState, reducer } from '../helpers/state';

const NOW = 1_700_000_000_000;

function editState(request: ParsedRequest, buffers: EditState['buffers'], overrides: Partial<EditState> = {}): AppState {
  return createEditState({
    requests: [request],
    selectedIndex: 0,
    edit: { ...INITIAL_EDIT, buffers, ...overrides },
  });
}

function matchingBuffers(request: ParsedRequest): EditState['buffers'] {
  const body = request.body ?? '';
  return {
    url: { text: request.url, cursor: request.url.length },
    body: { text: body, cursor: body.length },
    headers: { text: '', cursor: 0 },
  };
}

function pressEditKey(state: AppState, input: string, key: Key = makeKey()): Action[] {
  const dispatched: Action[] = [];
  handleEditInput({
    state,
    selectedRequest: state.requests[state.selectedIndex],
    input,
    key,
    dispatch: (action) => dispatched.push(action),
  });
  return dispatched;
}

describe('handleEditInput Escape cancel window', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('first Escape with uncommitted changes keeps the editor open and sets the hint', () => {
    const request = createRequest({ body: 'original' });
    const state = editState(request, {
      url: { text: request.url, cursor: request.url.length },
      body: { text: 'changed', cursor: 7 },
      headers: { text: '', cursor: 0 },
    });

    const actions = pressEditKey(state, '', makeKey({ escape: true }));

    expect(actions).toEqual([{ type: 'ARM_EDIT_CANCEL', now: NOW }]);

    const next = reducer(state, actions[0]);
    expect(next.mode).toBe('edit');
    expect(next.edit.escapeArmedAt).toBe(NOW);
    expect(next.transientMessage).toBe('Press Esc again to discard changes');
  });

  it('Escape with no changes closes immediately', () => {
    const request = createRequest({ body: 'original' });
    const state = editState(request, matchingBuffers(request));

    const actions = pressEditKey(state, '', makeKey({ escape: true }));

    expect(actions).toEqual([{ type: 'CANCEL_EDIT' }]);

    const next = reducer(state, actions[0]);
    expect(next.mode).toBe('normal');
    expect(next.transientMessage).toBeNull();
  });

  it('second Escape within the window closes the editor', () => {
    const request = createRequest({ body: 'original' });
    const state = editState(request, {
      url: { text: request.url, cursor: request.url.length },
      body: { text: 'changed', cursor: 7 },
      headers: { text: '', cursor: 0 },
    }, { escapeArmedAt: NOW });

    vi.setSystemTime(NOW + EDIT_CANCEL_WINDOW_MS);

    const actions = pressEditKey(state, '', makeKey({ escape: true }));

    expect(actions).toEqual([{ type: 'CANCEL_EDIT' }]);
  });

  it('Escape after the window expires re-arms and keeps the editor open', () => {
    const request = createRequest({ body: 'original' });
    const state = editState(request, {
      url: { text: request.url, cursor: request.url.length },
      body: { text: 'changed', cursor: 7 },
      headers: { text: '', cursor: 0 },
    }, { escapeArmedAt: NOW });

    const expiredAt = NOW + EDIT_CANCEL_WINDOW_MS + 1;
    vi.setSystemTime(expiredAt);

    const actions = pressEditKey(state, '', makeKey({ escape: true }));

    expect(actions).toEqual([{ type: 'ARM_EDIT_CANCEL', now: expiredAt }]);

    const next = reducer(state, actions[0]);
    expect(next.mode).toBe('edit');
    expect(next.edit.escapeArmedAt).toBe(expiredAt);
    expect(next.transientMessage).toBe('Press Esc again to discard changes');
  });
});

describe('handleEditInput mode isolation', () => {
  it('Ctrl+G does not dispatch an editor-handoff action', () => {
    const request = createRequest({ body: 'original' });
    const actions = pressEditKey(editState(request, matchingBuffers(request)), 'g', makeKey({ ctrl: true }));

    expect(actions).toEqual([]);
  });
});

describe('handleEditInput body insert', () => {
  it('inserts newlines when a multi-line body is pasted as one chunk', () => {
    const request = createRequest({ body: '' });
    const state = editState(request, {
      url: { text: request.url, cursor: request.url.length },
      body: { text: '', cursor: 0 },
      headers: { text: '', cursor: 0 },
    }, { target: 'body' });

    const pasted = '{"a":1,\n"b":2}';
    const actions = pressEditKey(state, pasted);

    expect(actions).toEqual([{
      type: 'EDIT_KEY',
      op: 'insert',
      insert: pasted,
    }]);

    const next = reducer(state, actions[0]);
    expect(next.edit.buffers.body.text).toBe(pasted);
    expect(next.edit.buffers.body.cursor).toBe(pasted.length);
  });
});

describe('handleNormalInput e', () => {
  it('dispatches ENTER_EDIT with the headers buffer seeded from raw unresolved values', () => {
    const headers = { Accept: 'application/json', Authorization: 'Bearer {{token}}' };
    const request = createRequest({ headers });
    const state = createInitialState({ requests: [request], selectedIndex: 0 });
    const dispatched = runNormalInput(state, 'e').actions;

    const headersText = headersToText(headers);
    expect(headersText).toContain('{{token}}');
    expect(dispatched).toEqual([{
      type: 'ENTER_EDIT',
      buffers: { url: request.url, body: '', headers: headersText },
    }]);
  });
});
