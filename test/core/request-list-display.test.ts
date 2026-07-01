import { describe, expect, it } from 'vitest';

import { getMaxRequestLineWidth } from '../../src/utils/scroll';
import type { FileVariable } from '../../src/core/types';
import { createRequest } from '../helpers/requests';

describe('getMaxRequestLineWidth with variables', () => {
  it('computes width from resolved path, not raw URL', () => {
    const variables: FileVariable[] = [{ name: 'baseUrl', value: 'https://x.io' }];
    const requests = [createRequest({ url: '{{baseUrl}}/very-long-path', lineNumber: 1 })];

    const width = getMaxRequestLineWidth({ requests, variables });

    const expected = 2 + 7 + '/very-long-path'.length;
    expect(width).toBe(expected);
  });

  it('computes width from raw URL when variable is unresolved', () => {
    const requests = [createRequest({ url: '{{unknown}}/very-long-path', lineNumber: 1 })];

    const width = getMaxRequestLineWidth({ requests, variables: [] });

    expect(width).toBe(2 + 7 + '{{unknown}}/very-long-path'.length);
  });
});