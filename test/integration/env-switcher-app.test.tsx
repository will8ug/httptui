import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanup } from 'ink-testing-library';

import { DOWN_ARROW, ENTER, ESC, KEY_DELAY_MS, UP_ARROW, delay, makeShortUrlRequests, press, renderApp } from '../helpers/integration';
import type { EnvOption, FileVariable } from '../../src/core/types';

function makeEnvFile(name: string, variables: Array<{ key: string; value: string }>): string {
  const dir = mkdtempSync(join(tmpdir(), 'httptui-env-switcher-'));
  const file = join(dir, 'env.json');
  writeFileSync(file, JSON.stringify({ name, values: variables.map((v) => ({ ...v, enabled: true })) }));
  return file;
}

const fileVariables: FileVariable[] = [{ name: 'baseUrl', value: 'https://api.local' }];

const allEnvironments: EnvOption[] = [
  { name: '(none)', file: null },
  { name: 'Development', file: '/does-not-matter/dev.json' },
  { name: 'Staging', file: '/does-not-matter/staging.json' },
];

afterEach(() => {
  cleanup();
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
});

describe('env switcher integration — overlay navigation', () => {
  it('j moves the selection down', async () => {
    const { stdin, lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      availableEnvironments: allEnvironments,
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'E');
    expect(lastFrame() ?? '').toContain('Select Environment');

    await press(stdin, 'j');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Select Environment');
    expect(frame).toContain('Development');
  });

  it('down arrow moves the selection down', async () => {
    const { stdin, lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      availableEnvironments: allEnvironments,
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'E');
    await press(stdin, DOWN_ARROW);

    expect(lastFrame() ?? '').toContain('Select Environment');
  });

  it('k moves the selection up', async () => {
    const { stdin, lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      availableEnvironments: allEnvironments,
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'E');
    await press(stdin, 'j');
    await press(stdin, 'j');
    await press(stdin, 'k');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Select Environment');
  });

  it('up arrow moves the selection up', async () => {
    const { stdin, lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      availableEnvironments: allEnvironments,
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'E');
    await press(stdin, 'j');
    await press(stdin, UP_ARROW);

    expect(lastFrame() ?? '').toContain('Select Environment');
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
});

describe('env switcher integration — selection applies environment', () => {
  it('Enter on (none) closes overlay and clears envName display', async () => {
    const { stdin, lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      availableEnvironments: allEnvironments,
      activeEnvName: null,
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'E');
    await press(stdin, ENTER);

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Select Environment');
  });

  it('Enter on a real environment applies its file variables and shows name in status bar', async () => {
    const devFile = makeEnvFile('Development', [
      { key: 'baseUrl', value: 'https://api.dev.com' },
      { key: 'apiKey', value: 'dev-key' },
    ]);

    const environments: EnvOption[] = [
      { name: '(none)', file: null },
      { name: 'Development', file: devFile },
    ];

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

    rmSync(devFile, { force: true });
  });
});

describe('env switcher integration — StatusBar envName display', () => {
  it('renders the active env name in the status bar when set', async () => {
    const { lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      activeEnvName: 'Production',
      availableEnvironments: [
        { name: '(none)', file: null },
        { name: 'Production', file: '/x.json' },
      ],
    });
    await delay(KEY_DELAY_MS);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Production');
  });

  it('does not render an env name segment when activeEnvName is null', async () => {
    const { lastFrame } = renderApp({
      requests: makeShortUrlRequests(1),
      activeEnvName: null,
      availableEnvironments: [{ name: '(none)', file: null }],
    });
    await delay(KEY_DELAY_MS);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('[Enter] Send');
    expect(frame).not.toContain('●');
  });
});
