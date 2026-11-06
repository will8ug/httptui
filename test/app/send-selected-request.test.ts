import { beforeEach, describe, expect, it, vi } from 'vitest';

const { executeRequestMock } = vi.hoisted(() => ({ executeRequestMock: vi.fn() }));

vi.mock('../../src/core/executor', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/core/executor')>();
  return { ...actual, executeRequest: executeRequestMock };
});

import { sendSelectedRequest } from '../../src/app/commands';
import type { ResponseCallbacks } from '../../src/core/executor';
import type { Action, AppState } from '../../src/core/types';
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
