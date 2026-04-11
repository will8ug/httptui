import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RequestError, ResolvedRequest, ResponseData } from '../src/core/types';

const { agentMock, requestMock } = vi.hoisted(() => ({
  agentMock: vi.fn().mockImplementation(() => ({})),
  requestMock: vi.fn(),
}));

vi.mock('undici', () => ({
  Agent: agentMock,
  request: requestMock,
}));

import { executeRequest, isRequestError } from '../src/core/executor';

function createResolvedRequest(overrides: Partial<ResolvedRequest> = {}): ResolvedRequest {
  return {
    method: 'GET',
    url: 'https://example.com/api',
    headers: {},
    body: undefined,
    ...overrides,
  };
}

function createMockResponse(overrides: {
  statusCode?: number;
  headers?: Record<string, string | string[]>;
  body?: string;
} = {}) {
  return {
    statusCode: overrides.statusCode ?? 200,
    headers: overrides.headers ?? {},
    body: {
      text: vi.fn().mockResolvedValue(overrides.body ?? ''),
    },
  };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('executeRequest', () => {
  it('returns ResponseData for a successful GET request', async () => {
    requestMock.mockResolvedValue(
      createMockResponse({
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: '{"ok":true}',
      }),
    );

    const result = await executeRequest(createResolvedRequest());

    expect(isRequestError(result)).toBe(false);
    if (isRequestError(result)) {
      throw new Error('Expected successful response');
    }

    expect(result).toEqual({
      statusCode: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: '{"ok":true}',
      timing: {
        durationMs: expect.any(Number),
      },
      size: {
        bodyBytes: Buffer.byteLength('{"ok":true}', 'utf-8'),
      },
    });

    expect(requestMock).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        method: 'GET',
        headers: {},
        body: undefined,
      }),
    );
  });

  it('auto-sets Content-Type for JSON POST bodies', async () => {
    requestMock.mockResolvedValue(createMockResponse());

    await executeRequest(
      createResolvedRequest({
        method: 'POST',
        body: '  {"name":"test"}',
      }),
    );

    expect(requestMock).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        method: 'POST',
        body: '  {"name":"test"}',
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );
  });

  it('does not override an explicit Content-Type header', async () => {
    requestMock.mockResolvedValue(createMockResponse());

    await executeRequest(
      createResolvedRequest({
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: '{"name":"test"}',
      }),
    );

    expect(requestMock).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        headers: {
          'content-type': 'text/plain',
        },
      }),
    );
  });

  it('returns RequestError for network failures', async () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:3000') as Error & { code?: string };
    error.code = 'ECONNREFUSED';
    requestMock.mockRejectedValue(error);

    const result = await executeRequest(createResolvedRequest());

    expect(isRequestError(result)).toBe(true);
    expect(result).toEqual({
      message: 'connect ECONNREFUSED 127.0.0.1:3000',
      code: 'ECONNREFUSED',
    });
  });

  it('appends TLS hint for UNABLE_TO_VERIFY_LEAF_SIGNATURE errors', async () => {
    const error = new Error('unable to verify the first certificate') as Error & { code?: string };
    error.code = 'UNABLE_TO_VERIFY_LEAF_SIGNATURE';
    requestMock.mockRejectedValue(error);

    const result = await executeRequest(createResolvedRequest());

    expect(isRequestError(result)).toBe(true);
    if (!isRequestError(result)) throw new Error('Expected error');
    expect(result.message).toContain('unable to verify the first certificate');
    expect(result.message).toContain('--insecure');
    expect(result.message).toContain('NODE_EXTRA_CA_CERTS');
    expect(result.code).toBe('UNABLE_TO_VERIFY_LEAF_SIGNATURE');
  });

  it('appends TLS hint for DEPTH_ZERO_SELF_SIGNED_CERT errors', async () => {
    const error = new Error('self-signed certificate') as Error & { code?: string };
    error.code = 'DEPTH_ZERO_SELF_SIGNED_CERT';
    requestMock.mockRejectedValue(error);

    const result = await executeRequest(createResolvedRequest());

    expect(isRequestError(result)).toBe(true);
    if (!isRequestError(result)) throw new Error('Expected error');
    expect(result.message).toContain('self-signed certificate');
    expect(result.message).toContain('--insecure');
  });

  it('does not append TLS hint for non-TLS errors', async () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:3000') as Error & { code?: string };
    error.code = 'ECONNREFUSED';
    requestMock.mockRejectedValue(error);

    const result = await executeRequest(createResolvedRequest());

    expect(isRequestError(result)).toBe(true);
    if (!isRequestError(result)) throw new Error('Expected error');
    expect(result.message).toBe('connect ECONNREFUSED 127.0.0.1:3000');
    expect(result.message).not.toContain('--insecure');
  });

  it('passes dispatcher with rejectUnauthorized:false when insecure is true', async () => {
    requestMock.mockResolvedValue(createMockResponse());

    await executeRequest(createResolvedRequest(), { insecure: true });

    expect(requestMock).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        dispatcher: expect.any(Object),
      }),
    );
  });

  it('does not pass dispatcher when insecure is false', async () => {
    requestMock.mockResolvedValue(createMockResponse());

    await executeRequest(createResolvedRequest(), { insecure: false });

    expect(requestMock).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        dispatcher: undefined,
      }),
    );
  });

  it('type guard identifies both response and error results', () => {
    const response: ResponseData = {
      statusCode: 204,
      statusText: 'No Content',
      headers: {},
      body: '',
      timing: { durationMs: 1 },
      size: { bodyBytes: 0 },
    };
    const error: RequestError = {
      message: 'timeout',
      code: 'UND_ERR_CONNECT_TIMEOUT',
    };

    expect(isRequestError(response)).toBe(false);
    expect(isRequestError(error)).toBe(true);
  });

  it('captures positive request timing', async () => {
    vi.spyOn(performance, 'now').mockReturnValueOnce(10).mockReturnValueOnce(25.5);
    requestMock.mockResolvedValue(createMockResponse({ body: 'ok' }));

    const result = await executeRequest(createResolvedRequest());

    expect(isRequestError(result)).toBe(false);
    if (isRequestError(result)) {
      throw new Error('Expected successful response');
    }

    expect(result.timing.durationMs).toBe(15.5);
    expect(result.timing.durationMs).toBeGreaterThan(0);
  });

  it('captures response headers as a Record<string, string>', async () => {
    requestMock.mockResolvedValue(
      createMockResponse({
        headers: {
          'content-type': 'text/plain',
          'set-cookie': ['a=1', 'b=2'],
        },
      }),
    );

    const result = await executeRequest(createResolvedRequest());

    expect(isRequestError(result)).toBe(false);
    if (isRequestError(result)) {
      throw new Error('Expected successful response');
    }

    expect(result.headers).toEqual({
      'content-type': 'text/plain',
      'set-cookie': 'a=1, b=2',
    });
  });
});
