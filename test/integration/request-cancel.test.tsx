import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from 'ink-testing-library';

const { agentMock, requestMock } = vi.hoisted(() => ({
  agentMock: vi.fn().mockImplementation(() => ({})),
  requestMock: vi.fn(),
}));

vi.mock('undici', () => ({
  Agent: agentMock,
  request: requestMock,
}));

import { CHUNK_COALESCE_WINDOW_MS } from '../../src/utils/timing';
import { delay, ENTER, ESC, KEY_DELAY_MS, press, renderApp } from '../helpers/integration';
import { createRequest } from '../helpers/requests';
import { createHeldUndiciBody, createStagedUndiciBody } from '../helpers/undici';
import type { MockUndiciResponse } from '../helpers/undici';

interface PendingCall {
  resolve: (response: MockUndiciResponse) => void;
  reject: (error: unknown) => void;
  settled: boolean;
}

let pendingCalls: PendingCall[] = [];

function abortError(): DOMException {
  return new DOMException('This operation was aborted', 'AbortError');
}

function rejectPending(call: PendingCall): void {
  if (call.settled) {
    return;
  }
  call.settled = true;
  call.reject(abortError());
}

function releaseNext(response: MockUndiciResponse): void {
  const call = pendingCalls.find((c) => !c.settled);
  if (!call) {
    throw new Error('No pending request to release');
  }
  call.settled = true;
  call.resolve(response);
}

function makeHeldBodyResponse(): { response: MockUndiciResponse; resolveBody: (body: string) => void } {
  let resolveBody!: (body: string) => void;
  const text = new Promise<string>((resolve) => {
    resolveBody = resolve;
  });
  return {
    response: { statusCode: 200, headers: {}, body: createHeldUndiciBody(text) },
    resolveBody,
  };
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  pendingCalls = [];
  requestMock.mockReset();
  requestMock.mockImplementation((_url: string, options: { signal?: AbortSignal } = {}) => {
    return new Promise<MockUndiciResponse>((resolve, reject) => {
      const call: PendingCall = { resolve, reject, settled: false };
      pendingCalls.push(call);

      if (options.signal?.aborted) {
        rejectPending(call);
        return;
      }

      options.signal?.addEventListener('abort', () => {
        rejectPending(call);
      });
    });
  });
});

function makeRequests() {
  return [createRequest({ name: 'slow-req', url: 'https://a.co/slow' })];
}

describe('request cancel', () => {
  it('a response arriving after cancel is not rendered', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeRequests() });
    await delay(KEY_DELAY_MS);

    await press(stdin, ENTER);
    await delay(KEY_DELAY_MS * 2);

    const held = makeHeldBodyResponse();
    releaseNext(held.response);
    await delay(KEY_DELAY_MS * 2);
    const headersFrame = lastFrame() ?? '';
    expect(headersFrame).toContain('HTTP/1.1 200 OK');
    expect(headersFrame).toContain('STREAMING');
    expect(headersFrame).not.toContain('Sending request');

    await press(stdin, ESC);
    await delay(KEY_DELAY_MS * 2);
    const canceledFrame = lastFrame() ?? '';
    expect(canceledFrame).toContain('Request canceled');
    expect(canceledFrame).toContain('CANCELED 0 B');
    expect(canceledFrame).not.toContain('STREAMING');
    expect(canceledFrame).not.toMatch(/\d+ms/);

    held.resolveBody('late payload');
    await delay(KEY_DELAY_MS * 4);

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('late payload');
    expect(frame).toContain('Request canceled');
    expect(frame).not.toContain('Sending request');
  });

  it('canceling mid-stream keeps the partial body on display, marked canceled, and never grows after cancel', async () => {
    const staged = createStagedUndiciBody();
    staged.push('data: first event\n\n');
    const response: MockUndiciResponse = {
      statusCode: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: staged.body,
    };
    requestMock.mockImplementation(() => Promise.resolve(response));

    const { stdin, lastFrame } = renderApp({ requests: [createRequest({ name: 'sse-req', url: 'https://a.co/sse' })] });
    await delay(KEY_DELAY_MS);

    await press(stdin, ENTER);
    await delay(CHUNK_COALESCE_WINDOW_MS + 100);

    const streamingFrame = lastFrame() ?? '';
    expect(streamingFrame).toContain('HTTP/1.1 200 OK');
    expect(streamingFrame).toContain('STREAMING 19 B');
    expect(streamingFrame).toContain('data: first event');

    await press(stdin, ESC);
    await delay(KEY_DELAY_MS * 2);

    const canceledFrame = lastFrame() ?? '';
    expect(canceledFrame).toContain('Request canceled');
    expect(canceledFrame).toContain('data: first event');
    expect(canceledFrame).toContain('CANCELED 19 B');
    expect(canceledFrame).not.toContain('STREAMING');
    expect(canceledFrame).not.toMatch(/\d+ms/);

    staged.push('data: late event\n\n');
    staged.end();
    await delay(CHUNK_COALESCE_WINDOW_MS + 100);

    const settledFrame = lastFrame() ?? '';
    expect(settledFrame).toContain('CANCELED 19 B');
    expect(settledFrame).toContain('data: first event');
    expect(settledFrame).not.toContain('data: late event');
    expect(settledFrame).not.toContain('Sending request');
  });
});
