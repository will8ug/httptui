import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup } from 'ink-testing-library';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { parseAnyFormat } from '../../src/core/format-detector';
import { parseHttpFile } from '../../src/core/parser';
import type { ParseResult } from '../../src/core/types';
import {
  CTRL_G,
  CTRL_S,
  ENTER,
  ESC,
  KEY_DELAY_MS,
  SHIFT_TAB,
  delay,
  press,
  renderApp,
  selectedLine,
} from '../helpers/integration';

const REFUSAL_MESSAGE = 'External editor is only available for .http files';

const INITIAL_HTTP = [
  '@userId = 1',
  '',
  '### Get user',
  'GET https://example.com/users/{{userId}}',
  '',
  '### Create user',
  'POST https://example.com/users',
  '',
].join('\n');

const MODIFIED_HTTP = [
  '@userId = 99',
  '',
  '### Get user',
  'GET https://example.com/users/{{userId}}',
  '',
  '### Create user',
  'POST https://example.com/users/updated',
  '',
  '### List posts',
  'GET https://example.com/posts',
  '',
].join('\n');

const originalVisual = process.env.VISUAL;
const originalEditor = process.env.EDITOR;

let tempDir = '';

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'httptui-editor-handoff-'));
});

afterEach(() => {
  cleanup();
  restoreEditorEnv();
  rmSync(tempDir, { recursive: true, force: true });
  tempDir = '';
});

function restoreEditorEnv(): void {
  if (originalVisual === undefined) {
    delete process.env.VISUAL;
  } else {
    process.env.VISUAL = originalVisual;
  }

  if (originalEditor === undefined) {
    delete process.env.EDITOR;
  } else {
    process.env.EDITOR = originalEditor;
  }
}

function markerPath(): string {
  return join(tempDir, 'launched.marker');
}

function writeScript(name: string, body: string): string {
  const scriptPath = join(tempDir, name);
  writeFileSync(scriptPath, `#!/bin/sh\n${body}`, { mode: 0o755 });
  chmodSync(scriptPath, 0o755);
  return scriptPath;
}

function useFakeEditor(body: string, exitCode = 0): string {
  const marker = markerPath();
  const scriptPath = writeScript(
    'fake-editor.sh',
    `${body}\nprintf '1' > '${marker}'\nexit ${String(exitCode)}\n`,
  );
  process.env.VISUAL = scriptPath;
  delete process.env.EDITOR;
  return marker;
}

function mutateTo(content: string): string {
  return `sleep 0.05\ncat > "$1" <<'HTTPTUI_EOF'\n${content}\nHTTPTUI_EOF`;
}

function writeSource(name: string, content: string): string {
  const filePath = join(tempDir, name);
  writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function renderParsed(filePath: string, parsed: ParseResult) {
  return renderApp({
    filePath,
    requests: parsed.requests,
    variables: parsed.variables,
    fileVariables: parsed.variables,
  });
}

function renderHttp(content: string = INITIAL_HTTP) {
  const filePath = writeSource('api.http', content);
  return { filePath, ...renderParsed(filePath, parseHttpFile(content)) };
}

async function commitDirtyEdit(stdin: { write: (data: string) => void }): Promise<void> {
  await press(stdin, 'e');
  await press(stdin, SHIFT_TAB);
  await press(stdin, SHIFT_TAB);
  await press(stdin, 'X');
  await press(stdin, CTRL_S);
}

async function waitForMarker(marker: string, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!existsSync(marker) && Date.now() < deadline) {
    await delay(50);
  }
  expect(existsSync(marker)).toBe(true);
  await delay(80);
}

async function waitForFrameContaining(
  lastFrame: () => string | undefined,
  text: string,
  timeoutMs = 2000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let frame = lastFrame() ?? '';
  while (!frame.includes(text) && Date.now() < deadline) {
    await delay(50);
    frame = lastFrame() ?? '';
  }
  return frame;
}

async function expectEditorNotLaunched(marker: string): Promise<void> {
  await delay(300);
  expect(existsSync(marker)).toBe(false);
}

function listen(server: Server): Promise<number> {
  return new Promise((resolveListen, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      resolveListen(address.port);
    });
    server.once('error', reject);
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolveClose) => {
    server.close(() => {
      resolveClose();
    });
  });
}

describe('editor-handoff integration', () => {
  describe('format gate', () => {
    it('refuses a Postman source with a transient message and does not launch', async () => {
      const marker = useFakeEditor('exit 0');
      const content = readFileSync(resolve(__dirname, '../fixtures/postman-basic.json'), 'utf8');
      const filePath = writeSource('collection.json', content);
      const { stdin, lastFrame } = renderParsed(filePath, parseAnyFormat(filePath, content));
      await delay(KEY_DELAY_MS);

      await press(stdin, CTRL_G);

      const frame = await waitForFrameContaining(lastFrame, REFUSAL_MESSAGE);
      expect(frame).toContain(REFUSAL_MESSAGE);
      expect(frame).not.toContain('Unsaved Changes');
      await expectEditorNotLaunched(marker);
    });

    it('refuses an OpenAPI source with a transient message and does not launch', async () => {
      const marker = useFakeEditor('exit 0');
      const content = readFileSync(resolve(__dirname, '../fixtures/openapi-basic.yaml'), 'utf8');
      const filePath = writeSource('openapi.yaml', content);
      const { stdin, lastFrame } = renderParsed(filePath, parseAnyFormat(filePath, content));
      await delay(KEY_DELAY_MS);

      await press(stdin, CTRL_G);

      const frame = await waitForFrameContaining(lastFrame, REFUSAL_MESSAGE);
      expect(frame).toContain(REFUSAL_MESSAGE);
      expect(frame).not.toContain('Unsaved Changes');
      await expectEditorNotLaunched(marker);
    });

    it('launches the editor for an http source', async () => {
      const marker = useFakeEditor('');
      const { stdin, lastFrame } = renderHttp();
      await delay(KEY_DELAY_MS);

      await press(stdin, CTRL_G);
      await waitForMarker(marker);

      const frame = lastFrame() ?? '';
      expect(frame).not.toContain(REFUSAL_MESSAGE);
      expect(frame).not.toContain('Unsaved Changes');
      expect(existsSync(marker)).toBe(true);
    });
  });

  describe('unmodified file', () => {
    it('is a silent no-op when the editor touches nothing', async () => {
      const marker = useFakeEditor('');
      const { stdin, lastFrame } = renderHttp();
      await delay(KEY_DELAY_MS);

      const before = lastFrame() ?? '';
      expect(selectedLine(before)).toContain('/users/1');

      await press(stdin, CTRL_G);
      await waitForMarker(marker);
      await delay(200);

      const frame = lastFrame() ?? '';
      expect(frame).not.toContain('Reloaded');
      expect(frame).not.toContain(REFUSAL_MESSAGE);
      expect(frame).not.toContain('No requests found');
      expect(frame).toContain('/users/1');
      expect(frame).toContain('/users');
      expect(selectedLine(frame)).toContain('/users/1');
    });

    it('keeps the dirty marker after a confirmed handoff that changed nothing', async () => {
      const marker = useFakeEditor('');
      const { stdin, lastFrame } = renderHttp();
      await delay(KEY_DELAY_MS);

      await commitDirtyEdit(stdin);
      expect(lastFrame() ?? '').toContain('*api.http');

      await press(stdin, CTRL_G);
      expect(lastFrame() ?? '').toContain('Unsaved Changes');
      expect(existsSync(marker)).toBe(false);

      await press(stdin, 'y');
      await waitForMarker(marker);
      await delay(200);

      expect(lastFrame() ?? '').not.toContain('Reloaded');
      expect(lastFrame() ?? '').toContain('*api.http');

      await press(stdin, 'j');
      expect(selectedLine(lastFrame() ?? '')).toContain('/users');
      await press(stdin, 'k');
      expect(selectedLine(lastFrame() ?? '')).toContain('/users/1');
      expect(lastFrame() ?? '').toContain('*api.http');
    });
  });

  describe('modified file', () => {
    it('reloads added requests, updated file variables, and preserves selection by name', async () => {
      const marker = useFakeEditor(mutateTo(MODIFIED_HTTP));
      const { stdin, lastFrame } = renderHttp();
      await delay(KEY_DELAY_MS);

      expect(selectedLine(lastFrame() ?? '')).toContain('/users/1');

      await press(stdin, CTRL_G);
      await waitForMarker(marker);

      const frame = await waitForFrameContaining(lastFrame, 'Reloaded');
      expect(frame).toContain('Reloaded');
      expect(frame).toContain('/posts');
      expect(frame).toContain('/users/99');
      expect(frame).toContain('/users/updated');
      expect(frame).not.toContain('/users/1');
      expect(selectedLine(frame)).toContain('/users/99');
    });
  });

  describe('exit-status independence', () => {
    it('loads changes when the editor saves and exits non-zero', async () => {
      const marker = useFakeEditor(mutateTo(MODIFIED_HTTP), 1);
      const { stdin, lastFrame } = renderHttp();
      await delay(KEY_DELAY_MS);

      await press(stdin, CTRL_G);
      await waitForMarker(marker);

      const frame = await waitForFrameContaining(lastFrame, '/posts');
      expect(frame).toContain('/posts');
      expect(frame).toContain('/users/99');
      expect(frame).toContain('Reloaded');
    });

    it('changes nothing when the editor exits zero without saving', async () => {
      const marker = useFakeEditor('', 0);
      const { stdin, lastFrame } = renderHttp();
      await delay(KEY_DELAY_MS);

      await press(stdin, CTRL_G);
      await waitForMarker(marker);
      await delay(200);

      const frame = lastFrame() ?? '';
      expect(frame).not.toContain('Reloaded');
      expect(frame).not.toContain('/posts');
      expect(frame).toContain('/users/1');
      expect(selectedLine(frame)).toContain('/users/1');
    });
  });

  describe('unparseable file', () => {
    it('preserves requests, the current response, and dirty markers and shows a transient error', async () => {
      const server = createServer((_request, response) => {
        response.writeHead(200, { 'content-type': 'text/plain' });
        response.end('HANDOFF-RESPONSE-MARKER');
      });
      const port = await listen(server);

      try {
        const marker = useFakeEditor('sleep 0.05\nrm -f "$1"\nmkdir "$1"');
        const content = [
          '### Get user',
          `GET http://127.0.0.1:${String(port)}/users`,
          '',
          '### Create user',
          `POST http://127.0.0.1:${String(port)}/users`,
          '',
        ].join('\n');
        const { stdin, lastFrame } = renderHttp(content);
        await delay(KEY_DELAY_MS);

        await press(stdin, ENTER);
        const withResponse = await waitForFrameContaining(lastFrame, 'HANDOFF-RESPONSE-MARKER');
        expect(withResponse).toContain('HANDOFF-RESPONSE-MARKER');

        await commitDirtyEdit(stdin);
        expect(lastFrame() ?? '').toContain('*api.http');

        await press(stdin, CTRL_G);
        expect(lastFrame() ?? '').toContain('Unsaved Changes');

        await press(stdin, 'y');
        await waitForMarker(marker);

        const frame = await waitForFrameContaining(lastFrame, 'EISDIR');
        expect(frame).toMatch(/EISDIR|illegal operation on a directory/);
        expect(frame).toContain('/users');
        expect(frame).toContain('HANDOFF-RESPONSE-MARKER');
        expect(frame).toContain('*api.http');
        expect(frame).not.toContain('Reloaded');
        expect(frame).not.toContain('No requests found');
      } finally {
        await closeServer(server);
      }
    });
  });

  describe('zero requests', () => {
    it('keeps the previous requests and selection and shows no-requests-found', async () => {
      const marker = useFakeEditor(mutateTo('# emptied\n'));
      const { stdin, lastFrame } = renderHttp();
      await delay(KEY_DELAY_MS);

      expect(selectedLine(lastFrame() ?? '')).toContain('/users/1');

      await press(stdin, CTRL_G);
      await waitForMarker(marker);

      const frame = await waitForFrameContaining(lastFrame, 'No requests found in api.http');
      expect(frame).toContain('No requests found in api.http');
      expect(frame).toContain('/users/1');
      expect(frame).toContain('/users');
      expect(frame).not.toContain('Reloaded');
      expect(selectedLine(frame)).toContain('/users/1');
    });
  });

  describe('discard-confirm integration', () => {
    it('opens the prompt and launches nothing when a request is dirty', async () => {
      const marker = useFakeEditor('');
      const { stdin, lastFrame } = renderHttp();
      await delay(KEY_DELAY_MS);

      await commitDirtyEdit(stdin);
      await press(stdin, CTRL_G);

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Unsaved Changes');
      expect(frame).toContain('opening external editor');
      expect(existsSync(marker)).toBe(false);
      await expectEditorNotLaunched(marker);
    });

    it('proceeds with the handoff when y is pressed', async () => {
      const marker = useFakeEditor(mutateTo(MODIFIED_HTTP));
      const { stdin, lastFrame } = renderHttp();
      await delay(KEY_DELAY_MS);

      await commitDirtyEdit(stdin);
      await press(stdin, CTRL_G);
      expect(lastFrame() ?? '').toContain('Unsaved Changes');
      expect(existsSync(marker)).toBe(false);

      await press(stdin, 'y');
      await waitForMarker(marker);

      const frame = await waitForFrameContaining(lastFrame, 'Reloaded');
      expect(frame).not.toContain('Unsaved Changes');
      expect(frame).toContain('/posts');
      expect(frame).toContain('Reloaded');
    });

    it('abandons with n and leaves the dirty marker set', async () => {
      const marker = useFakeEditor('');
      const { stdin, lastFrame } = renderHttp();
      await delay(KEY_DELAY_MS);

      await commitDirtyEdit(stdin);
      await press(stdin, CTRL_G);
      expect(lastFrame() ?? '').toContain('Unsaved Changes');

      await press(stdin, 'n');

      const frame = lastFrame() ?? '';
      expect(frame).not.toContain('Unsaved Changes');
      expect(frame).toContain('*api.http');
      expect(frame).not.toContain('Reloaded');
      await expectEditorNotLaunched(marker);
    });

    it('abandons with Escape and leaves the dirty marker set', async () => {
      const marker = useFakeEditor('');
      const { stdin, lastFrame } = renderHttp();
      await delay(KEY_DELAY_MS);

      await commitDirtyEdit(stdin);
      await press(stdin, CTRL_G);
      expect(lastFrame() ?? '').toContain('Unsaved Changes');

      await press(stdin, ESC);

      const frame = lastFrame() ?? '';
      expect(frame).not.toContain('Unsaved Changes');
      expect(frame).toContain('*api.http');
      expect(frame).not.toContain('Reloaded');
      await expectEditorNotLaunched(marker);
    });

    it('never reaches the prompt for a format-refused source that is dirty', async () => {
      const marker = useFakeEditor('');
      const content = readFileSync(resolve(__dirname, '../fixtures/postman-basic.json'), 'utf8');
      const filePath = writeSource('collection.json', content);
      const { stdin, lastFrame } = renderParsed(filePath, parseAnyFormat(filePath, content));
      await delay(KEY_DELAY_MS);

      await commitDirtyEdit(stdin);
      expect(lastFrame() ?? '').toContain('*collection.json');

      await press(stdin, CTRL_G);

      const frame = await waitForFrameContaining(lastFrame, REFUSAL_MESSAGE);
      expect(frame).toContain(REFUSAL_MESSAGE);
      expect(frame).not.toContain('Unsaved Changes');
      expect(frame).toContain('*collection.json');
      await expectEditorNotLaunched(marker);
    });
  });

  describe('mode isolation', () => {
    it('is inert in the request editor', async () => {
      const marker = useFakeEditor('');
      const { stdin, lastFrame } = renderHttp();
      await delay(KEY_DELAY_MS);

      await press(stdin, 'e');
      expect(lastFrame() ?? '').toContain('Edit Request');

      await press(stdin, CTRL_G);

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Edit Request');
      expect(frame).not.toContain(REFUSAL_MESSAGE);
      expect(frame).not.toContain('Unsaved Changes');
      await expectEditorNotLaunched(marker);
    });

    it('is inert in the file-load overlay', async () => {
      const marker = useFakeEditor('');
      const { stdin, lastFrame } = renderHttp();
      await delay(KEY_DELAY_MS);

      await press(stdin, 'o');
      expect(lastFrame() ?? '').toContain('Open File');

      await press(stdin, CTRL_G);

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Open File');
      expect(frame).not.toContain(REFUSAL_MESSAGE);
      expect(frame).not.toContain('Unsaved Changes');
      await expectEditorNotLaunched(marker);
    });
  });
});
