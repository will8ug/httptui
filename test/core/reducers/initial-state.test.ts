import { describe, expect, it } from 'vitest';

import { createInitialState } from '../../../src/core/reducer';
import { defaultAppProps } from '../../helpers/state';

describe('createInitialState', () => {
  it('seeds sourceFormat from the startup prop', () => {
    const state = createInitialState({ ...defaultAppProps, sourceFormat: 'postman' });

    expect(state.sourceFormat).toBe('postman');
  });
});
