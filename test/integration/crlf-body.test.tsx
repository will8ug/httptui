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

import { delay, KEY_DELAY_MS, press, renderApp } from '../helpers/integration';
import type { ParsedRequest } from '../../src/core/types';

function makeRequest(): ParsedRequest[] {
  return [
    {
      name: 'r1',
      method: 'GET',
      url: 'https://example.com/',
      headers: {},
      body: undefined,
      lineNumber: 1,
    },
  ];
}

function stubResponse(): void {
  requestMock.mockResolvedValue({
    statusCode: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
    },
    body: {
      text: async () =>
        '<html>\r\n<head>\r\n  <title>Test</title>\r\n</head>\r\n<body>\r\n  <h1>Hello</h1>\r\n</body>\r\n</html>',
    },
  });
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  requestMock.mockReset();
});

describe('CRLF HTML body rendering', () => {
  it('normalizes CRLF body lines without leaking carriage returns', async () => {
    stubResponse();

    const { stdin, lastFrame } = renderApp({ requests: makeRequest() });
    await delay(KEY_DELAY_MS);

    await press(stdin, '\r');
    await delay(KEY_DELAY_MS * 4);

    const frame = lastFrame() ?? '';
    const lines = frame.split('\n');

    expect(frame).not.toMatch(/\r/);
    expect(frame).toContain('<html>');
    expect(frame).toContain('<h1>Hello</h1>');
    expect(lines.findIndex((line) => line.includes('<html>'))).toBeGreaterThanOrEqual(0);
    expect(lines.findIndex((line) => line.includes('<head>'))).toBeGreaterThanOrEqual(0);
    expect(lines.findIndex((line) => line.includes('<html>'))).not.toBe(lines.findIndex((line) => line.includes('<head>')));
  });
});
