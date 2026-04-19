import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from 'ink-testing-library';

import { KEY_DELAY_MS, delay, makeShortUrlRequests, press, renderApp } from '../helpers/integration';

const ESC = '\u001B';
const ENTER = '\r';
const BACKSPACE = '\u007F';

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
