import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from 'ink-testing-library';

import { KEY_DELAY_MS, delay, makeShortUrlRequests, press, renderApp, selectedLine } from '../helpers/integration';

const ESCAPE = '\u001B';

afterEach(() => {
  cleanup();
});

function expectAppStillRendering(frame: string): void {
  expect(frame).toContain('[Enter] Send');
  expect(frame).toContain('test.http');
  expect(selectedLine(frame)).toContain('/u/1');
}

describe('toggles integration — help overlay', () => {
  it('? opens help overlay', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(3) });
    await delay(KEY_DELAY_MS);

    await press(stdin, '?');

    const frame = lastFrame() ?? '';

    expect(frame).toContain('Toggle request details panel');
    expect(frame).toContain('Jump to top of focused panel');
  });

  it('? closes help overlay when already open', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(3) });
    await delay(KEY_DELAY_MS);

    await press(stdin, '?');
    await press(stdin, '?');

    const frame = lastFrame() ?? '';

    expect(frame).not.toContain('Toggle request details panel');
    expect(frame).not.toContain('Jump to top of focused panel');
    expectAppStillRendering(frame);
  });

  it('Esc closes help overlay', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(3) });
    await delay(KEY_DELAY_MS);

    await press(stdin, '?');
    await press(stdin, ESCAPE);

    const frame = lastFrame() ?? '';

    expect(frame).not.toContain('Toggle request details panel');
    expect(frame).not.toContain('Jump to top of focused panel');
    expectAppStillRendering(frame);
  });
});

describe('toggles integration — response view toggles without a loaded response', () => {
  it('v toggles verbose without breaking rendering', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(3) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'v');

    expectAppStillRendering(lastFrame() ?? '');
  });

  it('w toggles wrap without breaking rendering', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(3) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'w');

    expectAppStillRendering(lastFrame() ?? '');
  });

  it('r toggles raw mode without breaking rendering', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(3) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'r');

    expectAppStillRendering(lastFrame() ?? '');
  });
});

describe('toggles integration — details panel', () => {
  it('d toggles details panel visibility', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(3) });
    await delay(KEY_DELAY_MS);

    expect(lastFrame() ?? '').not.toContain('Request Details');

    await press(stdin, 'd');
    const detailsOpenFrame = lastFrame() ?? '';

    expect(detailsOpenFrame).toContain('Request Details');
    expect(detailsOpenFrame).toContain('GET https://a.co/u/1');

    await press(stdin, 'd');
    const detailsClosedFrame = lastFrame() ?? '';

    expect(detailsClosedFrame).not.toContain('Request Details');
    expectAppStillRendering(detailsClosedFrame);
  });
});
