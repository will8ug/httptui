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

const LONG_HEADER_VALUE = 'a'.repeat(120);
const LONG_BODY_LINE = 'xyz '.repeat(30).trim();
const MATCH_LINE = 'here is the needle target';
const MATCH_QUERY = 'needle';

function makeRequest(): ParsedRequest[] {
  return [
    {
      name: 'r1',
      method: 'GET',
      url: 'https://a.co/u/1',
      headers: {},
      body: undefined,
      lineNumber: 1,
    },
  ];
}

function stubResponse(body: string, headers: Record<string, string> = {}): void {
  requestMock.mockResolvedValue({
    statusCode: 200,
    headers,
    body: {
      text: async () => body,
    },
  });
}

function findMarkerLine(frame: string): string | undefined {
  return frame.split('\n').find((line) => line.includes('►'));
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  requestMock.mockReset();
});

describe('response search marker placement — wrap mode', () => {
  it('places ► on the line containing the search query when wrap + verbose + long header + long body line precede the match', async () => {
    const body = [LONG_BODY_LINE, MATCH_LINE, 'trailing'].join('\n');
    stubResponse(body, { 'x-trace-id': LONG_HEADER_VALUE });

    const { stdin, lastFrame } = renderApp({ requests: makeRequest() });
    await delay(KEY_DELAY_MS);

    await press(stdin, '\r');
    await delay(KEY_DELAY_MS * 4);

    await press(stdin, 'v');
    await press(stdin, 'w');

    await press(stdin, '/');
    for (const ch of MATCH_QUERY) {
      await press(stdin, ch);
    }
    await press(stdin, '\r');
    await delay(KEY_DELAY_MS);

    const frame = lastFrame() ?? '';
    const markerLine = findMarkerLine(frame);

    expect(markerLine).toBeDefined();
    expect(markerLine).toContain(MATCH_QUERY);
  });
});

describe('response search marker placement — nowrap mode (regression guard)', () => {
  it('places ► on the line containing the search query when wrap is disabled', async () => {
    const body = ['alpha', MATCH_LINE, 'beta'].join('\n');
    stubResponse(body);

    const { stdin, lastFrame } = renderApp({ requests: makeRequest() });
    await delay(KEY_DELAY_MS);

    await press(stdin, '\r');
    await delay(KEY_DELAY_MS * 4);

    await press(stdin, '/');
    for (const ch of MATCH_QUERY) {
      await press(stdin, ch);
    }
    await press(stdin, '\r');
    await delay(KEY_DELAY_MS);

    const frame = lastFrame() ?? '';
    const markerLine = findMarkerLine(frame);

    expect(markerLine).toBeDefined();
    expect(markerLine).toContain(MATCH_QUERY);
  });
});
