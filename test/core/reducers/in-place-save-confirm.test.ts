import { describe, expect, it } from 'vitest';

import { createRequest } from '../../helpers/requests';
import { createInitialState, reducer } from '../../helpers/state';

describe('ENTER_IN_PLACE_SAVE_CONFIRM reducer', () => {
  it('sets mode to confirmInPlaceSave', () => {
    const dirty = createRequest({ isDirty: true, body: 'edited' });
    const state = createInitialState({
      requests: [dirty],
      selectedIndex: 0,
      filePath: 'api.http',
    });

    const result = reducer(state, { type: 'ENTER_IN_PLACE_SAVE_CONFIRM' });

    expect(result.mode).toBe('confirmInPlaceSave');
    expect(result.requests[0].isDirty).toBe(true);
    expect(result.filePath).toBe('api.http');
  });
});

describe('CONFIRM_IN_PLACE_SAVE reducer', () => {
  it('returns to normal mode', () => {
    const dirty = createRequest({ isDirty: true, body: 'edited' });
    const state = createInitialState({
      requests: [dirty],
      selectedIndex: 0,
      mode: 'confirmInPlaceSave',
      filePath: 'api.http',
    });

    const result = reducer(state, { type: 'CONFIRM_IN_PLACE_SAVE' });

    expect(result.mode).toBe('normal');
    expect(result.filePath).toBe('api.http');
  });
});

describe('CANCEL_IN_PLACE_SAVE reducer', () => {
  it('returns to normal mode preserving dirty markers and file state', () => {
    const dirty = createRequest({ isDirty: true, body: 'edited' });
    const clean = createRequest({ name: 'Other', isDirty: false });
    const state = createInitialState({
      requests: [dirty, clean],
      selectedIndex: 0,
      mode: 'confirmInPlaceSave',
      filePath: 'api.http',
    });

    const result = reducer(state, { type: 'CANCEL_IN_PLACE_SAVE' });

    expect(result.mode).toBe('normal');
    expect(result.requests[0].isDirty).toBe(true);
    expect(result.requests[0].body).toBe('edited');
    expect(result.requests[1].isDirty).toBe(false);
    expect(result.filePath).toBe('api.http');
  });
});
