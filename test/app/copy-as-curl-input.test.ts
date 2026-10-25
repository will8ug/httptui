import { describe, expect, it, vi } from 'vitest';

import { handleEditInput } from '../../src/app/input-handlers';
import { ClipboardError } from '../../src/core/clipboard';
import type { ClipboardRunner } from '../../src/core/clipboard';
import { INITIAL_EDIT } from '../../src/core/reducers/helpers';
import type { Action, AppState } from '../../src/core/types';
import { runNormalInput } from '../helpers/dispatch';
import { makeKey } from '../helpers/keys';
import { createRequest } from '../helpers/requests';
import { createEditState, createInitialState } from '../helpers/state';

function variableRequestState(): AppState {
  return createInitialState({
    requests: [createRequest({ name: 'list users', url: 'https://{{baseUrl}}/users' })],
    selectedIndex: 0,
    variables: [{ name: 'baseUrl', value: 'api.example.com' }],
  });
}

describe('handleNormalInput y', () => {
  it('copies the resolved request and dispatches Copied as curl', async () => {
    const calls: Array<{ input: string | undefined }> = [];
    const clipboardRunner: ClipboardRunner = async (_command, _args, tool) => {
      calls.push({ input: tool.input });
      return '';
    };

    const { actions } = runNormalInput(variableRequestState(), 'y', { clipboardRunner });

    await vi.waitFor(() => {
      expect(actions).toEqual([{ type: 'SET_TRANSIENT_MESSAGE', message: 'Copied as curl' }]);
    });
    expect(calls).toHaveLength(1);
    const copiedInput = calls[0]?.input ?? '';
    expect(copiedInput.startsWith('curl ')).toBe(true);
    expect(copiedInput).toContain('https://api.example.com/users');
    expect(copiedInput).not.toContain('{{baseUrl}}');
  });

  it('dispatches SET_TRANSIENT_ERROR when the clipboard chain is exhausted', async () => {
    const clipboardRunner: ClipboardRunner = async () => {
      throw new ClipboardError(
        'Could not copy to clipboard: no clipboard tool available. Install xclip, xsel, or wl-clipboard (provides wl-copy).',
      );
    };

    const { actions } = runNormalInput(variableRequestState(), 'y', { clipboardRunner });

    await vi.waitFor(() => {
      expect(actions).toEqual([
        { type: 'SET_TRANSIENT_ERROR', error: expect.stringContaining('Could not copy to clipboard') },
      ]);
    });
  });
});

describe('handleEditInput y', () => {
  it('inserts the character and does not copy', () => {
    const clipboardRunner = vi.fn(async () => '');
    const request = createRequest({ url: 'https://{{baseUrl}}/users' });
    const dispatched: Action[] = [];

    handleEditInput({
      state: createEditState({
        requests: [request],
        selectedIndex: 0,
        edit: {
          ...INITIAL_EDIT,
          buffers: {
            url: { text: request.url, cursor: request.url.length },
            body: { text: '', cursor: 0 },
            headers: { text: '', cursor: 0 },
          },
        },
      }),
      selectedRequest: request,
      input: 'y',
      key: makeKey(),
      dispatch: (action) => dispatched.push(action),
    });

    expect(dispatched).toEqual([{
      type: 'EDIT_KEY',
      op: 'insert',
      insert: 'y',
    }]);
    expect(clipboardRunner).not.toHaveBeenCalled();
  });
});
