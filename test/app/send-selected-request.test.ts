import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { executeRequestMock } = vi.hoisted(() => ({ executeRequestMock: vi.fn() }));

vi.mock('../../src/core/executor', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/core/executor')>();
  return { ...actual, executeRequest: executeRequestMock };
});

import { sendSelectedRequest } from '../../src/app/commands';
import type { ResponseCallbacks } from '../../src/core/executor';
import type { Action, AppState, ResponseChunk } from '../../src/core/types';
import { CHUNK_COALESCE_WINDOW_MS } from '../../src/utils/timing';
import { createRequest } from '../helpers/requests';
import { createHeadersTimeSnapshot, createMockResponse } from '../helpers/responses';
import { createInitialState } from '../helpers/state';

const headersSnapshot = createHeadersTimeSnapshot();

const completedResponse = createMockResponse({
  body: 'done',
  rawBody: 'done',
  timing: { durationMs: 42 },
  size: { bodyBytes: 4 },
});

function sendState(): AppState {
  return createInitialState({
    requests: [createRequest({ name: 'Get Users' })],
    selectedIndex: 0,
  });
}

async function runSend(
  dispatched: Action[],
  abortControllerRef: { current: AbortController | null } = { current: null },
): Promise<void> {
  await sendSelectedRequest({
    state: sendState(),
    executorConfig: { insecure: false },
    abortControllerRef,
    dispatch: (action) => {
      dispatched.push(action);
    },
  });
}

beforeEach(() => {
  executeRequestMock.mockReset();
});

describe('sendSelectedRequest headers-time wiring', () => {
  it('dispatches RECEIVE_RESPONSE_HEADERS with the executor snapshot, then RECEIVE_RESPONSE at completion', async () => {
    executeRequestMock.mockImplementation(
      async (
        _request: unknown,
        _config: unknown,
        _certConfig: unknown,
        _signal: unknown,
        callbacks: ResponseCallbacks | undefined,
      ) => {
        callbacks?.onHeaders?.(headersSnapshot);
        return completedResponse;
      },
    );
    const dispatched: Action[] = [];

    await runSend(dispatched);

    expect(dispatched).toEqual([
      { type: 'SEND_REQUEST' },
      { type: 'RECEIVE_RESPONSE_HEADERS', response: headersSnapshot },
      { type: 'RECEIVE_RESPONSE', response: completedResponse },
    ]);
  });

  it('dispatches nothing from the headers callback or the result once the request is aborted', async () => {
    const abortControllerRef: { current: AbortController | null } = { current: null };
    executeRequestMock.mockImplementation(
      async (
        _request: unknown,
        _config: unknown,
        _certConfig: unknown,
        _signal: unknown,
        callbacks: ResponseCallbacks | undefined,
      ) => {
        abortControllerRef.current?.abort();
        callbacks?.onHeaders?.(headersSnapshot);
        return { message: 'This operation was aborted', code: 'ABORT_ERR' };
      },
    );
    const dispatched: Action[] = [];

    await runSend(dispatched, abortControllerRef);

    expect(dispatched).toEqual([{ type: 'SEND_REQUEST' }]);
  });
});

describe('sendSelectedRequest chunk-append wiring', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function chunk(raw: string, display: string, bytes: number): ResponseChunk {
    return { raw, display, bytes };
  }

  it('flushes a chunk burst as one append per coalescing window, then the tail before RECEIVE_RESPONSE', async () => {
    executeRequestMock.mockImplementation(
      async (
        _request: unknown,
        _config: unknown,
        _certConfig: unknown,
        _signal: unknown,
        callbacks: ResponseCallbacks | undefined,
      ) => {
        callbacks?.onHeaders?.(headersSnapshot);
        callbacks?.onChunk?.(chunk('Hel', 'Hel', 3));
        callbacks?.onChunk?.(chunk('lo\r', 'lo\n', 3));
        await vi.advanceTimersByTimeAsync(CHUNK_COALESCE_WINDOW_MS);
        callbacks?.onChunk?.(chunk('!', '!', 1));
        return completedResponse;
      },
    );
    const dispatched: Action[] = [];

    await runSend(dispatched);

    expect(dispatched).toEqual([
      { type: 'SEND_REQUEST' },
      { type: 'RECEIVE_RESPONSE_HEADERS', response: headersSnapshot },
      { type: 'APPEND_RESPONSE_BODY', chunk: { raw: 'Hello\r', display: 'Hello\n', bytes: 6 } },
      { type: 'APPEND_RESPONSE_BODY', chunk: { raw: '!', display: '!', bytes: 1 } },
      { type: 'RECEIVE_RESPONSE', response: completedResponse },
    ]);
  });

  it('carries everything still coalesced in the synchronous completion flush before RECEIVE_RESPONSE', async () => {
    executeRequestMock.mockImplementation(
      async (
        _request: unknown,
        _config: unknown,
        _certConfig: unknown,
        _signal: unknown,
        callbacks: ResponseCallbacks | undefined,
      ) => {
        callbacks?.onHeaders?.(headersSnapshot);
        callbacks?.onChunk?.(chunk('alpha', 'alpha', 5));
        callbacks?.onChunk?.(chunk('-beta', '-beta', 5));
        return completedResponse;
      },
    );
    const dispatched: Action[] = [];

    await runSend(dispatched);

    expect(dispatched).toEqual([
      { type: 'SEND_REQUEST' },
      { type: 'RECEIVE_RESPONSE_HEADERS', response: headersSnapshot },
      { type: 'APPEND_RESPONSE_BODY', chunk: { raw: 'alpha-beta', display: 'alpha-beta', bytes: 10 } },
      { type: 'RECEIVE_RESPONSE', response: completedResponse },
    ]);
  });

  it('dispatches no append once the request is aborted, including a window expiring after the abort', async () => {
    const abortControllerRef: { current: AbortController | null } = { current: null };
    executeRequestMock.mockImplementation(
      async (
        _request: unknown,
        _config: unknown,
        _certConfig: unknown,
        _signal: unknown,
        callbacks: ResponseCallbacks | undefined,
      ) => {
        callbacks?.onHeaders?.(headersSnapshot);
        callbacks?.onChunk?.(chunk('partial ', 'partial ', 8));
        abortControllerRef.current?.abort();
        callbacks?.onChunk?.(chunk('after-abort', 'after-abort', 11));
        await vi.advanceTimersByTimeAsync(CHUNK_COALESCE_WINDOW_MS);
        return { message: 'This operation was aborted', code: 'ABORT_ERR' };
      },
    );
    const dispatched: Action[] = [];

    await runSend(dispatched, abortControllerRef);

    expect(dispatched).toEqual([
      { type: 'SEND_REQUEST' },
      { type: 'RECEIVE_RESPONSE_HEADERS', response: headersSnapshot },
    ]);
  });

  it('aborts the coalescer before REQUEST_ERROR so nothing appends after an error', async () => {
    executeRequestMock.mockImplementation(
      async (
        _request: unknown,
        _config: unknown,
        _certConfig: unknown,
        _signal: unknown,
        callbacks: ResponseCallbacks | undefined,
      ) => {
        callbacks?.onHeaders?.(headersSnapshot);
        callbacks?.onChunk?.(chunk('partial data', 'partial data', 12));
        return { message: 'socket hang up', code: 'ECONNRESET' };
      },
    );
    const dispatched: Action[] = [];

    await runSend(dispatched);
    await vi.advanceTimersByTimeAsync(CHUNK_COALESCE_WINDOW_MS);

    expect(dispatched).toEqual([
      { type: 'SEND_REQUEST' },
      { type: 'RECEIVE_RESPONSE_HEADERS', response: headersSnapshot },
      { type: 'REQUEST_ERROR', error: { message: 'socket hang up', code: 'ECONNRESET' } },
    ]);
  });
});
