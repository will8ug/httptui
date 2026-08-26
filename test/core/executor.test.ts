import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ErrorInfo, ResponseData } from '../../src/core/types';

const { agentMock, MockFormData, requestMock } = vi.hoisted(() => {
  class FormDataMock {
    private _data: Array<[string, string]> = [];

    append(key: string, value: string): void {
      this._data.push([key, value]);
    }

    entries(): Array<[string, string]> {
      return this._data;
    }
  }

  return {
    agentMock: vi.fn(),
    MockFormData: FormDataMock,
    requestMock: vi.fn(),
  };
});

vi.mock('undici', () => ({
  Agent: agentMock,
  FormData: MockFormData,
  request: requestMock,
}));

import { executeRequest, isErrorInfo } from '../../src/core/executor';
import { createResolvedRequest } from '../helpers/requests';

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

    expect(isErrorInfo(result)).toBe(false);
    if (isErrorInfo(result)) {
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

  it('completes a slow response without an internal deadline signal', async () => {
    requestMock.mockImplementation(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 300);
      });
      return createMockResponse({ statusCode: 200, body: 'slow response' });
    });

    const result = await executeRequest(createResolvedRequest());

    expect(isErrorInfo(result)).toBe(false);
    if (isErrorInfo(result)) {
      throw new Error('Expected successful response');
    }

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe('slow response');

    expect(requestMock).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        signal: undefined,
      }),
    );
  });

  it('sends no Content-Type for a JSON-looking body without one', async () => {
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
        headers: {},
      }),
    );
  });

  it('sends no Content-Type for a non-JSON body without one', async () => {
    requestMock.mockResolvedValue(createMockResponse());

    await executeRequest(
      createResolvedRequest({
        method: 'POST',
        body: 'plain text',
      }),
    );

    expect(requestMock).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        headers: {},
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

  it('sends FormData body when formdataFields are present', async () => {
    requestMock.mockResolvedValue(createMockResponse());

    await executeRequest(
      createResolvedRequest({
        method: 'POST',
        formdataFields: [
          { key: 'username', value: 'alice', type: 'text' as const },
          { key: 'email', value: 'alice@example.com', type: 'text' as const },
        ],
      }),
    );

    expect(requestMock).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          entries: expect.any(Function),
        }),
      }),
    );
  });

  it('strips Content-Type header when formdataFields are present', async () => {
    requestMock.mockResolvedValue(createMockResponse());

    await executeRequest(
      createResolvedRequest({
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        formdataFields: [
          { key: 'username', value: 'alice', type: 'text' as const },
        ],
      }),
    );

    expect(requestMock).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        headers: {},
      }),
    );
  });

  it('returns ErrorInfo for network failures', async () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:3000') as Error & { code?: string };
    error.code = 'ECONNREFUSED';
    requestMock.mockRejectedValue(error);

    const result = await executeRequest(createResolvedRequest());

    expect(isErrorInfo(result)).toBe(true);
    expect(result).toEqual({
      message: 'connect ECONNREFUSED 127.0.0.1:3000',
      code: 'ECONNREFUSED',
    });
  });

  it('returns ErrorInfo when the external abort signal fires mid-flight', async () => {
    const controller = new AbortController();
    requestMock.mockImplementation(
      (_url: string, options: { signal?: AbortSignal }) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(() => resolve(createMockResponse()), 2000);
          options.signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMException('This operation was aborted', 'AbortError'));
          });
        }),
    );

    setTimeout(() => controller.abort(), 50);

    const result = await executeRequest(
      createResolvedRequest(),
      undefined,
      undefined,
      controller.signal,
    );

    expect(isErrorInfo(result)).toBe(true);
    if (!isErrorInfo(result)) throw new Error('Expected error result');
    expect(result.message).toContain('aborted');
  });

  it('appends TLS hint for UNABLE_TO_VERIFY_LEAF_SIGNATURE errors', async () => {
    const error = new Error('unable to verify the first certificate') as Error & { code?: string };
    error.code = 'UNABLE_TO_VERIFY_LEAF_SIGNATURE';
    requestMock.mockRejectedValue(error);

    const result = await executeRequest(createResolvedRequest());

    expect(isErrorInfo(result)).toBe(true);
    if (!isErrorInfo(result)) throw new Error('Expected error');
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

    expect(isErrorInfo(result)).toBe(true);
    if (!isErrorInfo(result)) throw new Error('Expected error');
    expect(result.message).toContain('self-signed certificate');
    expect(result.message).toContain('--insecure');
  });

  it('does not append TLS hint for non-TLS errors', async () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:3000') as Error & { code?: string };
    error.code = 'ECONNREFUSED';
    requestMock.mockRejectedValue(error);

    const result = await executeRequest(createResolvedRequest());

    expect(isErrorInfo(result)).toBe(true);
    if (!isErrorInfo(result)) throw new Error('Expected error');
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
    const error: ErrorInfo = {
      message: 'timeout',
      code: 'UND_ERR_CONNECT_TIMEOUT',
    };

    expect(isErrorInfo(response)).toBe(false);
    expect(isErrorInfo(error)).toBe(true);
  });

  it('captures positive request timing', async () => {
    vi.spyOn(performance, 'now').mockReturnValueOnce(10).mockReturnValueOnce(25.5);
    requestMock.mockResolvedValue(createMockResponse({ body: 'ok' }));

    const result = await executeRequest(createResolvedRequest());

    expect(isErrorInfo(result)).toBe(false);
    if (isErrorInfo(result)) {
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

    expect(isErrorInfo(result)).toBe(false);
    if (isErrorInfo(result)) {
      throw new Error('Expected successful response');
    }

    expect(result.headers).toEqual({
      'content-type': 'text/plain',
      'set-cookie': 'a=1, b=2',
    });
  });

  it('normalizes CRLF line endings in response body', async () => {
    requestMock.mockResolvedValue(createMockResponse({ body: 'line1\r\nline2\r\nline3' }));

    const result = await executeRequest(createResolvedRequest());

    expect(isErrorInfo(result)).toBe(false);
    if (isErrorInfo(result)) {
      throw new Error('Expected successful response');
    }

    expect(result.body).toBe('line1\nline2\nline3');
    expect(result.body).not.toContain('\r');
    expect(result.size.bodyBytes).toBe(Buffer.byteLength('line1\nline2\nline3', 'utf-8'));
  });

  it('normalizes lone CR in response body', async () => {
    requestMock.mockResolvedValue(createMockResponse({ body: 'line1\rline2\rline3' }));

    const result = await executeRequest(createResolvedRequest());

    expect(isErrorInfo(result)).toBe(false);
    if (isErrorInfo(result)) {
      throw new Error('Expected successful response');
    }

    expect(result.body).toBe('line1\nline2\nline3');
    expect(result.size.bodyBytes).toBe(Buffer.byteLength('line1\nline2\nline3', 'utf-8'));
  });

  it('normalizes mixed CRLF, CR, and LF line endings', async () => {
    requestMock.mockResolvedValue(createMockResponse({ body: 'a\r\nb\rc\nd\r\ne' }));

    const result = await executeRequest(createResolvedRequest());

    expect(isErrorInfo(result)).toBe(false);
    if (isErrorInfo(result)) {
      throw new Error('Expected successful response');
    }

    expect(result.body).toBe('a\nb\nc\nd\ne');
    expect(result.size.bodyBytes).toBe(Buffer.byteLength('a\nb\nc\nd\ne', 'utf-8'));
  });

  it('leaves LF-only body byte-identical', async () => {
    requestMock.mockResolvedValue(createMockResponse({ body: 'line1\nline2\n' }));

    const result = await executeRequest(createResolvedRequest());

    expect(isErrorInfo(result)).toBe(false);
    if (isErrorInfo(result)) {
      throw new Error('Expected successful response');
    }

    expect(result.body).toBe('line1\nline2\n');
    expect(result.size.bodyBytes).toBe(Buffer.byteLength('line1\nline2\n', 'utf-8'));
  });

  it('handles empty body', async () => {
    requestMock.mockResolvedValue(createMockResponse({ body: '' }));

    const result = await executeRequest(createResolvedRequest());

    expect(isErrorInfo(result)).toBe(false);
    if (isErrorInfo(result)) {
      throw new Error('Expected successful response');
    }

    expect(result.body).toBe('');
    expect(result.size.bodyBytes).toBe(0);
  });

  it('reports bodyBytes based on normalized body', async () => {
    requestMock.mockResolvedValue(createMockResponse({ body: 'a\r\nb' }));

    const result = await executeRequest(createResolvedRequest());

    expect(isErrorInfo(result)).toBe(false);
    if (isErrorInfo(result)) {
      throw new Error('Expected successful response');
    }

    expect(result.body).toBe('a\nb');
    expect(result.size.bodyBytes).toBe(3);
  });
});
