import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from 'ink-testing-library';
import { resolve } from 'node:path';

import {
  BACKSPACE,
  CTRL_A,
  CTRL_E,
  DELETE,
  END,
  ENTER,
  ESC,
  HOME,
  KEY_DELAY_MS,
  LEFT_ARROW,
  RIGHT_ARROW,
  TAB,
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

describe('file-load cursor navigation', () => {
  it('left arrow moves the cursor for mid-string insertion', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    for (const char of 'abc') {
      await press(stdin, char);
    }
    await press(stdin, LEFT_ARROW);
    await press(stdin, 'X');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('abXc');
    expect(frame).not.toContain('abc');
  });

  it('right arrow moves the cursor back to the end', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    for (const char of 'abc') {
      await press(stdin, char);
    }
    await press(stdin, LEFT_ARROW);
    await press(stdin, RIGHT_ARROW);
    await press(stdin, 'X');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('abcX');
  });

  it('Home moves the cursor to the start and End to the end', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    for (const char of 'abc') {
      await press(stdin, char);
    }
    await press(stdin, HOME);
    await press(stdin, 'X');
    expect(lastFrame() ?? '').toContain('Xabc');

    await press(stdin, END);
    await press(stdin, 'Y');
    expect(lastFrame() ?? '').toContain('XabcY');
  });

  it('Ctrl+A and Ctrl+E alias Home and End', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    for (const char of 'abc') {
      await press(stdin, char);
    }
    await press(stdin, CTRL_A);
    await press(stdin, 'X');
    await press(stdin, CTRL_E);
    await press(stdin, 'Y');

    expect(lastFrame() ?? '').toContain('XabcY');
  });

  it('backspace deletes the character before the cursor', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    for (const char of 'abc') {
      await press(stdin, char);
    }
    await press(stdin, LEFT_ARROW);
    await press(stdin, BACKSPACE);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('ac');
    expect(frame).not.toContain('abc');
  });

  it('delete removes the character after the cursor', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    for (const char of 'abc') {
      await press(stdin, char);
    }
    await press(stdin, HOME);
    await press(stdin, DELETE);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('bc');
    expect(frame).not.toContain('abc');
  });
});

describe('file-load tab completion', () => {
  const fixtureDir = 'test/fixtures/tab-complete';

  it('completes a single matching directory with a trailing separator and chains into it', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    stdin.write(`${fixtureDir}/ad`);
    await delay(KEY_DELAY_MS);
    await press(stdin, TAB);

    expect(lastFrame() ?? '').toContain(`${fixtureDir}/admin/`);

    await press(stdin, TAB);

    expect(lastFrame() ?? '').toContain(`${fixtureDir}/admin/routes.http`);
  });

  it('extends multiple matches to the longest common prefix without listing candidates', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    stdin.write(`${fixtureDir}/u`);
    await delay(KEY_DELAY_MS);
    await press(stdin, TAB);

    const frame = lastFrame() ?? '';
    expect(frame).toContain(`${fixtureDir}/users`);
    expect(frame).not.toContain('users.http');
  });

  it('lists candidates when a second Tab makes no further progress', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    stdin.write(`${fixtureDir}/u`);
    await delay(KEY_DELAY_MS);
    await press(stdin, TAB);
    await press(stdin, TAB);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('users-staging.http');
    expect(frame).toContain('users.http');
  });

  it('clears the candidate list when typing continues', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    stdin.write(`${fixtureDir}/u`);
    await delay(KEY_DELAY_MS);
    await press(stdin, TAB);
    await press(stdin, TAB);
    expect(lastFrame() ?? '').toContain('users-staging.http');

    await press(stdin, '-');

    const frame = lastFrame() ?? '';
    expect(frame).toContain(`${fixtureDir}/users-`);
    expect(frame).not.toContain('users-staging.http');
  });

  it('clears the candidate list when the cursor moves', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    stdin.write(`${fixtureDir}/u`);
    await delay(KEY_DELAY_MS);
    await press(stdin, TAB);
    await press(stdin, TAB);
    expect(lastFrame() ?? '').toContain('users-staging.http');

    await press(stdin, LEFT_ARROW);

    const frame = lastFrame() ?? '';
    expect(frame).toContain(`${fixtureDir}/users`);
    expect(frame).not.toContain('users-staging.http');
  });

  it('leaves the input unchanged and shows no error when nothing matches', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    stdin.write(`${fixtureDir}/zzz`);
    await delay(KEY_DELAY_MS);
    await press(stdin, TAB);

    const frame = lastFrame() ?? '';
    expect(frame).toContain(`${fixtureDir}/zzz`);
    expect(frame).not.toMatch(/not found/i);
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
      isDirty: false,
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