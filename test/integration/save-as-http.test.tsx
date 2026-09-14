import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from 'ink-testing-library';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  ENTER,
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
});
