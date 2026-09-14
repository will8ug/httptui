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

import {
  ENTER,
  ESC,
  KEY_DELAY_MS,
  TAB,
  delay,
  makeShortUrlRequests,
  press,
  renderApp,
} from '../helpers/integration';

const THREE_MATCH_BODY = [
  'first needle line',
  'filler one',
  'second needle line',
  'filler two',
  'third needle line',
].join('\n');

type Stdin = { write: (data: string) => void };

function stubResponse(body: string): void {
  requestMock.mockResolvedValue({
    statusCode: 200,
    headers: {},
    body: {
      text: async () => body,
    },
  });
}

async function loadResponse(stdin: Stdin, body: string): Promise<void> {
  stubResponse(body);
  await press(stdin, ENTER);
  await delay(KEY_DELAY_MS * 4);
}

async function searchFor(stdin: Stdin, query: string): Promise<void> {
  await press(stdin, '/');
  for (const ch of query) {
    await press(stdin, ch);
  }
  await press(stdin, ENTER);
}

function expectRequestsMaximized(frame: string): void {
  expect(frame).toContain('Requests');
  expect(frame).not.toContain('Response');
  expect(frame).not.toContain('Request Details');
}

function expectResponseMaximized(frame: string): void {
  expect(frame).toContain('Response');
  expect(frame).not.toContain('Requests');
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  requestMock.mockReset();
});

describe('fullscreen Escape priority', () => {
  it('the first Escape clears active results staying fullscreen and the second exits', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);
    await loadResponse(stdin, THREE_MATCH_BODY);

    await searchFor(stdin, 'needle');
    await press(stdin, 'f');
    const fullscreenFrame = lastFrame() ?? '';
    expectResponseMaximized(fullscreenFrame);
    expect(fullscreenFrame).toContain('(Esc to dismiss)');
    expect(fullscreenFrame).toContain('[1/3]');

    await press(stdin, ESC);
    await delay(KEY_DELAY_MS);
    const clearedFrame = lastFrame() ?? '';
    expect(clearedFrame).not.toContain('(Esc to dismiss)');
    expect(clearedFrame).not.toContain('[1/3]');
    expectResponseMaximized(clearedFrame);

    await press(stdin, ESC);
    await delay(KEY_DELAY_MS);
    expect(lastFrame() ?? '').toContain('Requests');
  });

  it('Escape in a maximized request list exits fullscreen and keeps the search bar', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);
    await loadResponse(stdin, THREE_MATCH_BODY);

    await searchFor(stdin, 'needle');
    await press(stdin, TAB);
    await press(stdin, 'f');
    expectRequestsMaximized(lastFrame() ?? '');

    await press(stdin, ESC);
    await delay(KEY_DELAY_MS);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Requests');
    expect(frame).toContain('Response');
    expect(frame).toContain('(Esc to dismiss)');
    expect(frame).toContain('[1/3]');
  });
});
