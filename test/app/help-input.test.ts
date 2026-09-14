import { describe, expect, it } from 'vitest';
import type { Key } from 'ink';

import { handleHelpInput } from '../../src/app/input-handlers';
import type { Action } from '../../src/core/types';
import { makeKey } from '../helpers/keys';

function pressHelpKey(input: string, key: Key = makeKey()): Action[] {
  const dispatched: Action[] = [];
  handleHelpInput({
    input,
    key,
    dispatch: (action) => dispatched.push(action),
  });
  return dispatched;
}

describe('handleHelpInput', () => {
  it('? dispatches CLOSE_HELP', () => {
    expect(pressHelpKey('?')).toEqual([{ type: 'CLOSE_HELP' }]);
  });

  it('Escape dispatches CLOSE_HELP', () => {
    expect(pressHelpKey('', makeKey({ escape: true }))).toEqual([{ type: 'CLOSE_HELP' }]);
  });
});
