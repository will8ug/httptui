import type { ResponseData } from '../../src/core/types';

export function createMockResponse(overrides: Partial<ResponseData> = {}): ResponseData {
  const body = overrides.body ?? '';
  return {
    statusCode: 200,
    statusText: 'OK',
    headers: {},
    timing: { durationMs: 100 },
    size: { bodyBytes: 0 },
    ...overrides,
    body,
    rawBody: overrides.rawBody ?? body,
  };
}

export const longResponse: ResponseData = createMockResponse({
  body: 'x'.repeat(200),
  size: { bodyBytes: 200 },
});

export const compactJsonResponse: ResponseData = createMockResponse({
  body: '{"id":"1","name":"Willy","email":"willy@example.com","active":true,"role":"admin","createdAt":"2024-01-01T00:00:00Z"}',
  size: { bodyBytes: 117 },
});