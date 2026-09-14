import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from 'ink-testing-library';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

describe('request body editing integration', () => {
  it('committing an edit then S writes the edited body to the exported .http file', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-edit-export-'));
    try {
      const requests = makeBodyRequest('original-body');
      const filePath = join(tmpDir, 'collection.json');
      const { stdin } = renderApp({ filePath, requests });
      await delay(KEY_DELAY_MS);

      await press(stdin, 'e');
      await press(stdin, SHIFT_TAB);
      await press(stdin, SHIFT_TAB);
      for (const char of 'XYZ') {
        await press(stdin, char);
      }
      await press(stdin, CTRL_S);

      await press(stdin, 'S');
      await press(stdin, ENTER);

      const expectedPath = join(tmpDir, 'collection.http');
      expect(existsSync(expectedPath)).toBe(true);
      const content = readFileSync(expectedPath, 'utf8');
      expect(content).toContain('original-bodyXYZ');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
