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
  CTRL_S,
  ENTER,
  KEY_DELAY_MS,
  SHIFT_TAB,
  delay,
  press,
  renderApp,
} from '../helpers/integration';
import type { ParsedRequest } from '../../src/core/types';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  requestMock.mockReset();
});

function stubResponse(body: string): void {
  requestMock.mockResolvedValue({
    statusCode: 200,
    headers: {},
    body: {
      text: async () => body,
    },
  });
}

function makeBodyRequest(body: string = 'original-body'): ParsedRequest[] {
  return [
    {
      name: 'create',
      method: 'POST' as const,
      url: 'https://example.com/users',
      headers: {},
      body,
      lineNumber: 1,
      isDirty: false,
    },
  ];
}

async function commitDirtyEdit(stdin: { write: (data: string) => void }): Promise<void> {
  await press(stdin, 'e');
  await press(stdin, SHIFT_TAB);
  await press(stdin, SHIFT_TAB);
  await press(stdin, 'X');
  await press(stdin, CTRL_S);
}

describe('q with unsaved changes and displayed search results', () => {
  it('q while search results are displayed dismisses them without the Unsaved Changes prompt', async () => {
    stubResponse(['here is the needle target', 'trailing'].join('\n'));

    const { stdin, lastFrame } = renderApp({ requests: makeBodyRequest() });
    await delay(KEY_DELAY_MS);
    await commitDirtyEdit(stdin);
    expect(lastFrame() ?? '').toContain('*test.http');

    await press(stdin, ENTER);
    await delay(KEY_DELAY_MS * 4);

    await press(stdin, '/');
    for (const ch of 'needle') {
      await press(stdin, ch);
    }
    await press(stdin, ENTER);
    expect(lastFrame() ?? '').toContain('(Esc to dismiss)');

    await press(stdin, 'q');

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Unsaved Changes');
    expect(frame).not.toContain('(Esc to dismiss)');
    expect(frame).toContain('*test.http');
    expect(frame).toContain('[Enter] Send');
  });

  it('the next q after the dismissal shows the quit confirmation prompt', async () => {
    stubResponse(['here is the needle target', 'trailing'].join('\n'));

    const { stdin, lastFrame } = renderApp({ requests: makeBodyRequest() });
    await delay(KEY_DELAY_MS);
    await commitDirtyEdit(stdin);

    await press(stdin, ENTER);
    await delay(KEY_DELAY_MS * 4);

    await press(stdin, '/');
    for (const ch of 'needle') {
      await press(stdin, ch);
    }
    await press(stdin, ENTER);

    await press(stdin, 'q');
    expect(lastFrame() ?? '').not.toContain('Unsaved Changes');

    await press(stdin, 'q');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Unsaved Changes');
    expect(frame).toContain('quitting');
  });
});
