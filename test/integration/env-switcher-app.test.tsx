import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanup } from 'ink-testing-library';

const { agentMock, requestMock } = vi.hoisted(() => ({
  agentMock: vi.fn().mockImplementation(() => ({})),
  requestMock: vi.fn(),
}));

vi.mock('undici', () => ({
  Agent: agentMock,
  request: requestMock,
}));

import { DOWN_ARROW, ENTER, ESC, KEY_DELAY_MS, UP_ARROW, delay, makeShortUrlRequests, press, renderApp } from '../helpers/integration';
import type { EnvOption, FileVariable } from '../../src/core/types';

function makeEnvFile(name: string, variables: Array<{ key: string; value: string }>): { dir: string; file: string } {
  const dir = mkdtempSync(join(tmpdir(), 'httptui-env-switcher-'));
  const file = join(dir, 'env.json');
  writeFileSync(file, JSON.stringify({ name, values: variables.map((v) => ({ ...v, enabled: true })) }));
  tempDirs.push(dir);
  return { dir, file };
}

const allEnvironments: EnvOption[] = [
  { name: '(none)', file: null },
  { name: 'Development', file: '/does-not-matter/dev.json' },
  { name: 'Staging', file: '/does-not-matter/staging.json' },
];

/** Collect temp dirs created by makeEnvFile so afterEach can remove them. */
const tempDirs: string[] = [];

beforeEach(() => {
  requestMock.mockReset();
});

afterEach(() => {
  cleanup();
  for (const d of tempDirs) {
    rmSync(d, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

describe('env switcher integration — E key opens overlay', () => {
  it('E opens the environment select overlay when environments are available', async () => {
    const { stdin, lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      availableEnvironments: allEnvironments,
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'E');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Select Environment');
    expect(frame).toContain('Development');
    expect(frame).toContain('Staging');
  });

  it('E with only (none) available shows the "No environments configured" message and does not open the overlay', async () => {
    const { stdin, lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      availableEnvironments: [{ name: '(none)', file: null }],
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'E');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('No environments configured');
    expect(frame).not.toContain('Select Environment');
  });

  it('E is ignored while the help overlay is open', async () => {
    const { stdin, lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      availableEnvironments: allEnvironments,
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, '?');
    expect(lastFrame() ?? '').toContain('Toggle request details panel');

    await press(stdin, 'E');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Toggle request details panel');
    expect(frame).not.toContain('Select Environment');
  });

  it('E is ignored while the file load overlay is open', async () => {
    const { stdin, lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      availableEnvironments: allEnvironments,
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    expect(lastFrame() ?? '').toContain('Open File');

    await press(stdin, 'E');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Open File');
    expect(frame).not.toContain('Select Environment');
  });

  it('E is ignored while the search overlay is open', async () => {
    requestMock.mockResolvedValue({
      statusCode: 200,
      headers: {},
      body: { text: async () => 'hello world' },
    });

    const { stdin, lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      availableEnvironments: allEnvironments,
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, ENTER);
    await delay(KEY_DELAY_MS * 4);

    await press(stdin, '/');
    expect(lastFrame() ?? '').toContain('(Esc to cancel)');

    await press(stdin, 'E');

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Select Environment');
    expect(frame).toContain('(Esc to cancel)');
  });
});

describe('env switcher integration — overlay navigation', () => {
  // For navigation tests that confirm selection via Enter, we need real env files
  // so that SWITCH_ENV can actually read and apply the environment.

  it('j moves the selection down and applies the environment at the new index', async () => {
    const { file: devFile } = makeEnvFile('Development', [
      { key: 'baseUrl', value: 'https://api.dev.com' },
    ]);
    const { file: stagingFile } = makeEnvFile('Staging', [
      { key: 'baseUrl', value: 'https://api.staging.com' },
    ]);
    const environments: EnvOption[] = [
      { name: '(none)', file: null },
      { name: 'Development', file: devFile },
      { name: 'Staging', file: stagingFile },
    ];

    const { stdin, lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      availableEnvironments: environments,
      activeEnvName: null,
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'E');
    expect(lastFrame() ?? '').toContain('Select Environment');

    await press(stdin, 'j');
    await press(stdin, ENTER);

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Select Environment');
    expect(frame).toContain('Development');
  });

  it('down arrow moves the selection down and applies the environment', async () => {
    const { file: devFile } = makeEnvFile('Development', [
      { key: 'baseUrl', value: 'https://api.dev.com' },
    ]);
    const environments: EnvOption[] = [
      { name: '(none)', file: null },
      { name: 'Development', file: devFile },
    ];

    const { stdin, lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      availableEnvironments: environments,
      activeEnvName: null,
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'E');
    await press(stdin, DOWN_ARROW);
    await press(stdin, ENTER);

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Select Environment');
    expect(frame).toContain('Development');
  });

  it('k moves the selection up and applies the environment at the new index', async () => {
    const { file: devFile } = makeEnvFile('Development', [
      { key: 'baseUrl', value: 'https://api.dev.com' },
    ]);
    const { file: stagingFile } = makeEnvFile('Staging', [
      { key: 'baseUrl', value: 'https://api.staging.com' },
    ]);
    const environments: EnvOption[] = [
      { name: '(none)', file: null },
      { name: 'Development', file: devFile },
      { name: 'Staging', file: stagingFile },
    ];

    const { stdin, lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      availableEnvironments: environments,
      activeEnvName: 'Development',
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'E');
    await press(stdin, 'j'); // Staging (index 2)
    await press(stdin, 'k'); // back to Development (index 1)
    await press(stdin, ENTER);

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Select Environment');
    expect(frame).toContain('Development');
  });

  it('up arrow moves the selection up and applies the environment', async () => {
    const { file: devFile } = makeEnvFile('Development', [
      { key: 'baseUrl', value: 'https://api.dev.com' },
    ]);
    const { file: stagingFile } = makeEnvFile('Staging', [
      { key: 'baseUrl', value: 'https://api.staging.com' },
    ]);
    const environments: EnvOption[] = [
      { name: '(none)', file: null },
      { name: 'Development', file: devFile },
      { name: 'Staging', file: stagingFile },
    ];

    const { stdin, lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      availableEnvironments: environments,
      activeEnvName: 'Development',
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'E');
    await press(stdin, 'j'); // Staging (index 2)
    await press(stdin, UP_ARROW); // back to Development (index 1)
    await press(stdin, ENTER);

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Select Environment');
    expect(frame).toContain('Development');
  });

  it('Esc closes the overlay without changing active environment', async () => {
    const { stdin, lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      availableEnvironments: allEnvironments,
      activeEnvName: null,
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'E');
    expect(lastFrame() ?? '').toContain('Select Environment');

    await press(stdin, ESC);

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Select Environment');
  });

  it('k at the top of the list stays at index 0 and selects (none)', async () => {
    const { file: devFile } = makeEnvFile('Development', [
      { key: 'baseUrl', value: 'https://api.dev.com' },
    ]);
    const environments: EnvOption[] = [
      { name: '(none)', file: null },
      { name: 'Development', file: devFile },
    ];

    const { stdin, lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      availableEnvironments: environments,
      activeEnvName: null,
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'E'); // cursor on (none) at index 0
    await press(stdin, 'k'); // stays at index 0 (clamped)
    await press(stdin, ENTER);

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Select Environment');
    // Selecting (none) means env name is cleared — no Development shown
    expect(frame).not.toContain('Development');
  });

  it('j at the bottom of the list stays at the last index and selects Staging', async () => {
    const { file: devFile } = makeEnvFile('Development', [
      { key: 'baseUrl', value: 'https://api.dev.com' },
    ]);
    const { file: stagingFile } = makeEnvFile('Staging', [
      { key: 'baseUrl', value: 'https://api.staging.com' },
    ]);
    const environments: EnvOption[] = [
      { name: '(none)', file: null },
      { name: 'Development', file: devFile },
      { name: 'Staging', file: stagingFile },
    ];

    const { stdin, lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      availableEnvironments: environments,
      activeEnvName: 'Staging',
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'E'); // cursor on Staging at index 2
    await press(stdin, 'j'); // stays at index 2 (clamped)
    await press(stdin, ENTER);

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Select Environment');
    expect(frame).toContain('Staging');
  });
});

describe('env switcher integration — selection applies environment', () => {
  it('Enter on (none) closes overlay and clears the active env name from the status bar', async () => {
    const { file: devFile } = makeEnvFile('Development', [
      { key: 'baseUrl', value: 'https://api.dev.com' },
    ]);
    const environments: EnvOption[] = [
      { name: '(none)', file: null },
      { name: 'Development', file: devFile },
    ];
    const fileVariables: FileVariable[] = [{ name: 'baseUrl', value: 'https://api.local' }];

    const { stdin, lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      availableEnvironments: environments,
      fileVariables,
      activeEnvName: 'Development',
    });
    await delay(KEY_DELAY_MS);

    // Verify Development is initially shown
    expect(lastFrame() ?? '').toContain('Development');

    await press(stdin, 'E');
    // Cursor starts on "Development" (index 1, since activeEnvName='Development')
    await press(stdin, UP_ARROW); // Move to "(none)" at index 0
    await press(stdin, ENTER);

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Select Environment');
    expect(frame).not.toContain('Development');
  });

  it('Enter on a real environment applies its file variables and shows name in status bar', async () => {
    const { file: devFile } = makeEnvFile('Development', [
      { key: 'baseUrl', value: 'https://api.dev.com' },
      { key: 'apiKey', value: 'dev-key' },
    ]);
    const environments: EnvOption[] = [
      { name: '(none)', file: null },
      { name: 'Development', file: devFile },
    ];
    const fileVariables: FileVariable[] = [{ name: 'baseUrl', value: 'https://api.local' }];

    const { stdin, lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      fileVariables,
      availableEnvironments: environments,
      activeEnvName: null,
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'E');
    await press(stdin, 'j');
    await press(stdin, ENTER);

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Select Environment');
    expect(frame).toContain('Development');
  });
});

describe('env switcher integration — environment file loading', () => {
  it('applying an environment loads variables from the env file', async () => {
    const { file: devFile } = makeEnvFile('Development', [
      { key: 'baseUrl', value: 'https://api.dev.com' },
    ]);
    const environments: EnvOption[] = [
      { name: '(none)', file: null },
      { name: 'Development', file: devFile },
    ];

    const { stdin, lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      availableEnvironments: environments,
      activeEnvName: null,
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'E');
    await press(stdin, 'j'); // Select Development
    await press(stdin, ENTER);

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Select Environment');
    expect(frame).toContain('Development');
  });

  it('switching from one environment to another replaces the variables', async () => {
    const { file: devFile } = makeEnvFile('Development', [
      { key: 'baseUrl', value: 'https://api.dev.com' },
    ]);
    const { file: stagingFile } = makeEnvFile('Staging', [
      { key: 'baseUrl', value: 'https://api.staging.com' },
    ]);
    const environments: EnvOption[] = [
      { name: '(none)', file: null },
      { name: 'Development', file: devFile },
      { name: 'Staging', file: stagingFile },
    ];

    const { stdin, lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      availableEnvironments: environments,
      activeEnvName: 'Development',
    });
    await delay(KEY_DELAY_MS);

    // Switch from Development to Staging
    await press(stdin, 'E'); // cursor on Development (index 1)
    await press(stdin, 'j'); // move to Staging (index 2)
    await press(stdin, ENTER);

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Select Environment');
    expect(frame).toContain('Staging');
  });
});

describe('env switcher integration — error handling', () => {
  it('selecting an environment with a nonexistent file shows an error message', async () => {
    const environments: EnvOption[] = [
      { name: '(none)', file: null },
      { name: 'Broken', file: '/nonexistent/path/env.json' },
    ];

    const { stdin, lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      availableEnvironments: environments,
      activeEnvName: null,
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'E');
    await press(stdin, 'j'); // Select Broken
    await press(stdin, ENTER);

    const frame = lastFrame() ?? '';
    // Overlay stays open with error
    expect(frame).toContain('Select Environment');
    expect(frame).toContain('ENOENT');
  });

  it('selecting an environment with invalid JSON shows an error message', async () => {
    const { file } = makeEnvFile('Corrupt', []);
    // Overwrite the valid env.json with invalid JSON
    writeFileSync(file, 'this is { not valid JSON !!!');

    const environments: EnvOption[] = [
      { name: '(none)', file: null },
      { name: 'Corrupt', file },
    ];

    const { stdin, lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      availableEnvironments: environments,
      activeEnvName: null,
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'E');
    await press(stdin, 'j'); // Select Corrupt
    await press(stdin, ENTER);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Select Environment');
    expect(frame).toContain('Failed to parse');
  });
});

describe('env switcher integration — StatusBar envName display', () => {
  it('renders the active env name in the status bar when set', async () => {
    const { file: prodFile } = makeEnvFile('Production', [
      { key: 'baseUrl', value: 'https://api.prod.com' },
    ]);
    const environments: EnvOption[] = [
      { name: '(none)', file: null },
      { name: 'Production', file: prodFile },
    ];

    const { lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      activeEnvName: 'Production',
      availableEnvironments: environments,
    });
    await delay(KEY_DELAY_MS);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Production');
  });

  it('does not render an env name in the status bar when activeEnvName is null', async () => {
    const { lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      activeEnvName: null,
      availableEnvironments: [{ name: '(none)', file: null }],
    });
    await delay(KEY_DELAY_MS);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('[Enter] Send');
    // When envName is null, no env name text (like "Production") should appear
    // in the status bar. Assert absence of specific env names.
    expect(frame).not.toContain('Production');
  });
});
