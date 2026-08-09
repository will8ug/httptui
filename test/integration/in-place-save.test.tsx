import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from 'ink-testing-library';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseHttpFile } from '../../src/core/parser';
import { parseAnyFormat } from '../../src/core/format-detector';
import {
  BACKSPACE,
  CTRL_S,
  ENTER,
  ESC,
  KEY_DELAY_MS,
  delay,
  press,
  renderApp,
} from '../helpers/integration';
import type { ParsedRequest } from '../../src/core/types';

afterEach(() => {
  cleanup();
});

const HTTP_FILE_CONTENT = [
  '@host = example.com',
  '',
  '### Get users',
  'GET https://{{host}}/users',
  '',
  '### Create user',
  'POST https://{{host}}/users',
  'Content-Type: application/json',
  '',
  '{"name":"John"}',
  '',
  '### Delete user',
  'DELETE https://{{host}}/users/1',
  '',
].join('\n');

const POSTMAN_CONTENT = JSON.stringify({
  info: {
    name: 'Test Collection',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  item: [
    {
      name: 'Get Users',
      request: {
        method: 'GET',
        url: 'https://api.example.com/users',
      },
    },
    {
      name: 'Create User',
      request: {
        method: 'POST',
        url: 'https://api.example.com/users',
        header: [{ key: 'Content-Type', value: 'application/json' }],
        body: { mode: 'raw', raw: '{"name":"Alice"}' },
      },
    },
  ],
}, null, 2);

interface SetupResult {
  tmpDir: string;
  filePath: string;
  requests: ParsedRequest[];
}

function setupHttpFile(): SetupResult {
  const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-inplace-'));
  const filePath = join(tmpDir, 'collection.http');
  writeFileSync(filePath, HTTP_FILE_CONTENT, 'utf8');
  const parsed = parseHttpFile(HTTP_FILE_CONTENT);
  return { tmpDir, filePath, requests: parsed.requests };
}

function setupPostmanFile(): SetupResult {
  const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-inplace-postman-'));
  const filePath = join(tmpDir, 'collection.json');
  writeFileSync(filePath, POSTMAN_CONTENT, 'utf8');
  const parsed = parseAnyFormat(filePath, POSTMAN_CONTENT);
  return { tmpDir, filePath, requests: parsed.requests };
}

async function gotoCreateUser(stdin: { write: (data: string) => void }): Promise<void> {
  await press(stdin, 'j');
}

async function commitDirtyEdit(stdin: { write: (data: string) => void }): Promise<void> {
  await press(stdin, 'e');
  await press(stdin, 'X');
  await press(stdin, CTRL_S);
}

describe('in-place save integration', () => {
  it('Ctrl+S after an edit shows the confirmation prompt and writes nothing yet', async () => {
    const { tmpDir, filePath, requests } = setupHttpFile();
    try {
      const { stdin, lastFrame } = renderApp({ filePath, requests });
      await delay(KEY_DELAY_MS);

      await gotoCreateUser(stdin);
      await commitDirtyEdit(stdin);
      expect(lastFrame() ?? '').toContain('*collection.http');

      await press(stdin, CTRL_S);

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Confirm overriding');
      expect(frame).toContain('collection.http');

      expect(readFileSync(filePath, 'utf8')).toBe(HTTP_FILE_CONTENT);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('y writes the edited body, preserves other blocks byte-identical, clears markers, keeps the original file name', async () => {
    const { tmpDir, filePath, requests } = setupHttpFile();
    try {
      const { stdin, lastFrame } = renderApp({ filePath, requests });
      await delay(KEY_DELAY_MS);

      await gotoCreateUser(stdin);
      await commitDirtyEdit(stdin);
      expect(lastFrame() ?? '').toContain('*collection.http');

      await press(stdin, CTRL_S);
      expect(lastFrame() ?? '').toContain('Confirm overriding');

      await press(stdin, 'y');

      const frame = lastFrame() ?? '';
      expect(frame).not.toContain('Confirm overriding');
      expect(frame).not.toContain('*collection.http');
      expect(frame).toContain('collection.http');
      expect(frame).toContain('Saved');

      const newContent = readFileSync(filePath, 'utf8');
      expect(newContent).toContain('{"name":"John"}X');

      const originalLines = HTTP_FILE_CONTENT.split('\n');
      const newLines = newContent.split('\n');

      const getUserStart = originalLines.findIndex(l => l.startsWith('### Get users'));
      const getUserEnd = originalLines.findIndex((l, i) => i > getUserStart && l.startsWith('### '));
      const getUserBlock = originalLines.slice(getUserStart, getUserEnd).join('\n');

      const deleteUserStart = newLines.findIndex(l => l.startsWith('### Delete user'));
      const deleteUserEnd = newLines.findIndex((l, i) => i > deleteUserStart && l === '');
      const deleteUserBlock = newLines.slice(deleteUserStart, deleteUserEnd >= 0 ? deleteUserEnd : undefined).join('\n');

      expect(newContent).toContain(getUserBlock);
      expect(newContent).toContain(deleteUserBlock);
      expect(newContent).toContain('@host = example.com');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('n cancels without writing and keeps the markers set', async () => {
    const { tmpDir, filePath, requests } = setupHttpFile();
    try {
      const { stdin, lastFrame } = renderApp({ filePath, requests });
      await delay(KEY_DELAY_MS);

      await gotoCreateUser(stdin);
      await commitDirtyEdit(stdin);
      expect(lastFrame() ?? '').toContain('*collection.http');

      await press(stdin, CTRL_S);
      expect(lastFrame() ?? '').toContain('Confirm overriding');

      await press(stdin, 'n');

      const frame = lastFrame() ?? '';
      expect(frame).not.toContain('Confirm overriding');
      expect(frame).toContain('*collection.http');

      expect(readFileSync(filePath, 'utf8')).toBe(HTTP_FILE_CONTENT);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('Escape cancels without writing and keeps the markers set', async () => {
    const { tmpDir, filePath, requests } = setupHttpFile();
    try {
      const { stdin, lastFrame } = renderApp({ filePath, requests });
      await delay(KEY_DELAY_MS);

      await gotoCreateUser(stdin);
      await commitDirtyEdit(stdin);
      expect(lastFrame() ?? '').toContain('*collection.http');

      await press(stdin, CTRL_S);
      expect(lastFrame() ?? '').toContain('Confirm overriding');

      await press(stdin, ESC);

      const frame = lastFrame() ?? '';
      expect(frame).not.toContain('Confirm overriding');
      expect(frame).toContain('*collection.http');

      expect(readFileSync(filePath, 'utf8')).toBe(HTTP_FILE_CONTENT);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('a Postman-loaded source shows the hint and no prompt', async () => {
    const { tmpDir, filePath, requests } = setupPostmanFile();
    try {
      const { stdin, lastFrame } = renderApp({ filePath, requests });
      await delay(KEY_DELAY_MS);

      await gotoCreateUser(stdin);
      await commitDirtyEdit(stdin);
      expect(lastFrame() ?? '').toContain('*collection.json');

      await press(stdin, CTRL_S);

      const frame = lastFrame() ?? '';
      expect(frame).toContain('In-place save is only available for .http files');
      expect(frame).toContain('press S to save as a new file');
      expect(frame).not.toContain('Confirm overriding');

      expect(readFileSync(filePath, 'utf8')).toBe(POSTMAN_CONTENT);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('a clean Ctrl+S with no edits shows no prompt, writes nothing, and displays No changes to save', async () => {
    const { tmpDir, filePath, requests } = setupHttpFile();
    try {
      const { stdin, lastFrame } = renderApp({ filePath, requests });
      await delay(KEY_DELAY_MS);

      expect(lastFrame() ?? '').not.toContain('*collection.http');

      await press(stdin, CTRL_S);

      const frame = lastFrame() ?? '';
      expect(frame).toContain('No changes to save');
      expect(frame).not.toContain('Confirm overriding');

      expect(readFileSync(filePath, 'utf8')).toBe(HTTP_FILE_CONTENT);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('a refused body containing ### writes nothing and keeps the markers', async () => {
    const { tmpDir, filePath, requests } = setupHttpFile();
    try {
      const { stdin, lastFrame } = renderApp({ filePath, requests });
      await delay(KEY_DELAY_MS);

      await gotoCreateUser(stdin);
      await press(stdin, 'e');
      await press(stdin, ENTER);
      await press(stdin, '#');
      await press(stdin, '#');
      await press(stdin, '#');
      await press(stdin, CTRL_S);

      expect(lastFrame() ?? '').toContain('*collection.http');

      await press(stdin, CTRL_S);
      expect(lastFrame() ?? '').toContain('Confirm overriding');

      await press(stdin, 'y');

      const frame = lastFrame() ?? '';
      expect(frame).not.toContain('Confirm overriding');
      expect(frame).toContain('###');
      expect(frame).toContain('separator');
      expect(frame).toContain('*collection.http');

      expect(readFileSync(filePath, 'utf8')).toBe(HTTP_FILE_CONTENT);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('a reverted body still triggers a confirmation and on y rewrites and clears the markers', async () => {
    const { tmpDir, filePath, requests } = setupHttpFile();
    try {
      const { stdin, lastFrame } = renderApp({ filePath, requests });
      await delay(KEY_DELAY_MS);

      await gotoCreateUser(stdin);
      await press(stdin, 'e');
      await press(stdin, 'X');
      await press(stdin, CTRL_S);
      expect(lastFrame() ?? '').toContain('*collection.http');

      await press(stdin, 'e');
      await press(stdin, BACKSPACE);
      await press(stdin, CTRL_S);
      expect(lastFrame() ?? '').toContain('*collection.http');

      await press(stdin, CTRL_S);
      expect(lastFrame() ?? '').toContain('Confirm overriding');

      await press(stdin, 'y');

      const frame = lastFrame() ?? '';
      expect(frame).not.toContain('Confirm overriding');
      expect(frame).not.toContain('*collection.http');
      expect(frame).toContain('collection.http');
      expect(frame).toContain('Saved');

      expect(readFileSync(filePath, 'utf8')).toBe(HTTP_FILE_CONTENT);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});