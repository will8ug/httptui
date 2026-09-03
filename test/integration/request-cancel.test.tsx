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

import { delay, ENTER, ESC, KEY_DELAY_MS, press, renderApp, TAB } from '../helpers/integration';
import { createRequest } from '../helpers/requests';

interface MockUndiciResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: { text: () => Promise<string> };
}

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

function makeResponse(body: string): MockUndiciResponse {
  return {
    statusCode: 200,
    headers: {},
    body: { text: async () => body },
  };
}

function makeHeldBodyResponse(): { response: MockUndiciResponse; resolveBody: (body: string) => void } {
  let resolveBody!: (body: string) => void;
  const text = new Promise<string>((resolve) => {
    resolveBody = resolve;
  });
  return {
    response: { statusCode: 200, headers: {}, body: { text: () => text } },
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
  it('Escape during a slow in-flight request aborts it, clears loading, and leaves the empty prompt', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeRequests() });
    await delay(KEY_DELAY_MS);

    await press(stdin, ENTER);
    await delay(KEY_DELAY_MS * 2);
    releaseNext(makeResponse('first payload'));
    await delay(KEY_DELAY_MS * 4);
    expect(lastFrame() ?? '').toContain('first payload');

    await press(stdin, ENTER);
    await delay(KEY_DELAY_MS * 2);
    expect(lastFrame() ?? '').toContain('Sending request');

    await press(stdin, ESC);
    await delay(KEY_DELAY_MS * 2);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Request canceled');
    expect(frame).not.toContain('Sending request');
    expect(frame).toContain('Press Enter to send a request');
    expect(frame).not.toContain('first payload');
  });

  it('a response arriving after cancel is not rendered', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeRequests() });
    await delay(KEY_DELAY_MS);

    await press(stdin, ENTER);
    await delay(KEY_DELAY_MS * 2);

    const held = makeHeldBodyResponse();
    releaseNext(held.response);
    await delay(KEY_DELAY_MS * 2);
    expect(lastFrame() ?? '').toContain('Sending request');

    await press(stdin, ESC);
    await delay(KEY_DELAY_MS * 2);
    expect(lastFrame() ?? '').toContain('Request canceled');

    held.resolveBody('late payload');
    await delay(KEY_DELAY_MS * 4);

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('late payload');
    expect(frame).toContain('Request canceled');
    expect(frame).not.toContain('Sending request');
  });

  it('Escape with the help overlay open while loading closes the overlay without canceling', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeRequests() });
    await delay(KEY_DELAY_MS);

    await press(stdin, ENTER);
    await delay(KEY_DELAY_MS * 2);

    await press(stdin, '?');
    await delay(KEY_DELAY_MS * 2);
    expect(lastFrame() ?? '').toContain('Quit application');

    await press(stdin, ESC);
    await delay(KEY_DELAY_MS * 2);

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Quit application');
    expect(frame).toContain('Sending request');
    expect(frame).not.toContain('Request canceled');
  });

  it('Escape while loading in fullscreen cancels but stays fullscreen', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeRequests() });
    await delay(KEY_DELAY_MS);

    await press(stdin, TAB);
    await press(stdin, 'f');
    await delay(KEY_DELAY_MS);
    const fullscreenFrame = lastFrame() ?? '';
    expect(fullscreenFrame).toContain('Response');
    expect(fullscreenFrame).not.toContain('Requests');

    await press(stdin, ENTER);
    await delay(KEY_DELAY_MS * 2);
    expect(lastFrame() ?? '').toContain('Sending request');

    await press(stdin, ESC);
    await delay(KEY_DELAY_MS * 2);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Request canceled');
    expect(frame).not.toContain('Sending request');
    expect(frame).not.toContain('Requests');
    expect(frame).toContain('Response');
  });

  it('Enter after cancel starts a new request', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeRequests() });
    await delay(KEY_DELAY_MS);

    await press(stdin, ENTER);
    await delay(KEY_DELAY_MS * 2);

    await press(stdin, ESC);
    await delay(KEY_DELAY_MS * 2);
    expect(lastFrame() ?? '').toContain('Request canceled');

    await press(stdin, ENTER);
    await delay(KEY_DELAY_MS * 2);
    expect(lastFrame() ?? '').toContain('Sending request');

    releaseNext(makeResponse('fresh payload'));
    await delay(KEY_DELAY_MS * 4);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('fresh payload');
    expect(frame).not.toContain('Sending request');
  });
});
