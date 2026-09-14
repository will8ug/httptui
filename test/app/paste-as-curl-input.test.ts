import { describe, expect, it, vi } from 'vitest';
import type { Key } from 'ink';

import { handleEditInput, handleHelpInput, handleNormalInput, handleSearchInput } from '../../src/app/input-handlers';
import { ClipboardError } from '../../src/core/clipboard';
import type { ClipboardRunner } from '../../src/core/clipboard';
import type { Action, AppState } from '../../src/core/types';
import { makeKey } from '../helpers/keys';
import { createRequest } from '../helpers/requests';
import { createEditState, createInitialState } from '../helpers/state';

const PASTE_CURL = "curl 'https://api.example.com/pinged'";

function runNormalInput(
  state: AppState,
  input: string,
  options: {
    key?: Key;
    clipboardRunner?: ClipboardRunner;
    clipboardReadRunner?: ClipboardRunner;
  } = {},
) {
  const dispatched: Action[] = [];
  const clipboardRunner = options.clipboardRunner ?? vi.fn(async () => '');
  const clipboardReadRunner = options.clipboardReadRunner ?? vi.fn(async () => '');
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
    clipboardRunner,
    clipboardReadRunner,
    abortControllerRef: { current: null },
    input,
    key: options.key ?? makeKey(),
    dispatch: (action) => dispatched.push(action),
  });
  return { actions: dispatched, clipboardRunner, clipboardReadRunner };
}

function pasteState(): AppState {
  return createInitialState({
    requests: [createRequest({ name: 'list users' })],
    selectedIndex: 0,
  });
}

describe('handleNormalInput p', () => {
  it('appends the clipboard command as a request and dispatches Pasted request', async () => {
    const clipboardReadRunner = vi.fn(async () => PASTE_CURL);

    const { actions } = runNormalInput(pasteState(), 'p', { clipboardReadRunner });

    await vi.waitFor(() => {
      expect(actions).toEqual([
        {
          type: 'APPEND_REQUEST',
          request: expect.objectContaining({
            method: 'GET',
            url: 'https://api.example.com/pinged',
            isDirty: true,
            lineNumber: 0,
          }),
        },
        { type: 'SET_TRANSIENT_MESSAGE', message: 'Pasted request' },
      ]);
    });
    expect(clipboardReadRunner).toHaveBeenCalled();
  });

  it('dispatches SET_TRANSIENT_ERROR when the clipboard cannot be read', async () => {
    const clipboardReadRunner: ClipboardRunner = async () => {
      throw new ClipboardError(
        'Could not read clipboard: no clipboard tool found. Install xclip, xsel, or wl-clipboard (provides wl-paste).',
      );
    };

    const { actions } = runNormalInput(pasteState(), 'p', { clipboardReadRunner });

    await vi.waitFor(() => {
      expect(actions).toEqual([
        { type: 'SET_TRANSIENT_ERROR', error: expect.stringContaining('Could not read clipboard') },
      ]);
    });
    expect(actions.map((action) => action.type)).not.toContain('APPEND_REQUEST');
  });
});

describe('p is ignored in non-normal handlers', () => {
  it('handleEditInput inserts the character and does not read the clipboard', () => {
    const clipboardReadRunner = vi.fn(async () => PASTE_CURL);
    const request = createRequest({ name: 'list users' });
    const dispatched: Action[] = [];

    handleEditInput({
      state: createEditState({
        requests: [request],
        selectedIndex: 0,
        editBuffers: {
          url: { text: request.url, cursor: request.url.length },
          body: { text: '', cursor: 0 },
          headers: { text: '', cursor: 0 },
        },
      }),
      selectedRequest: request,
      editorVisibleHeight: 10,
      editorContentWidth: 40,
      input: 'p',
      key: makeKey(),
      dispatch: (action) => dispatched.push(action),
    });

    expect(dispatched).toEqual([{
      type: 'EDIT_KEY',
      op: 'insert',
      insert: 'p',
      visibleHeight: 10,
      visibleWidth: 40,
    }]);
    expect(clipboardReadRunner).not.toHaveBeenCalled();
  });

  it('handleHelpInput keeps the overlay and does not read the clipboard', () => {
    const clipboardReadRunner = vi.fn(async () => PASTE_CURL);
    const dispatched: Action[] = [];

    handleHelpInput({
      input: 'p',
      key: makeKey(),
      dispatch: (action) => dispatched.push(action),
    });

    expect(dispatched).toEqual([]);
    expect(dispatched.map((action) => action.type)).not.toContain('APPEND_REQUEST');
    expect(clipboardReadRunner).not.toHaveBeenCalled();
  });

  it('handleSearchInput treats p as query input rather than paste', () => {
    const clipboardReadRunner = vi.fn(async () => PASTE_CURL);
    const dispatched: Action[] = [];

    handleSearchInput({
      state: createInitialState({ mode: 'search', searchQuery: '' }),
      columns: 80,
      effectiveResponseHeight: 10,
      effectiveDetailMaxContent: 40,
      input: 'p',
      key: makeKey(),
      dispatch: (action) => dispatched.push(action),
    });

    expect(dispatched).toEqual([{ type: 'UPDATE_SEARCH_INPUT', value: 'p' }]);
    expect(dispatched.map((action) => action.type)).not.toContain('APPEND_REQUEST');
    expect(clipboardReadRunner).not.toHaveBeenCalled();
  });
});
