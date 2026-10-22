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
import type { ParsedRequest } from '../../src/core/types';

/** 30 plain body lines render 30 + status + separator = 32 visual lines. */
const BODY = Array.from({ length: 30 }, (_, i) => `payload-line-${i + 1}`).join('\n');

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

/** The test double's stdout has no rows property until a resize defines one. */
function resizeStdoutRows(instance: ReturnType<typeof renderApp>, rows: number): void {
  Object.defineProperty(instance.stdout, 'rows', { value: rows, configurable: true });
  instance.stdout.emit('resize');
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  requestMock.mockReset();
});

describe('terminal resize re-clamps the response viewport', () => {
  it('clamps the response scroll offset when the terminal grows, without a keypress', async () => {
    stubResponse(BODY);

    const instance = renderApp({ requests: makeRequest() });
    const { stdin, lastFrame } = instance;
    await delay(KEY_DELAY_MS);

    await press(stdin, '\r');
    await delay(KEY_DELAY_MS * 4);

    await press(stdin, TAB);

    resizeStdoutRows(instance, 12);
    await delay(KEY_DELAY_MS);

    // At 12 rows the viewport shows 8 of the 32 visual lines, so the bottom is
    // offset 24 and the status bar reports line 25 of 32.
    await press(stdin, 'G');
    expect(lastFrame() ?? '').toContain('↕ 25/32 lines');

    resizeStdoutRows(instance, 24);
    await delay(KEY_DELAY_MS);

    // No keypress: the taller terminal shows 20 lines, so the offset clamps
    // from 24 down to the new max of 12 and the status bar reports line 13.
    expect(lastFrame() ?? '').toContain('↕ 13/32 lines');
  });
});
