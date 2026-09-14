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

import { ENTER, KEY_DELAY_MS, delay, makeShortUrlRequests, press, renderApp } from '../helpers/integration';
import type { EnvOption } from '../../src/core/types';

function makeEnvFile(name: string, variables: Array<{ key: string; value: string }>): { dir: string; file: string } {
  const dir = mkdtempSync(join(tmpdir(), 'httptui-env-switcher-'));
  const file = join(dir, 'env.json');
  writeFileSync(file, JSON.stringify({ name, values: variables.map((v) => ({ ...v, enabled: true })) }));
  tempDirs.push(dir);
  return { dir, file };
}

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
    await press(stdin, 'j');
    await press(stdin, ENTER);

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Select Environment');
    expect(frame).toContain('Development');
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
    await press(stdin, 'j');
    await press(stdin, ENTER);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Select Environment');
    expect(frame).toContain('ENOENT');
  });

  it('selecting an environment with invalid JSON shows an error message', async () => {
    const { file } = makeEnvFile('Corrupt', []);
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
    await press(stdin, 'j');
    await press(stdin, ENTER);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Select Environment');
    expect(frame).toContain('Failed to parse');
  });
});
