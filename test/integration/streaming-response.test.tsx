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
import { delay, ENTER, KEY_DELAY_MS, press, renderApp } from '../helpers/integration';
import { createRequest } from '../helpers/requests';
import { createMockUndiciResponse, createStagedUndiciBody } from '../helpers/undici';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  requestMock.mockReset();
});

describe('streaming response display', () => {
  it('shows the partial body growing mid-stream, then the completed pretty response', async () => {
    const staged = createStagedUndiciBody();
    staged.push('{"message":"hello ');
    const response = createMockUndiciResponse({
      headers: { 'content-type': 'application/json' },
      body: staged.body,
    });
    requestMock.mockImplementation(() => Promise.resolve(response));

    const { stdin, lastFrame } = renderApp({
      requests: [createRequest({ name: 'stream-req', url: 'https://a.co/stream' })],
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, ENTER);
    await delay(CHUNK_COALESCE_WINDOW_MS + 100);

    const streamingFrame = lastFrame() ?? '';
    expect(streamingFrame).toContain('HTTP/1.1 200 OK');
    expect(streamingFrame).toContain('STREAMING 18 B');
    expect(streamingFrame).toContain('{"message":"hello ');
    expect(streamingFrame).not.toContain('streaming world');
    expect(streamingFrame).not.toContain('"message": "hello ');
    expect(streamingFrame).not.toMatch(/\d+ms/);

    staged.push('streaming world","n":42}');
    staged.end();
    await delay(CHUNK_COALESCE_WINDOW_MS + 100);

    const completedFrame = lastFrame() ?? '';
    expect(completedFrame).toContain('"message": "hello streaming world"');
    expect(completedFrame).not.toContain('"message":"hello ');
    expect(completedFrame).not.toContain('STREAMING');
    expect(completedFrame).toMatch(/\d+ms/);
  });
});
