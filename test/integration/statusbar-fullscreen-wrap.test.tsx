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

import { delay, KEY_DELAY_MS, press, renderApp, TAB } from '../helpers/integration';
import { getResponseTotalLines } from '../../src/utils/scroll';
import { getPanelContentWidth } from '../../src/utils/layout';
import type { FocusedPanel, ParsedRequest } from '../../src/core/types';

const COLUMNS = 100;
/** 79 cells: wraps into 2 visual lines at the split width (66) but fits on one line at the fullscreen width (96). */
const WRAPPING_BODY_LINE = 'word '.repeat(16).trim();
const BODY = Array.from({ length: 3 }, () => WRAPPING_BODY_LINE).join('\n');

/** Mirrors the ResponseData the executor stores for the stubbed undici response. */
const storedResponse = {
  statusCode: 200,
  statusText: 'OK',
  headers: {},
  body: BODY,
  timing: { durationMs: 0 },
};

function expectedTotalLines(maximizedPanel: FocusedPanel | null): number {
  return getResponseTotalLines({
    response: storedResponse,
    verbose: false,
    rawMode: false,
    wrapMode: 'wrap',
    contentWidth: getPanelContentWidth({ panel: 'response', maximizedPanel, columns: COLUMNS }),
  });
}

function makeRequest(): ParsedRequest[] {
  return [
    {
      name: 'r1',
      method: 'GET',
      url: 'https://a.co/u/1',
      headers: {},
      body: undefined,
      lineNumber: 1,
      isDirty: false,
    },
  ];
}

function stubResponse(body: string): void {
  requestMock.mockResolvedValue({
    statusCode: 200,
    headers: {},
    body: {
      text: async () => body,
    },
  });
}

function lineIndicatorTotal(frame: string): number {
  const match = /↕ (\d+)\/(\d+) lines/.exec(frame);
  expect(match, `no response line indicator found in frame:\n${frame}`).not.toBeNull();
  return Number(match?.[2]);
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  requestMock.mockReset();
});

describe('status bar response line total — fullscreen wrap mode', () => {
  it('shows the fullscreen visual-line total while maximized and the split total after exiting', async () => {
    stubResponse(BODY);

    const { stdin, lastFrame } = renderApp({ requests: makeRequest() });
    await delay(KEY_DELAY_MS);

    await press(stdin, '\r');
    await delay(KEY_DELAY_MS * 4);

    await press(stdin, 'w');
    await press(stdin, TAB);

    const splitFrame = lastFrame() ?? '';
    expect(splitFrame).toContain('Response');
    expect(lineIndicatorTotal(splitFrame)).toBe(expectedTotalLines(null));

    await press(stdin, 'f');

    const fullscreenFrame = lastFrame() ?? '';
    const fullscreenTotal = lineIndicatorTotal(fullscreenFrame);
    expect(fullscreenTotal).toBe(expectedTotalLines('response'));
    expect(fullscreenTotal).toBeLessThan(expectedTotalLines(null));

    await press(stdin, 'f');

    expect(lineIndicatorTotal(lastFrame() ?? '')).toBe(expectedTotalLines(null));
  });
});
