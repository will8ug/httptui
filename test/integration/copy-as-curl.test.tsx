import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from 'ink-testing-library';

import { App } from '../../src/app';
import { ClipboardError } from '../../src/core/clipboard';
import type { ClipboardRunner } from '../../src/core/clipboard';
import type { AppProps, ParsedRequest } from '../../src/core/types';
import { KEY_DELAY_MS, delay, press } from '../helpers/integration';

afterEach(() => {
  cleanup();
});

interface RunnerCall {
  command: string;
  args: string[];
  input: string | undefined;
}

function recordingRunner(calls: RunnerCall[]): ClipboardRunner {
  return async (command, args, tool) => {
    calls.push({ command, args, input: tool.input });
    return '';
  };
}

const variableRequest: ParsedRequest = {
  name: 'list users',
  method: 'GET',
  url: 'https://{{baseUrl}}/users',
  headers: {},
  body: undefined,
  lineNumber: 1,
  isDirty: false,
};

function renderCopyApp(overrides: Partial<AppProps> = {}) {
  const props: AppProps = {
    filePath: 'test.http',
    requests: [variableRequest],
    variables: [{ name: 'baseUrl', value: 'api.example.com' }],
    environmentVariables: [],
    fileVariables: [],
    activeEnvName: null,
    availableEnvironments: [],
    executorConfig: { insecure: false },
    ...overrides,
  };
  return render(<App {...props} />);
}

describe('copy-as-curl integration', () => {
  it('y in normal mode copies the resolved request and shows a success message', async () => {
    const calls: RunnerCall[] = [];
    const { stdin, lastFrame } = renderCopyApp({ clipboardRunner: recordingRunner(calls) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'y');

    expect(lastFrame() ?? '').toContain('Copied as curl');
    expect(calls).toHaveLength(1);
    const copiedInput = calls[0]?.input ?? '';
    expect(copiedInput.startsWith('curl ')).toBe(true);
    expect(copiedInput).toContain('https://api.example.com/users');
    expect(copiedInput).not.toContain('{{baseUrl}}');
  });

  it('y in edit mode inserts the character and does not copy', async () => {
    const calls: RunnerCall[] = [];
    const { stdin, lastFrame } = renderCopyApp({ clipboardRunner: recordingRunner(calls) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    expect(lastFrame() ?? '').toContain('Edit Request');

    await press(stdin, 'y');

    expect(calls).toHaveLength(0);
    expect(lastFrame() ?? '').toContain('https://{{baseUrl}}/usersy');
  });

  it('y with an exhausted clipboard chain shows a transient error instead of success', async () => {
    const { stdin, lastFrame } = renderCopyApp({
      clipboardRunner: async () => {
        throw new ClipboardError(
          'Could not copy to clipboard: no clipboard tool available. Install xclip, xsel, or wl-clipboard (provides wl-copy).',
        );
      },
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'y');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Could not copy to clipboard');
    expect(frame).not.toContain('Copied as curl');
  });

  it('help overlay lists the copy shortcut in the Request group', async () => {
    const { stdin, lastFrame } = renderCopyApp();
    await delay(KEY_DELAY_MS);

    await press(stdin, '?');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Request');
    expect(frame).toContain('Copy request as curl');
  });
});
