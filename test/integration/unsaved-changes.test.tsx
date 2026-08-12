import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from 'ink-testing-library';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseHttpFile } from '../../src/core/parser';
import {
  CTRL_S,
  ENTER,
  ESC,
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

describe('unsaved changes integration', () => {
  it('the * marker is absent initially, appears after a committed edit, and clears after save', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-unsaved-marker-'));
    try {
      const requests = makeBodyRequest('original-body');
      const filePath = join(tmpDir, 'collection.json');
      const { stdin, lastFrame } = renderApp({ filePath, requests });
      await delay(KEY_DELAY_MS);

      expect(lastFrame() ?? '').toContain('collection.json');
      expect(lastFrame() ?? '').not.toContain('*collection.json');

      await commitDirtyEdit(stdin);
      expect(lastFrame() ?? '').toContain('*collection.json');

      await press(stdin, 'S');
      await press(stdin, ENTER);
      expect(lastFrame() ?? '').not.toContain('*collection.json');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('R while dirty shows the Unsaved Changes prompt instead of reloading', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeBodyRequest() });
    await delay(KEY_DELAY_MS);
    await commitDirtyEdit(stdin);
    expect(lastFrame() ?? '').toContain('*test.http');

    await press(stdin, 'R');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Unsaved Changes');
    expect(frame).toContain('reloading the file');
    expect(frame).not.toContain('Reloaded');
  });

  it('a failed reload after confirming leaves the * marker', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-reload-fail-'));
    try {
      const filePath = join(tmpDir, 'gone.http');
      const { stdin, lastFrame } = renderApp({ filePath, requests: makeBodyRequest() });
      await delay(KEY_DELAY_MS);
      await commitDirtyEdit(stdin);
      expect(lastFrame() ?? '').toContain('*gone.http');

      await press(stdin, 'R');
      expect(lastFrame() ?? '').toContain('Unsaved Changes');

      await press(stdin, 'y');
      const frame = lastFrame() ?? '';
      expect(frame).toContain('*gone.http');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('o while dirty shows the prompt instead of the Open File overlay', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeBodyRequest() });
    await delay(KEY_DELAY_MS);
    await commitDirtyEdit(stdin);

    await press(stdin, 'o');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Unsaved Changes');
    expect(frame).toContain('opening a different file');
    expect(frame).not.toContain('Open File');
  });

  it('q while dirty shows the prompt instead of exiting', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeBodyRequest() });
    await delay(KEY_DELAY_MS);
    await commitDirtyEdit(stdin);

    await press(stdin, 'q');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Unsaved Changes');
    expect(frame).toContain('quitting');
  });

  it('y at the confirm prompt proceeds with the open-file action', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeBodyRequest() });
    await delay(KEY_DELAY_MS);
    await commitDirtyEdit(stdin);

    await press(stdin, 'o');
    expect(lastFrame() ?? '').toContain('Unsaved Changes');
    expect(lastFrame() ?? '').not.toContain('Open File');

    await press(stdin, 'y');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Open File');
    expect(frame).not.toContain('Unsaved Changes');
    expect(frame).toContain('*test.http');
  });

  it('Escape in the file-load overlay after confirming preserves the * marker', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeBodyRequest() });
    await delay(KEY_DELAY_MS);
    await commitDirtyEdit(stdin);

    await press(stdin, 'o');
    expect(lastFrame() ?? '').toContain('Unsaved Changes');

    await press(stdin, 'y');
    expect(lastFrame() ?? '').toContain('Open File');
    expect(lastFrame() ?? '').toContain('*test.http');

    await press(stdin, ESC);
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Open File');
    expect(frame).toContain('*test.http');
  });

  it('n at the confirm prompt abandons and leaves the * marker', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeBodyRequest() });
    await delay(KEY_DELAY_MS);
    await commitDirtyEdit(stdin);

    await press(stdin, 'o');
    expect(lastFrame() ?? '').toContain('Unsaved Changes');

    await press(stdin, 'n');
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Unsaved Changes');
    expect(frame).not.toContain('Open File');
    expect(frame).toContain('*test.http');
  });

  it('Escape at the confirm prompt abandons and leaves the * marker', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeBodyRequest() });
    await delay(KEY_DELAY_MS);
    await commitDirtyEdit(stdin);

    await press(stdin, 'o');
    expect(lastFrame() ?? '').toContain('Unsaved Changes');

    await press(stdin, ESC);
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Unsaved Changes');
    expect(frame).not.toContain('Open File');
    expect(frame).toContain('*test.http');
  });

  it('o when not dirty opens the file-load overlay with no prompt', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeBodyRequest() });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Open File');
    expect(frame).not.toContain('Unsaved Changes');
  });

  it('R when not dirty reloads without showing a prompt', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-notdirty-reload-'));
    try {
      const filePath = join(tmpDir, 'reload.http');
      const content = '### r\nGET https://example.com/\n';
      writeFileSync(filePath, content, 'utf8');
      const parsed = parseHttpFile(content);

      const { stdin, lastFrame } = renderApp({
        filePath,
        requests: parsed.requests,
        variables: parsed.variables,
      });
      await delay(KEY_DELAY_MS);

      await press(stdin, 'R');
      await delay(100);

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Reloaded');
      expect(frame).not.toContain('Unsaved Changes');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
