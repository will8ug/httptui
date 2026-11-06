import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ErrorInfo, ResolvedRequest, ResponseData } from '../../src/core/types';

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
import type { ResponseCallbacks, ResponseChunk } from '../../src/core/executor';
import { createHeadersTimeSnapshot } from '../helpers/responses';
import { createResolvedRequest } from '../helpers/requests';
import { createHeldUndiciBody, createMockUndiciResponse as createMockResponse } from '../helpers/undici';
import type { MockUndiciResponse } from '../helpers/undici';

function createChunkRecorder(): {
  recorded: ResponseChunk[];
  onChunk: (chunk: ResponseChunk) => void;
} {
  const recorded: ResponseChunk[] = [];

  return {
    recorded,
    onChunk: (chunk) => {
      recorded.push(chunk);
    },
  };
}

function joinedRaw(recorded: ResponseChunk[]): string {
  return recorded.map((chunk) => chunk.raw).join('');
}

function joinedDisplay(recorded: ResponseChunk[]): string {
  return recorded.map((chunk) => chunk.display).join('');
}

function totalBytes(recorded: ResponseChunk[]): number {
  return recorded.reduce((sum, chunk) => sum + chunk.bytes, 0);
}

function assertResponse(result: ResponseData | ErrorInfo): ResponseData {
  if (isErrorInfo(result)) {
    throw new Error(`Expected successful response, got error: ${result.message}`);
  }

  return result;
}

function executeWithCallbacks(
  resolvedRequest: ResolvedRequest,
  callbacks: ResponseCallbacks,
): Promise<ResponseData | ErrorInfo> {
  return executeRequest(resolvedRequest, undefined, undefined, undefined, callbacks);
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
      rawBody: '{"ok":true}',
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
      rawBody: '',
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
    expect(result.size.bodyBytes).toBe(Buffer.byteLength('line1\r\nline2\r\nline3', 'utf-8'));
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
    expect(result.size.bodyBytes).toBe(Buffer.byteLength('a\r\nb\rc\nd\r\ne', 'utf-8'));
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

  it('reports bodyBytes based on the raw body', async () => {
    requestMock.mockResolvedValue(createMockResponse({ body: 'a\r\nb' }));

    const result = await executeRequest(createResolvedRequest());

    expect(isErrorInfo(result)).toBe(false);
    if (isErrorInfo(result)) {
      throw new Error('Expected successful response');
    }

    expect(result.body).toBe('a\nb');
    expect(result.rawBody).toBe('a\r\nb');
    expect(result.size.bodyBytes).toBe(4);
  });

  it('preserves CRLF, lone CR, and mixed line endings verbatim in rawBody', async () => {
    requestMock.mockResolvedValue(createMockResponse({ body: 'crlf\r\nlone\rmixed\r\nlf\nend' }));

    const result = await executeRequest(createResolvedRequest());

    expect(isErrorInfo(result)).toBe(false);
    if (isErrorInfo(result)) {
      throw new Error('Expected successful response');
    }

    expect(result.rawBody).toBe('crlf\r\nlone\rmixed\r\nlf\nend');
    expect(result.body).toBe('crlf\nlone\nmixed\nlf\nend');
  });

  it('computes bodyBytes from rawBody, exceeding the normalized body by one byte per CRLF', async () => {
    requestMock.mockResolvedValue(createMockResponse({ body: 'one\r\ntwo\r\nthree' }));

    const result = await executeRequest(createResolvedRequest());

    expect(isErrorInfo(result)).toBe(false);
    if (isErrorInfo(result)) {
      throw new Error('Expected successful response');
    }

    expect(result.size.bodyBytes).toBe(Buffer.byteLength(result.rawBody, 'utf-8'));
    expect(result.size.bodyBytes).toBeGreaterThan(Buffer.byteLength(result.body, 'utf-8'));
    expect(result.size.bodyBytes - Buffer.byteLength(result.body, 'utf-8')).toBe(2);
  });

  it('returns rawBody equal to body for an LF-only body', async () => {
    requestMock.mockResolvedValue(createMockResponse({ body: 'line1\nline2\n' }));

    const result = await executeRequest(createResolvedRequest());

    expect(isErrorInfo(result)).toBe(false);
    if (isErrorInfo(result)) {
      throw new Error('Expected successful response');
    }

    expect(result.rawBody).toBe('line1\nline2\n');
    expect(result.rawBody).toBe(result.body);
    expect(result.size.bodyBytes).toBe(Buffer.byteLength(result.rawBody, 'utf-8'));
    expect(result.size.bodyBytes).toBe(Buffer.byteLength(result.body, 'utf-8'));
  });
});

describe('executeRequest headers-time callback', () => {
  function createHeldBodyResponse(overrides: {
    statusCode?: number;
    headers?: Record<string, string | string[]>;
  } = {}): { response: MockUndiciResponse; resolveBody: (body: string) => void } {
    let resolveBody!: (body: string) => void;
    const bodyText = new Promise<string>((resolve) => {
      resolveBody = resolve;
    });
    return {
      response: {
        statusCode: overrides.statusCode ?? 200,
        headers: overrides.headers ?? {},
        body: createHeldUndiciBody(bodyText),
      },
      resolveBody,
    };
  }

  it('delivers a headers-time snapshot before the body completes, leaving the final object unchanged', async () => {
    let resolveRequest!: (response: MockUndiciResponse) => void;
    requestMock.mockReturnValue(new Promise<MockUndiciResponse>((resolve) => {
      resolveRequest = resolve;
    }));
    const held = createHeldBodyResponse({
      statusCode: 201,
      headers: { 'content-type': 'text/plain', 'set-cookie': ['a=1', 'b=2'] },
    });
    const onHeaders = vi.fn();

    const pending = executeWithCallbacks(createResolvedRequest(), { onHeaders });
    expect(onHeaders).not.toHaveBeenCalled();

    resolveRequest(held.response);
    await Promise.resolve();

    expect(onHeaders).toHaveBeenCalledTimes(1);
    expect(onHeaders).toHaveBeenCalledWith(
      createHeadersTimeSnapshot({
        statusCode: 201,
        statusText: 'Created',
        headers: { 'content-type': 'text/plain', 'set-cookie': 'a=1, b=2' },
      }),
    );

    let settled = false;
    void pending.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);

    held.resolveBody('late payload');
    const result = await pending;

    expect(isErrorInfo(result)).toBe(false);
    if (isErrorInfo(result)) {
      throw new Error('Expected successful response');
    }
    expect(result).toEqual({
      statusCode: 201,
      statusText: 'Created',
      headers: { 'content-type': 'text/plain', 'set-cookie': 'a=1, b=2' },
      body: 'late payload',
      rawBody: 'late payload',
      timing: { durationMs: expect.any(Number) },
      size: { bodyBytes: Buffer.byteLength('late payload', 'utf-8') },
    });
  });

  it('never invokes onHeaders when the request fails', async () => {
    requestMock.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3000'));
    const onHeaders = vi.fn();

    const result = await executeWithCallbacks(createResolvedRequest(), { onHeaders });

    expect(isErrorInfo(result)).toBe(true);
    expect(onHeaders).not.toHaveBeenCalled();
  });
});

describe('executeRequest chunk streaming', () => {
  const nastyBodies = [
    'a\r\nb\rc\nd\r\ne',
    '\r\n\r\r\n',
    'x\r',
    '\r',
    'tail\r\n',
    '€\r\n😀\r',
  ];

  const splitUtf8Chunks = [
    Buffer.from('price: ', 'utf-8'),
    Buffer.from([0xe2]),
    Buffer.from([0x82, 0xac]),
    Buffer.from('1\n', 'utf-8'),
    Buffer.from([0xf0, 0x9f]),
    Buffer.from([0x98, 0x80]),
  ];

  function abortError(): DOMException {
    return new DOMException('This operation was aborted', 'AbortError');
  }

  it('emits decoded chunks in wire order, after the headers snapshot', async () => {
    const events: string[] = [];
    const recorder = createChunkRecorder();
    requestMock.mockResolvedValue(
      createMockResponse({ chunks: [Buffer.from('data: one\n'), Buffer.from('data: two\n')] }),
    );

    const result = assertResponse(
      await executeWithCallbacks(createResolvedRequest(), {
        onHeaders: () => {
          events.push('headers');
        },
        onChunk: (chunk) => {
          events.push(`chunk:${chunk.raw}`);
          recorder.onChunk(chunk);
        },
      }),
    );

    expect(events).toEqual(['headers', 'chunk:data: one\n', 'chunk:data: two\n']);
    expect(joinedRaw(recorder.recorded)).toBe(result.rawBody);
    expect(joinedDisplay(recorder.recorded)).toBe(result.body);
    expect(result).toEqual({
      statusCode: 200,
      statusText: 'OK',
      headers: {},
      body: 'data: one\ndata: two\n',
      rawBody: 'data: one\ndata: two\n',
      timing: { durationMs: expect.any(Number) },
      size: { bodyBytes: Buffer.byteLength('data: one\ndata: two\n', 'utf-8') },
    });
  });

  it('joins a UTF-8 sequence split across chunks without replacement characters', async () => {
    const recorder = createChunkRecorder();
    requestMock.mockResolvedValue(createMockResponse({ chunks: splitUtf8Chunks }));

    const result = assertResponse(
      await executeWithCallbacks(createResolvedRequest(), {
        onChunk: recorder.onChunk,
      }),
    );

    expect(recorder.recorded.map((chunk) => chunk.raw)).toEqual(['price: ', '€', '1\n', '😀']);
    expect(result.rawBody).toBe('price: €1\n😀');
    expect(result.body).toBe('price: €1\n😀');
    expect(result.rawBody).not.toContain('\uFFFD');
    expect(recorder.recorded.some((chunk) => chunk.raw.includes('\uFFFD'))).toBe(false);
  });

  it('attributes held-back bytes to the chunk that completes them', async () => {
    const recorder = createChunkRecorder();
    requestMock.mockResolvedValue(createMockResponse({ chunks: splitUtf8Chunks }));

    const result = assertResponse(
      await executeWithCallbacks(createResolvedRequest(), {
        onChunk: recorder.onChunk,
      }),
    );

    expect(recorder.recorded.map((chunk) => chunk.bytes)).toEqual([7, 3, 2, 4]);
    expect(recorder.recorded.map((chunk) => chunk.bytes)).toEqual(
      recorder.recorded.map((chunk) => Buffer.byteLength(chunk.raw, 'utf-8')),
    );
    expect(totalBytes(recorder.recorded)).toBe(result.size.bodyBytes);
    expect(result.size.bodyBytes).toBe(Buffer.byteLength('price: €1\n😀', 'utf-8'));
  });

  it('normalizes a CRLF split across chunks as a single newline', async () => {
    const recorder = createChunkRecorder();
    requestMock.mockResolvedValue(
      createMockResponse({ chunks: [Buffer.from('line1\r'), Buffer.from('\nline2')] }),
    );

    const result = assertResponse(
      await executeWithCallbacks(createResolvedRequest(), {
        onChunk: recorder.onChunk,
      }),
    );

    expect(recorder.recorded).toEqual([
      { raw: 'line1', display: 'line1', bytes: 5 },
      { raw: '\r\nline2', display: '\nline2', bytes: 7 },
    ]);
    expect(result.rawBody).toBe('line1\r\nline2');
    expect(result.body).toBe('line1\nline2');
    expect(totalBytes(recorder.recorded)).toBe(result.size.bodyBytes);
  });

  it('flushes a trailing carriage return held back at end of body', async () => {
    const recorder = createChunkRecorder();
    requestMock.mockResolvedValue(createMockResponse({ chunks: [Buffer.from('a\r')] }));

    const result = assertResponse(
      await executeWithCallbacks(createResolvedRequest(), {
        onChunk: recorder.onChunk,
      }),
    );

    expect(recorder.recorded).toEqual([
      { raw: 'a', display: 'a', bytes: 1 },
      { raw: '\r', display: '\n', bytes: 1 },
    ]);
    expect(result.rawBody).toBe('a\r');
    expect(result.body).toBe('a\n');
    expect(result.size.bodyBytes).toBe(2);
  });

  it('reproduces the buffered body and byte count at every chunk split point', async () => {
    for (const body of nastyBodies) {
      const wire = Buffer.from(body, 'utf-8');

      for (let split = 0; split <= wire.length; split += 1) {
        const where = `${JSON.stringify(body)} split at byte ${split}`;
        requestMock.mockResolvedValue(
          createMockResponse({ chunks: [wire.subarray(0, split), wire.subarray(split)] }),
        );
        const recorder = createChunkRecorder();

        const result = assertResponse(
          await executeWithCallbacks(createResolvedRequest(), {
            onChunk: recorder.onChunk,
          }),
        );
        const { recorded } = recorder;

        expect(result.rawBody, where).toBe(body);
        expect(result.body, where).toBe(body.replace(/\r\n/g, '\n').replace(/\r/g, '\n'));
        expect(joinedRaw(recorded), where).toBe(result.rawBody);
        expect(joinedDisplay(recorded), where).toBe(result.body);
        expect(totalBytes(recorded), where).toBe(result.size.bodyBytes);
        expect(result.size.bodyBytes, where).toBe(Buffer.byteLength(body, 'utf-8'));
        expect(recorded.some((chunk) => chunk.raw === ''), where).toBe(false);
      }
    }
  });

  it('strips a leading BOM whether it arrives whole or split across chunks', async () => {
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const payload = Buffer.from('{"a":1}', 'utf-8');

    for (const chunks of [
      [bom, payload],
      [bom.subarray(0, 2), Buffer.concat([bom.subarray(2), payload])],
      [Buffer.concat([bom, payload.subarray(0, 1)]), payload.subarray(1)],
    ]) {
      const recorder = createChunkRecorder();
      requestMock.mockResolvedValue(createMockResponse({ chunks }));

      const result = assertResponse(
        await executeWithCallbacks(createResolvedRequest(), {
          onChunk: recorder.onChunk,
        }),
      );

      expect(result.rawBody).toBe('{"a":1}');
      expect(joinedRaw(recorder.recorded)).toBe('{"a":1}');
      expect(result.size.bodyBytes).toBe(Buffer.byteLength('{"a":1}', 'utf-8'));
    }
  });

  it('emits nothing for an empty body', async () => {
    const recorder = createChunkRecorder();
    requestMock.mockResolvedValue(createMockResponse({ body: '' }));

    const result = assertResponse(
      await executeWithCallbacks(createResolvedRequest(), {
        onChunk: recorder.onChunk,
      }),
    );

    expect(recorder.recorded).toEqual([]);
    expect(result.rawBody).toBe('');
    expect(result.body).toBe('');
    expect(result.size.bodyBytes).toBe(0);
  });

  it('decodes a binary body exactly like the buffered read', async () => {
    const garbage = [
      Buffer.from([0xff, 0xfe, 0x41]),
      Buffer.from([0x80, 0xc3]),
      Buffer.from([0x28, 0xe2, 0x82]),
    ];
    const bufferedRead = Buffer.concat(garbage).toString('utf-8');
    const recorder = createChunkRecorder();
    requestMock.mockResolvedValue(createMockResponse({ chunks: garbage }));

    const result = assertResponse(
      await executeWithCallbacks(createResolvedRequest(), {
        onChunk: recorder.onChunk,
      }),
    );

    expect(result.rawBody).toBe(bufferedRead);
    expect(joinedRaw(recorder.recorded)).toBe(bufferedRead);
    expect(joinedDisplay(recorder.recorded)).toBe(result.body);
    expect(totalBytes(recorder.recorded)).toBe(result.size.bodyBytes);
    expect(result.size.bodyBytes).toBe(Buffer.byteLength(bufferedRead, 'utf-8'));
  });

  it('disables the undici body idle timeout for every request', async () => {
    requestMock.mockResolvedValue(createMockResponse({ body: 'ok' }));

    await executeRequest(createResolvedRequest());
    await executeRequest(createResolvedRequest(), { insecure: true });

    expect(requestMock).toHaveBeenCalledTimes(2);
    for (const [, options] of requestMock.mock.calls) {
      expect(options).toMatchObject({ bodyTimeout: 0 });
      expect(options).not.toHaveProperty('headersTimeout');
    }
  });

  it('stops emitting and returns the abort error when cancellation lands mid-body', async () => {
    const controller = new AbortController();
    requestMock.mockImplementation(() => ({
      statusCode: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from('event: one\n\n');
          await new Promise((_resolve, reject) => {
            if (controller.signal.aborted) {
              reject(abortError());
              return;
            }
            controller.signal.addEventListener('abort', () => {
              reject(abortError());
            });
          });
          yield Buffer.from('event: two\n\n');
        },
      },
    }));
    const recorder = createChunkRecorder();

    setTimeout(() => controller.abort(), 20);

    const result = await executeRequest(
      createResolvedRequest(),
      undefined,
      undefined,
      controller.signal,
      { onChunk: recorder.onChunk },
    );

    expect(isErrorInfo(result)).toBe(true);
    if (!isErrorInfo(result)) throw new Error('Expected error result');
    expect(result.message).toContain('aborted');
    expect(recorder.recorded).toEqual([
      { raw: 'event: one\n\n', display: 'event: one\n\n', bytes: 12 },
    ]);
  });

  it('stops emitting and returns the error when the body fails mid-transfer', async () => {
    requestMock.mockImplementation(() => ({
      statusCode: 200,
      headers: {},
      body: {
        async *[Symbol.asyncIterator]() {
          yield Buffer.from('partial body');
          throw Object.assign(new Error('terminated'), { code: 'UND_ERR_SOCKET' });
        },
      },
    }));
    const recorder = createChunkRecorder();

    const result = await executeWithCallbacks(createResolvedRequest(), {
      onChunk: recorder.onChunk,
    });

    expect(result).toEqual({ message: 'terminated', code: 'UND_ERR_SOCKET' });
    expect(joinedRaw(recorder.recorded)).toBe('partial body');
  });
});
