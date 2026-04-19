import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanup } from 'ink-testing-library';

import { parseHttpFile } from '../../src/core/parser';
import { delay, KEY_DELAY_MS, press, renderApp } from '../helpers/integration';

const INITIAL_HTTP_CONTENT = '### Test 1\nGET https://example.com/a\n\n### Test 2\nGET https://example.com/b\n';
const UPDATED_HTTP_CONTENT = '### Test 3\nGET https://example.com/c\n\n### Test 4\nGET https://example.com/d\n\n### Test 5\nGET https://example.com/e\n';

let tempDirectoryPath = '';
let tempFilePath = '';

function writeTempHttpFile(content: string): void {
  writeFileSync(tempFilePath, content);
}

beforeEach(() => {
  tempDirectoryPath = mkdtempSync(join(tmpdir(), 'httptui-reload-test-'));
  tempFilePath = join(tempDirectoryPath, 'reload.http');
  writeTempHttpFile(INITIAL_HTTP_CONTENT);
});

afterEach(() => {
  cleanup();

  if (tempFilePath) {
    unlinkSync(tempFilePath);
  }

  if (tempDirectoryPath) {
    rmSync(tempDirectoryPath, { recursive: true, force: true });
  }

  tempDirectoryPath = '';
  tempFilePath = '';
});

describe('reload integration', () => {
  it("R reloads file and shows 'Reloaded' message briefly", async () => {
    const parsedRequests = parseHttpFile(INITIAL_HTTP_CONTENT);
    const { stdin, lastFrame } = renderApp({
      filePath: tempFilePath,
      requests: parsedRequests.requests,
      variables: parsedRequests.variables,
    });

    await delay(KEY_DELAY_MS);
    await press(stdin, 'R');
    await delay(100);

    expect(lastFrame() ?? '').toContain('Reloaded');
  });

  it('R reloads modified file content', async () => {
    const parsedRequests = parseHttpFile(INITIAL_HTTP_CONTENT);
    const { stdin, lastFrame } = renderApp({
      filePath: tempFilePath,
      requests: parsedRequests.requests,
      variables: parsedRequests.variables,
    });

    await delay(KEY_DELAY_MS);
    writeTempHttpFile(UPDATED_HTTP_CONTENT);

    await press(stdin, 'R');
    await delay(100);

    const frame = lastFrame() ?? '';

    expect(frame).toContain('/c');
    expect(frame).toContain('/d');
    expect(frame).toContain('/e');
    expect(frame).not.toContain('/a');
    expect(frame).not.toContain('/b');
  });
});
