import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from 'ink-testing-library';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseHttpFile } from '../../src/core/parser';
import {
  CTRL_S,
  ENTER,
  KEY_DELAY_MS,
  delay,
  press,
  renderApp,
} from '../helpers/integration';
import type { ParsedRequest } from '../../src/core/types';

afterEach(() => {
  cleanup();
});

function makeUrlRequest(url: string = 'https://example.com/users'): ParsedRequest[] {
  return [
    {
      name: 'create',
      method: 'POST' as const,
      url,
      headers: { Accept: 'application/json' },
      body: '{"name":"Alice"}',
      lineNumber: 1,
      isDirty: false,
    },
  ];
}

describe('request URL editing integration', () => {
  it('save-as writes the edited URL to the exported .http file', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-url-export-'));
    try {
      const requests = makeUrlRequest('https://old.example.com/users');
      const filePath = join(tmpDir, 'collection.json');
      const { stdin } = renderApp({ filePath, requests });
      await delay(KEY_DELAY_MS);

      await press(stdin, 'e');
      stdin.write('staging');
      await delay(KEY_DELAY_MS * 2);
      await press(stdin, CTRL_S);

      await press(stdin, 'S');
      await press(stdin, ENTER);

      const expectedPath = join(tmpDir, 'collection.http');
      expect(existsSync(expectedPath)).toBe(true);
      const content = readFileSync(expectedPath, 'utf8');
      expect(content).toContain('POST https://old.example.com/usersstaging');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('in-place save writes the edited URL into the source file leaving other blocks unchanged', async () => {
    const httpContent = [
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
    ].join('\n');

    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-url-inplace-'));
    try {
      const filePath = join(tmpDir, 'collection.http');
      writeFileSync(filePath, httpContent, 'utf8');
      const parsed = parseHttpFile(httpContent);

      const { stdin, lastFrame } = renderApp({ filePath, requests: parsed.requests, variables: parsed.variables });
      await delay(KEY_DELAY_MS);

      await press(stdin, 'j');

      await press(stdin, 'e');
      stdin.write('staging');
      await delay(KEY_DELAY_MS * 2);
      await press(stdin, CTRL_S);

      expect(lastFrame() ?? '').toContain('*collection.http');

      await press(stdin, CTRL_S);
      expect(lastFrame() ?? '').toContain('Confirm overriding');

      await press(stdin, 'y');

      expect(lastFrame() ?? '').not.toContain('Confirm overriding');
      expect(lastFrame() ?? '').toContain('Saved');

      const newContent = readFileSync(filePath, 'utf8');
      expect(newContent).toContain('POST https://{{host}}/usersstaging');

      const originalLines = httpContent.split('\n');

      const getUserStart = originalLines.findIndex(l => l.startsWith('### Get users'));
      const getUserEnd = originalLines.findIndex((l, i) => i > getUserStart && l.startsWith('### '));
      const getUserBlock = originalLines.slice(getUserStart, getUserEnd).join('\n');

      expect(newContent).toContain(getUserBlock);
      expect(newContent).toContain('@host = example.com');
      expect(newContent).toContain('{"name":"John"}');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
