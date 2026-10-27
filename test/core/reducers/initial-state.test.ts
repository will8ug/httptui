import { describe, expect, it } from 'vitest';

import { createInitialState } from '../../../src/core/reducer';
import { defaultAppProps } from '../../helpers/state';
import { makeRequests } from '../../helpers/requests';

describe('createInitialState', () => {
  it('seeds sourceFormat from the startup prop', () => {
    const state = createInitialState({ ...defaultAppProps, sourceFormat: 'postman' });

    expect(state.sourceFormat).toBe('postman');
  });

  it('seeds the startup warning summary into the transient message channel', () => {
    const state = createInitialState({
      ...defaultAppProps,
      requests: makeRequests(12),
      warnings: ['w1', 'w2', 'w3'],
    });

    expect(state.transientMessage).toBe('Loaded 12 requests (3 warnings)');
    expect(state.transientWarning).toBeNull();
  });

  it('leaves the transient unset when the startup outcome carries no warnings', () => {
    const state = createInitialState({ ...defaultAppProps, warnings: [] });

    expect(state.transientMessage).toBeNull();
    expect(state.transientWarning).toBeNull();
  });
});
