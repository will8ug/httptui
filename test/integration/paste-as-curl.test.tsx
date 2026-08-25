import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from 'ink-testing-library';

import { ClipboardError } from '../../src/core/clipboard';
import type { ClipboardReadRunner } from '../../src/core/clipboard';
import { KEY_DELAY_MS, delay, press, renderApp, selectedLine } from '../helpers/integration';
import { createRequest } from '../helpers/requests';

afterEach(() => {
  cleanup();
});

function clipboardContaining(text: string): ClipboardReadRunner {
  return async () => text;
}

function recordingClipboard(calls: string[], text: string): ClipboardReadRunner {
  return async () => {
    calls.push(text);
    return text;
  };
}

const initialRequest = createRequest({ name: 'list users' });

describe('paste-as-curl integration', () => {
  it('p in normal mode appends the clipboard command as a request, selects it, and shows the success message', async () => {
    const { stdin, lastFrame } = renderApp({
      requests: [initialRequest],
      clipboardReadRunner: clipboardContaining("curl 'https://api.example.com/pinged'"),
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'p');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Pasted request');
    expect(frame).not.toContain('some curl options were skipped');
    expect(frame).toContain('/users');
    expect(selectedLine(frame)).toContain('/pinged');
  });

  it('p with unsupported curl flags still appends the request and shows the skipped-options warning', async () => {
    const { stdin, lastFrame } = renderApp({
      requests: [initialRequest],
      clipboardReadRunner: clipboardContaining(
        "curl --location -X POST 'https://api.example.com/warned' -H 'X-Api-Key: k' -v --compressed",
      ),
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'p');

    const frame = lastFrame() ?? '';
    // The dash in the warning is an em-dash (U+2014), matching the app's literal string.
    expect(frame).toContain('Pasted request — some curl options were skipped');
    expect(selectedLine(frame)).toContain('POST');
    expect(selectedLine(frame)).toContain('/warned');
  });

  it('p with non-curl clipboard text refuses with an error and leaves the request list unchanged', async () => {
    const { stdin, lastFrame } = renderApp({
      requests: [initialRequest],
      clipboardReadRunner: clipboardContaining('SELECT * FROM users;'),
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'p');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Clipboard is not a curl command');
    expect(frame).not.toContain('Pasted request');
    expect(selectedLine(frame)).toContain('/users');
  });

  it('p with chained commands refuses with a multiple-commands error and leaves the request list unchanged', async () => {
    const { stdin, lastFrame } = renderApp({
      requests: [initialRequest],
      clipboardReadRunner: clipboardContaining(
        "curl 'https://a.example.com' && curl 'https://b.example.com'",
      ),
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'p');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Clipboard contains multiple commands');
    expect(frame).not.toContain('Pasted request');
    expect(selectedLine(frame)).toContain('/users');
  });

  it('p when the clipboard cannot be read shows the read error and leaves the request list unchanged', async () => {
    const { stdin, lastFrame } = renderApp({
      requests: [initialRequest],
      clipboardReadRunner: async () => {
        throw new ClipboardError(
          'Could not read clipboard: no clipboard tool found. Install xclip, xsel, or wl-clipboard (provides wl-paste).',
        );
      },
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'p');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Could not read clipboard');
    expect(frame).not.toContain('Pasted request');
    expect(selectedLine(frame)).toContain('/users');
  });

  it('p in edit mode types into the edit buffer and does not read the clipboard', async () => {
    const calls: string[] = [];
    const { stdin, lastFrame } = renderApp({
      requests: [initialRequest],
      clipboardReadRunner: recordingClipboard(calls, "curl 'https://api.example.com/pinged'"),
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    expect(lastFrame() ?? '').toContain('Edit Request');

    await press(stdin, 'p');

    expect(calls).toHaveLength(0);
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Pasted request');
    expect(frame).toContain('https://api.example.com/usersp');
  });

  it('p while the help overlay is open keeps the overlay and does not read the clipboard', async () => {
    const calls: string[] = [];
    const { stdin, lastFrame } = renderApp({
      requests: [initialRequest],
      clipboardReadRunner: recordingClipboard(calls, "curl 'https://api.example.com/pinged'"),
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, '?');

    await press(stdin, 'p');

    expect(calls).toHaveLength(0);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Paste curl to request list');
    expect(frame).not.toContain('Pasted request');
  });

  it('pasting the same command twice renders two appended rows', async () => {
    const { stdin, lastFrame } = renderApp({
      requests: [initialRequest],
      clipboardReadRunner: clipboardContaining("curl 'https://api.example.com/pinged'"),
    });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'p');
    await press(stdin, 'p');

    const frame = lastFrame() ?? '';
    const pastedRows = frame.split('\n').filter((line) => line.includes('/pinged'));
    expect(pastedRows).toHaveLength(2);
    expect(selectedLine(frame)).toContain('/pinged');
  });
});
