import type { ResponseData } from '../../src/core/types';

export function createMockResponse(overrides: Partial<ResponseData> = {}): ResponseData {
  return {
    statusCode: 200,
    statusText: 'OK',
    headers: {},
    body: '',
    timing: { durationMs: 100 },
    size: { bodyBytes: 0 },
    ...overrides,
  };
}

export const longResponse: ResponseData = createMockResponse({
  body: 'x'.repeat(200),
  size: { bodyBytes: 200 },
});