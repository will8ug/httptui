import { describe, expect, it, vi } from 'vitest';

import { pasteFromClipboard } from '../../src/app/commands';
import type { Action } from '../../src/core/types';

describe('pasteFromClipboard', () => {
  it('appends the request and composes the parse warnings into the transient warning', async () => {
    const dispatched: Action[] = [];
    const clipboardReadRunner = vi.fn(async () => `curl -u 'alice' 'https://api.example.com'`);

    await pasteFromClipboard({
      clipboardReadRunner,
      dispatch: (action) => dispatched.push(action),
    });

    expect(dispatched).toEqual([
      {
        type: 'APPEND_REQUEST',
        request: expect.objectContaining({ method: 'GET', url: 'https://api.example.com' }),
      },
      { type: 'SET_TRANSIENT_WARNING', warning: 'Pasted request — some curl options were skipped' },
    ]);
    expect(clipboardReadRunner).toHaveBeenCalled();
  });
});
