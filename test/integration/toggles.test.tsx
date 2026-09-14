import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from 'ink-testing-library';

import { KEY_DELAY_MS, delay, makeShortUrlRequests, press, renderApp, selectedLine } from '../helpers/integration';

afterEach(() => {
  cleanup();
});

function expectAppStillRendering(frame: string): void {
  expect(frame).toContain('[Enter] Send');
  expect(frame).toContain('test.http');
  expect(selectedLine(frame)).toContain('/u/1');
}

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
