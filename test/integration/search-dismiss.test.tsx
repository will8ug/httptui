import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from 'ink-testing-library';

const { agentMock, requestMock, exitMock } = vi.hoisted(() => ({
  agentMock: vi.fn().mockImplementation(() => ({})),
  requestMock: vi.fn(),
  exitMock: vi.fn(),
}));

vi.mock('undici', () => ({
  Agent: agentMock,
  request: requestMock,
}));

vi.mock('ink', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ink')>();
  const actualUseApp = actual.useApp;
  return {
    ...actual,
    useApp: () => ({ ...actualUseApp(), exit: exitMock }),
  };
});

import { ENTER, KEY_DELAY_MS, delay, press, renderApp, selectedLine } from '../helpers/integration';
import type { ParsedRequest } from '../../src/core/types';

const MATCH_LINE = 'here is the needle target';
const ABSENT_QUERY = 'zzz-absent';

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

function expectAppStillRendering(frame: string): void {
  expect(frame).toContain('[Enter] Send');
  expect(frame).toContain('test.http');
  expect(selectedLine(frame)).toContain('/u/1');
}

async function searchFor(stdin: { write: (data: string) => void }, query: string): Promise<void> {
  await press(stdin, '/');
  for (const ch of query) {
    await press(stdin, ch);
  }
  await press(stdin, ENTER);
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  requestMock.mockReset();
  exitMock.mockClear();
});

describe('q dismisses displayed search results', () => {
  it('q with active matches clears the search bar and markers without exiting', async () => {
    stubResponse(['filler line', MATCH_LINE, 'trailing'].join('\n'));

    const { stdin, lastFrame } = renderApp({ requests: makeRequest() });
    await delay(KEY_DELAY_MS);

    await press(stdin, ENTER);
    await delay(KEY_DELAY_MS * 4);

    await searchFor(stdin, 'needle');
    const withMatches = lastFrame() ?? '';
    expect(withMatches).toContain('(Esc to dismiss)');
    expect(withMatches).toContain('►');

    await press(stdin, 'q');

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('(Esc to dismiss)');
    expect(frame).not.toContain('►');
    expectAppStillRendering(frame);
    expect(exitMock).not.toHaveBeenCalled();
  });

  it('q dismisses the no-match search bar without exiting', async () => {
    stubResponse(MATCH_LINE);

    const { stdin, lastFrame } = renderApp({ requests: makeRequest() });
    await delay(KEY_DELAY_MS);

    await press(stdin, ENTER);
    await delay(KEY_DELAY_MS * 4);

    await searchFor(stdin, ABSENT_QUERY);
    expect(lastFrame() ?? '').toContain('[No matches]');

    await press(stdin, 'q');

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('[No matches]');
    expect(frame).not.toContain('(Esc to dismiss)');
    expectAppStillRendering(frame);
    expect(exitMock).not.toHaveBeenCalled();
  });

  it('a second q after the dismissal exits the application', async () => {
    stubResponse(MATCH_LINE);

    const { stdin, lastFrame } = renderApp({ requests: makeRequest() });
    await delay(KEY_DELAY_MS);

    await press(stdin, ENTER);
    await delay(KEY_DELAY_MS * 4);

    await searchFor(stdin, 'needle');
    await press(stdin, 'q');
    expect(lastFrame() ?? '').not.toContain('(Esc to dismiss)');
    expect(exitMock).not.toHaveBeenCalled();

    await press(stdin, 'q');

    expect(exitMock).toHaveBeenCalledTimes(1);
  });

  it('q with a maximized panel dismisses the results and leaves the panel maximized', async () => {
    stubResponse(MATCH_LINE);

    const { stdin, lastFrame } = renderApp({ requests: makeRequest() });
    await delay(KEY_DELAY_MS);

    await press(stdin, ENTER);
    await delay(KEY_DELAY_MS * 4);

    await searchFor(stdin, 'needle');
    await press(stdin, 'f');

    const fullscreenFrame = lastFrame() ?? '';
    expect(fullscreenFrame).toContain('Response');
    expect(fullscreenFrame).not.toContain('Requests');
    expect(fullscreenFrame).toContain('(Esc to dismiss)');

    await press(stdin, 'q');

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('(Esc to dismiss)');
    expect(frame).toContain('Response');
    expect(frame).not.toContain('Requests');
    expect(exitMock).not.toHaveBeenCalled();
  });
});
