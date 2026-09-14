import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from 'ink-testing-library';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { agentMock, requestMock } = vi.hoisted(() => ({
  agentMock: vi.fn().mockImplementation(() => ({})),
  requestMock: vi.fn(),
}));

vi.mock('undici', () => ({
  Agent: agentMock,
  request: requestMock,
}));

import { BACKSPACE, delay, ENTER, KEY_DELAY_MS, press, renderApp } from '../helpers/integration';
import { createRequest } from '../helpers/requests';

interface MockUndiciResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: { text: () => Promise<string> };
}

let responseBody = '';

function makeResponse(body: string): MockUndiciResponse {
  return {
    statusCode: 200,
    headers: {},
    body: { text: async () => body },
  };
}

async function sendAndReceive(stdin: { write: (data: string) => void }, body: string): Promise<void> {
  responseBody = body;
  await press(stdin, ENTER);
  await delay(KEY_DELAY_MS * 2);
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  responseBody = '';
  requestMock.mockReset();
  requestMock.mockImplementation(async () => makeResponse(responseBody));
});

describe('save-response integration', () => {
  it('Enter with an absolute path writes there directly', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-save-resp-test-'));
    try {
      const filePath = join(tmpDir, 'api.http');
      const target = join(tmpDir, 'out.json');
      const { stdin } = renderApp({
        filePath,
        requests: [createRequest({ name: 'Get Users', url: 'https://a.co/users' })],
      });
      await delay(KEY_DELAY_MS);

      await sendAndReceive(stdin, '{"a":1}');
      await press(stdin, 's');

      for (let i = 0; i < 'Get Users.json'.length; i++) {
        stdin.write(BACKSPACE);
        await delay(0);
      }
      await delay(KEY_DELAY_MS * 2);
      stdin.write(target);
      await delay(KEY_DELAY_MS * 2);
      await press(stdin, ENTER);

      expect(existsSync(target)).toBe(true);
      expect(readFileSync(target, 'utf8')).toBe('{"a":1}');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
