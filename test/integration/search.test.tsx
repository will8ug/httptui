import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from 'ink-testing-library';

import { KEY_DELAY_MS, delay, makeShortUrlRequests, press, renderApp, selectedLine } from '../helpers/integration';

// App can't receive a preloaded response, so these tests cover only no-response search guards.

const ESCAPE = '\u001B';

afterEach(() => {
  cleanup();
});

function expectAppStillRendering(frame: string): void {
  expect(frame).toContain('[Enter] Send');
  expect(frame).toContain('test.http');
  expect(selectedLine(frame)).toContain('/u/1');
}

describe('search integration — guarded no-response behavior', () => {
  it('/ is a no-op when no response is loaded', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(3) });
    await delay(KEY_DELAY_MS);

    const initialFrame = lastFrame() ?? '';

    await press(stdin, '/');

    const frame = lastFrame() ?? '';

    expect(frame).toEqual(initialFrame);
    expect(frame).not.toContain('(Esc to cancel)');
    expect(frame).not.toContain('(Esc to dismiss)');
    expectAppStillRendering(frame);
  });

  it('/ is accepted as text in the file-load overlay', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    await press(stdin, '/');

    const frame = lastFrame() ?? '';

    expect(frame).toContain('Open File');
    expect(frame).toContain('File: /');
  });

  it('Esc is a no-op in normal mode without search state', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(3) });
    await delay(KEY_DELAY_MS);

    const initialFrame = lastFrame() ?? '';

    await press(stdin, ESCAPE);

    const frame = lastFrame() ?? '';

    expect(frame).toEqual(initialFrame);
    expect(frame).not.toContain('(Esc to cancel)');
    expect(frame).not.toContain('(Esc to dismiss)');
    expectAppStillRendering(frame);
  });
});
