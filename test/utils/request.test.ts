import { describe, expect, it } from 'vitest';

import { createRequest } from '../helpers/requests';
import { hasUnsavedChanges } from '../../src/utils/request.js';

describe('hasUnsavedChanges', () => {
  it('returns false for an empty request list', () => {
    expect(hasUnsavedChanges([])).toBe(false);
  });

  it('returns false when no request is dirty', () => {
    expect(hasUnsavedChanges([createRequest(), createRequest()])).toBe(false);
  });

  it('returns true when at least one request is dirty', () => {
    expect(
      hasUnsavedChanges([createRequest(), createRequest({ isDirty: true }), createRequest()]),
    ).toBe(true);
  });

  it('returns true when every request is dirty', () => {
    expect(hasUnsavedChanges([createRequest({ isDirty: true }), createRequest({ isDirty: true })])).toBe(
      true,
    );
  });
});
