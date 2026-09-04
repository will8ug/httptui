import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from 'ink-testing-library';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

import { BACKSPACE, delay, ENTER, ESC, KEY_DELAY_MS, press, renderApp } from '../helpers/integration';
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
  it('s with a JSON response opens the overlay with the pre-filled .json default and writes no file', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-save-resp-test-'));
    try {
      const filePath = join(tmpDir, 'api.http');
      const { stdin, lastFrame } = renderApp({
        filePath,
        requests: [createRequest({ name: 'Get Users', url: 'https://a.co/users' })],
      });
      await delay(KEY_DELAY_MS);

      await sendAndReceive(stdin, '{"items":[]}');
      expect(lastFrame() ?? '').toContain('items');

      await press(stdin, 's');

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Save response');
      expect(frame).toContain('Get Users.json');
      expect(existsSync(join(tmpDir, 'Get Users.json'))).toBe(false);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('s with a non-JSON response opens the overlay with the pre-filled .txt default', async () => {
    const { stdin, lastFrame } = renderApp({
      filePath: '/path/to/api.http',
      requests: [createRequest({ name: 'Get Page', url: 'https://a.co/page' })],
    });
    await delay(KEY_DELAY_MS);

    await sendAndReceive(stdin, '<html></html>');
    expect(lastFrame() ?? '').toContain('<html>');

    await press(stdin, 's');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Save response');
    expect(frame).toContain('Get Page.txt');
  });

  it('s with no response shows a transient message and does not open the overlay', async () => {
    const { stdin, lastFrame } = renderApp({
      filePath: '/path/to/api.http',
      requests: [createRequest({ name: 'Get Users', url: 'https://a.co/users' })],
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 's');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('No response to save');
    expect(frame).not.toContain('Save response');
  });

  it('Enter writes the raw body verbatim next to the loaded file', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-save-resp-test-'));
    try {
      const filePath = join(tmpDir, 'api.http');
      const { stdin, lastFrame } = renderApp({
        filePath,
        requests: [createRequest({ name: 'Get Users', url: 'https://a.co/users' })],
      });
      await delay(KEY_DELAY_MS);

      await sendAndReceive(stdin, '{"a":1,"b":2}');
      await press(stdin, 's');
      await press(stdin, ENTER);

      const target = join(tmpDir, 'Get Users.json');
      expect(existsSync(target)).toBe(true);
      expect(readFileSync(target, 'utf8')).toBe('{"a":1,"b":2}');

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Saved response to Get Users.json');
      expect(frame).not.toContain('Save response');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('saving after navigating derives the name from the selection and the content from the displayed response', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-save-resp-test-'));
    try {
      const filePath = join(tmpDir, 'api.http');
      const { stdin, lastFrame } = renderApp({
        filePath,
        requests: [
          createRequest({ name: 'Login', url: 'https://a.co/login' }),
          createRequest({ name: 'Get Users', url: 'https://a.co/users' }),
        ],
      });
      await delay(KEY_DELAY_MS);

      await sendAndReceive(stdin, '{"token":"abc"}');
      await press(stdin, 'j');
      await press(stdin, 's');

      expect(lastFrame() ?? '').toContain('Get Users.json');

      await press(stdin, ENTER);

      expect(readFileSync(join(tmpDir, 'Get Users.json'), 'utf8')).toBe('{"token":"abc"}');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

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

      const defaultPath = 'Get Users.json';
      for (let i = 0; i < defaultPath.length; i++) {
        await press(stdin, BACKSPACE);
      }
      for (const char of target) {
        await press(stdin, char);
      }
      await press(stdin, ENTER);

      expect(existsSync(target)).toBe(true);
      expect(readFileSync(target, 'utf8')).toBe('{"a":1}');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  }, 15000);

  it('an existing target is refused, the error clears on edit, and a fresh name succeeds', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-save-resp-test-'));
    try {
      const filePath = join(tmpDir, 'api.http');
      const existingPath = join(tmpDir, 'Get Users.json');
      writeFileSync(existingPath, 'existing content', 'utf8');

      const { stdin, lastFrame } = renderApp({
        filePath,
        requests: [createRequest({ name: 'Get Users', url: 'https://a.co/users' })],
      });
      await delay(KEY_DELAY_MS);

      await sendAndReceive(stdin, '{"a":1}');
      await press(stdin, 's');
      await press(stdin, ENTER);

      const refusedFrame = lastFrame() ?? '';
      expect(refusedFrame).toContain('File exists: Get Users.json');
      expect(refusedFrame).toContain('Save response');
      expect(readFileSync(existingPath, 'utf8')).toBe('existing content');

      const defaultPath = 'Get Users.json';
      for (let i = 0; i < defaultPath.length; i++) {
        await press(stdin, BACKSPACE);
        if (i === 0) {
          expect(lastFrame() ?? '').not.toContain('File exists');
        }
      }

      for (const char of 'Users 2.json') {
        await press(stdin, char);
      }
      await press(stdin, ENTER);

      const freshPath = join(tmpDir, 'Users 2.json');
      expect(existsSync(freshPath)).toBe(true);
      expect(readFileSync(freshPath, 'utf8')).toBe('{"a":1}');
      expect(lastFrame() ?? '').toContain('Saved response to Users 2.json');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('a successful save keeps the status bar on the loaded file and preserves the dirty marker', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-save-resp-test-'));
    try {
      const filePath = join(tmpDir, 'api.http');
      const { stdin, lastFrame } = renderApp({
        filePath,
        requests: [createRequest({ name: 'Get Users', url: 'https://a.co/users', isDirty: true })],
      });
      await delay(KEY_DELAY_MS);

      expect(lastFrame() ?? '').toContain('*api.http');

      await sendAndReceive(stdin, '{"a":1}');
      await press(stdin, 's');
      await press(stdin, ENTER);

      expect(existsSync(join(tmpDir, 'Get Users.json'))).toBe(true);

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Saved response to Get Users.json');
      expect(frame).toContain('*api.http');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('Escape cancels without writing', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-save-resp-test-'));
    try {
      const filePath = join(tmpDir, 'api.http');
      const { stdin, lastFrame } = renderApp({
        filePath,
        requests: [createRequest({ name: 'Get Users', url: 'https://a.co/users' })],
      });
      await delay(KEY_DELAY_MS);

      await sendAndReceive(stdin, '{"a":1}');
      await press(stdin, 's');
      expect(lastFrame() ?? '').toContain('Save response');

      await press(stdin, ESC);

      expect(lastFrame() ?? '').not.toContain('Save response');
      expect(existsSync(join(tmpDir, 'Get Users.json'))).toBe(false);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('s while the save-as overlay is open types into that overlay instead', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-save-resp-test-'));
    try {
      const filePath = join(tmpDir, 'api.http');
      const { stdin, lastFrame } = renderApp({
        filePath,
        requests: [createRequest({ name: 'Get Users', url: 'https://a.co/users' })],
      });
      await delay(KEY_DELAY_MS);

      await sendAndReceive(stdin, '{"a":1}');
      await press(stdin, 'S');
      expect(lastFrame() ?? '').toContain('Save as .http');

      await press(stdin, 's');

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Save as .http');
      expect(frame).toContain('api.https');
      expect(frame).not.toContain('Save response');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('s while the response-save overlay is open inserts the character into the path', async () => {
    const { stdin, lastFrame } = renderApp({
      filePath: '/path/to/api.http',
      requests: [createRequest({ name: 'Get Users', url: 'https://a.co/users' })],
    });
    await delay(KEY_DELAY_MS);

    await sendAndReceive(stdin, '{"a":1}');
    await press(stdin, 's');
    expect(lastFrame() ?? '').toContain('Get Users.json');

    await press(stdin, 's');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Save response');
    expect(frame).toContain('Get Users.jsons');
  });
});
