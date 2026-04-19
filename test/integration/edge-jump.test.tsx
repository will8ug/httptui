import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from 'ink-testing-library';

import {
  KEY_DELAY_MS,
  delay,
  makeLongUrlRequests,
  makeShortUrlRequests,
  press,
  renderApp,
  selectedLine,
} from '../helpers/integration';

afterEach(() => {
  cleanup();
});

describe('edge-jump integration — requests panel selection', () => {
  it('g jumps selection back to the first request', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(6) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'j');
    await press(stdin, 'j');
    await press(stdin, 'j');

    expect(selectedLine(lastFrame() ?? '')).toContain('/u/4');

    await press(stdin, 'g');

    expect(selectedLine(lastFrame() ?? '')).toContain('/u/1');
  });

  it('G jumps selection to the last request', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(6) });
    await delay(KEY_DELAY_MS);

    expect(selectedLine(lastFrame() ?? '')).toContain('/u/1');

    await press(stdin, 'G');

    expect(selectedLine(lastFrame() ?? '')).toContain('/u/6');
  });
});

describe('edge-jump integration — horizontal shift', () => {
  it('$ shifts the requests panel horizontally, 0 resets it', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeLongUrlRequests(3) });
    await delay(KEY_DELAY_MS);

    const initialFrame = lastFrame() ?? '';

    await press(stdin, '$');
    const shiftedFrame = lastFrame() ?? '';

    expect(shiftedFrame).not.toEqual(initialFrame);

    await press(stdin, '0');
    const resetFrame = lastFrame() ?? '';

    expect(resetFrame).toEqual(initialFrame);
  });
});

describe('edge-jump integration — help overlay', () => {
  it('? opens help overlay containing all four edge-jump shortcut descriptions', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(3) });
    await delay(KEY_DELAY_MS);

    await press(stdin, '?');
    const frame = lastFrame() ?? '';

    expect(frame).toContain('Jump to top of focused panel');
    expect(frame).toContain('Jump to bottom of focused panel');
    expect(frame).toContain('Jump to horizontal start of focused panel');
    expect(frame).toContain('Jump to horizontal end of focused panel');
  });
});

describe('edge-jump integration — status bar budget', () => {
  it('status bar does NOT contain edge-jump key hints', async () => {
    const { lastFrame } = renderApp({ requests: makeShortUrlRequests(3) });
    await delay(KEY_DELAY_MS);

    const frame = lastFrame() ?? '';

    expect(frame).not.toContain('[g]');
    expect(frame).not.toContain('[G]');
    expect(frame).not.toContain('[0]');
    expect(frame).not.toContain('[$]');
  });

  it('status bar still contains the six expected bar-visible shortcuts', async () => {
    const { lastFrame } = renderApp({ requests: makeShortUrlRequests(3) });
    await delay(KEY_DELAY_MS);

    const frame = lastFrame() ?? '';

    expect(frame).toContain('[Enter] Send');
    expect(frame).toContain('[h/j/k/l] Nav');
    expect(frame).toContain('[Tab] Panel');
    expect(frame).toContain('[v] Verbose');
    expect(frame).toContain('[q] Quit');
    expect(frame).toContain('[?] Help');
  });
});