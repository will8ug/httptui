import { describe, expect, it } from 'vitest';

import { createRequest } from '../helpers/requests';
import { hasUnsavedChanges, resolveRequestDetails } from '../../src/utils/request.js';

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

describe('resolveRequestDetails totalContentLines', () => {
  it('counts title, method/URL, separator, and body', () => {
    const request = createRequest({
      method: 'GET',
      url: 'https://api.example.com/users',
      headers: {},
      body: 'line1\nline2',
    });

    expect(resolveRequestDetails(request, []).totalContentLines).toBe(3 + 0 + 0 + 2);
  });

  it('counts headers and header separator', () => {
    const request = createRequest({
      method: 'POST',
      url: 'https://api.example.com/users',
      headers: { 'content-type': 'application/json' },
      body: undefined,
    });

    expect(resolveRequestDetails(request, []).totalContentLines).toBe(3 + 1 + 1 + 0);
  });

  it('counts a bare request as title, method/URL line, and separator', () => {
    expect(resolveRequestDetails(createRequest(), []).totalContentLines).toBe(3);
  });

  it('counts rendered form-data fields as content lines', () => {
    const request = createRequest({
      formdataFields: Array.from({ length: 12 }, (_, i) => ({
        key: `field-${i}`,
        value: 'v',
        type: 'text' as const,
      })),
    });

    expect(resolveRequestDetails(request, []).totalContentLines).toBe(3 + 12);
  });
});
