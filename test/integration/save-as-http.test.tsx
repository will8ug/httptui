import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from 'ink-testing-library';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  BACKSPACE,
  ENTER,
  ESC,
  KEY_DELAY_MS,
  delay,
  makeShortUrlRequests,
  press,
  renderApp,
} from '../helpers/integration';
import type { FileVariable } from '../../src/core/types';
import { serializeHttpFile } from '../../src/core/http-serializer';

afterEach(() => {
  cleanup();
});

describe('save-as-http integration', () => {
  it('S opens save overlay with default path', async () => {
    const { stdin, lastFrame } = renderApp({
      filePath: '/path/to/collection.json',
      requests: makeShortUrlRequests(1),
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'S');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Save as .http');
    expect(frame).toContain('collection.http');
    expect(frame).toContain('Press Enter to save, Esc to cancel');
  });

  it('Esc cancels save overlay and returns to normal mode', async () => {
    const { stdin, lastFrame } = renderApp({
      filePath: '/path/to/collection.json',
      requests: makeShortUrlRequests(1),
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'S');
    expect(lastFrame() ?? '').toContain('Save as .http');

    await press(stdin, ESC);

    expect(lastFrame() ?? '').not.toContain('Save as .http');
  });

  it('Enter writes file and shows confirmation message', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-save-test-'));
    try {
      const requests = makeShortUrlRequests(3);
      const fileVariables: FileVariable[] = [{ name: 'host', value: 'example.com' }];
      const filePath = join(tmpDir, 'test-collection.json');

      const { stdin, lastFrame } = renderApp({
        filePath,
        requests,
        fileVariables,
      });
      await delay(KEY_DELAY_MS);

      await press(stdin, 'S');
      await press(stdin, ENTER);

      const expectedPath = join(tmpDir, 'test-collection.http');
      expect(existsSync(expectedPath)).toBe(true);

      const content = readFileSync(expectedPath, 'utf8');
      expect(content).toBe(serializeHttpFile(requests, fileVariables));

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Saved');
      expect(frame).toContain('test-collection.http');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('Status bar shows written file name after save-as', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-save-test-'));
    try {
      const requests = makeShortUrlRequests(2);
      const filePath = join(tmpDir, 'loaded-collection.json');

      const { stdin, lastFrame } = renderApp({
        filePath,
        requests,
      });
      await delay(KEY_DELAY_MS);

      expect(lastFrame() ?? '').toContain('loaded-collection.json');

      await press(stdin, 'S');
      await press(stdin, ENTER);

      const expectedPath = join(tmpDir, 'loaded-collection.http');
      expect(existsSync(expectedPath)).toBe(true);

      const frame = lastFrame() ?? '';
      expect(frame).toContain('loaded-collection.http');
      expect(frame).not.toContain('loaded-collection.json');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('Refuses to overwrite when target file already exists', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-save-test-'));
    try {
      const requests = makeShortUrlRequests(2);
      const filePath = join(tmpDir, 'test-collection.json');
      const existingPath = join(tmpDir, 'test-collection.http');

      writeFileSync(existingPath, 'existing content', 'utf8');

      const { stdin, lastFrame } = renderApp({
        filePath,
        requests,
      });
      await delay(KEY_DELAY_MS);

      await press(stdin, 'S');
      await press(stdin, ENTER);

      const frame = lastFrame() ?? '';
      expect(frame).toContain('File exists');
      expect(frame).toContain('Save as .http');

      expect(readFileSync(existingPath, 'utf8')).toBe('existing content');
      expect(existsSync(join(tmpDir, 'test-collection - 1.http'))).toBe(false);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('Repeated save attempts keep refusing without creating suffixed siblings', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-save-test-'));
    try {
      const requests = makeShortUrlRequests(2);
      const filePath = join(tmpDir, 'test-collection.http');
      writeFileSync(filePath, 'existing content', 'utf8');

      const { stdin, lastFrame } = renderApp({
        filePath,
        requests,
      });
      await delay(KEY_DELAY_MS);

      await press(stdin, 'S');
      await press(stdin, ENTER);
      expect(lastFrame() ?? '').toContain('File exists');

      await press(stdin, ESC);
      await press(stdin, 'S');
      await press(stdin, ENTER);
      expect(lastFrame() ?? '').toContain('File exists');

      expect(readdirSync(tmpDir)).toEqual(['test-collection.http']);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('Refusal error clears on input change and save succeeds with a new name', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-save-test-'));
    try {
      const requests = makeShortUrlRequests(2);
      const filePath = join(tmpDir, 'test-collection.json');
      const existingPath = join(tmpDir, 'test-collection.http');
      writeFileSync(existingPath, 'existing content', 'utf8');

      const { stdin, lastFrame } = renderApp({
        filePath,
        requests,
      });
      await delay(KEY_DELAY_MS);

      await press(stdin, 'S');
      await press(stdin, ENTER);
      expect(lastFrame() ?? '').toContain('File exists');

      const defaultPath = 'test-collection.http';
      for (let i = 0; i < defaultPath.length; i++) {
        await press(stdin, BACKSPACE);
        if (i === 0) {
          expect(lastFrame() ?? '').not.toContain('File exists');
        }
      }

      const customPath = 'renamed-api';
      for (const char of customPath) {
        await press(stdin, char);
      }
      await press(stdin, ENTER);

      expect(existsSync(join(tmpDir, 'renamed-api'))).toBe(true);

      const frame = lastFrame() ?? '';
      expect(frame).toContain('renamed-api');
      expect(frame).not.toContain('test-collection.http');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('S key is ignored in non-normal modes', async () => {
    const { stdin, lastFrame } = renderApp({
      filePath: '/path/to/collection.json',
      requests: makeShortUrlRequests(1),
    });
    await delay(KEY_DELAY_MS);

    // Enter fileLoad mode by pressing 'o'
    await press(stdin, 'o');
    expect(lastFrame() ?? '').toContain('Open File');

    // Press 'S' — should be treated as text input, not a save command
    await press(stdin, 'S');

    const frame = lastFrame() ?? '';
    // Should still be in fileLoad mode (overlay still visible)
    expect(frame).toContain('Open File');
    // 'S' should appear as part of the file path input, not as a save overlay
    expect(frame).not.toContain('Save as .http');
  });

  it('Typing characters in save overlay updates the path', async () => {
    const { stdin, lastFrame } = renderApp({
      filePath: '/path/to/collection.json',
      requests: makeShortUrlRequests(1),
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'S');

    // Clear the default path by pressing backspace multiple times
    const defaultPath = 'collection.http';
    for (let i = 0; i < defaultPath.length; i++) {
      await press(stdin, BACKSPACE);
    }

    // Type a custom path
    const customPath = 'my-api';
    for (const char of customPath) {
      await press(stdin, char);
    }

    const frame = lastFrame() ?? '';
    expect(frame).toContain('my-api');
  });

  it('Backspace removes last character from save input', async () => {
    const { stdin, lastFrame } = renderApp({
      filePath: '/path/to/collection.json',
      requests: makeShortUrlRequests(1),
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'S');

    // The default path is "collection.http" (derived from filePath)
    // Press backspace once to remove the last character
    await press(stdin, BACKSPACE);

    const frame = lastFrame() ?? '';
    // After removing one character from "collection.http", we get "collection.htt"
    expect(frame).toContain('collection.htt');
    expect(frame).not.toContain('collection.http');
  });
});