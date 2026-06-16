import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from 'ink-testing-library';
import { resolve } from 'node:path';

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
import type { EnvOption, FileVariable, ParsedRequest } from '../../src/core/types';

afterEach(() => {
  cleanup();
});

describe('file-load integration', () => {
  it('o opens file-load overlay', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Open File');
    expect(frame).toContain('File:');
  });

  it('typing characters in overlay is reflected in rendered frame', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    await press(stdin, 't');
    await press(stdin, 'e');
    await press(stdin, 's');
    await press(stdin, 't');

    expect(lastFrame() ?? '').toContain('test');
  });

  it('Enter with non-existent path shows error', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    for (const char of './does-not-exist.http') {
      await press(stdin, char);
    }
    await press(stdin, ENTER);

    expect(lastFrame() ?? '').toMatch(/not found/i);
  });

  it('Esc cancels overlay and returns to normal mode', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    expect(lastFrame() ?? '').toContain('Open File');

    await press(stdin, ESC);

    expect(lastFrame() ?? '').not.toContain('Open File');
  });

  it('Backspace removes last character', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    await press(stdin, 'a');
    await press(stdin, 'b');
    await press(stdin, 'c');
    await press(stdin, BACKSPACE);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('ab');
    expect(frame).not.toContain('abc');
  });

  it('Enter with empty input shows error', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    await press(stdin, ENTER);

    expect(lastFrame() ?? '').toMatch(/enter a file path/i);
  });
});

describe('file-load regression — env revert shows file variables', () => {
  const fixturePath = resolve(__dirname, '../fixtures/load-revert-fixture.http');

  const initialRequests: ParsedRequest[] = [
    {
      name: 'test request',
      method: 'GET',
      url: '{{baseUrl}}/path',
      headers: {},
      body: undefined,
      lineNumber: 4,
    },
  ];

  const fileVariables: FileVariable[] = [{ name: 'baseUrl', value: 'http://file-value' }];
  const environmentVariables: FileVariable[] = [{ name: 'baseUrl', value: 'http://env-value' }];
  const mergedVariables: FileVariable[] = [{ name: 'baseUrl', value: 'http://env-value' }];

  const allEnvironments: EnvOption[] = [
    { name: '(none)', file: null },
    { name: 'EnvTest', file: '/does-not-matter/env.json' },
  ];

  it('after loading a new file then switching to (none), request details show file variable value', async () => {
    const { stdin, lastFrame } = renderApp({
      requests: initialRequests,
      variables: mergedVariables,
      fileVariables,
      environmentVariables,
      activeEnvName: 'EnvTest',
      availableEnvironments: allEnvironments,
      filePath: 'original.http',
    });
    await delay(KEY_DELAY_MS);

    // Step 1: Open file-load overlay
    await press(stdin, 'o');
    expect(lastFrame() ?? '').toContain('Open File');

    // Step 2: Type the fixture path (write in one shot for speed)
    stdin.write(fixturePath);
    await delay(KEY_DELAY_MS);

    // Step 3: Submit the path
    await press(stdin, ENTER);
    await delay(KEY_DELAY_MS);

    // Verify we're back in normal mode after loading
    const afterLoadFrame = lastFrame() ?? '';
    expect(afterLoadFrame).not.toContain('Open File');

    // Step 4: Open env-select overlay
    await press(stdin, 'E');
    expect(lastFrame() ?? '').toContain('Select Environment');

    // Step 5: Navigate to (none) — active env 'EnvTest' is at index 1, press k to go up to index 0
    await press(stdin, 'k');

    // Step 6: Select (none)
    await press(stdin, ENTER);
    await delay(KEY_DELAY_MS);

    // After switching to (none), env overlay should be closed
    const afterEnvFrame = lastFrame() ?? '';
    expect(afterEnvFrame).not.toContain('Select Environment');

    // Step 7: Show request details
    await press(stdin, 'd');
    await delay(KEY_DELAY_MS);

    // Assert the resolved URL shows the file variable value, not the env value
    const detailsFrame = lastFrame() ?? '';
    expect(detailsFrame).toContain('http://file-value');
    expect(detailsFrame).not.toContain('http://env-value');
  }, 15000);
});