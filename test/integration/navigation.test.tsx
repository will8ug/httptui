import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from 'ink-testing-library';

import {
  KEY_DELAY_MS,
  delay,
  makeShortUrlRequests,
  press,
  renderApp,
  selectedLine,
} from '../helpers/integration';

const UP_ARROW = '\u001B[A';
const DOWN_ARROW = '\u001B[B';
const TAB = '\t';

afterEach(() => {
  cleanup();
});

describe('navigation integration — requests panel selection', () => {
  it('j moves selection down in requests panel', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(5) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'j');

    expect(selectedLine(lastFrame() ?? '')).toContain('/u/2');
  });

  it('k moves selection up in requests panel', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(5) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'j');
    await press(stdin, 'j');
    await press(stdin, 'k');

    expect(selectedLine(lastFrame() ?? '')).toContain('/u/2');
  });

  it('down arrow behaves like j', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(5) });
    await delay(KEY_DELAY_MS);

    // Ink surfaces arrows via key.downArrow; the test renderer receives the same input through raw ANSI escapes.
    await press(stdin, DOWN_ARROW);

    expect(selectedLine(lastFrame() ?? '')).toContain('/u/2');
  });

  it('up arrow behaves like k', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(5) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'j');
    await press(stdin, 'j');
    await press(stdin, UP_ARROW);

    expect(selectedLine(lastFrame() ?? '')).toContain('/u/2');
  });

  it('selection is clamped at top', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(5) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'k');

    expect(selectedLine(lastFrame() ?? '')).toContain('/u/1');
  });

  it('selection is clamped at bottom', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(5) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'j');
    await press(stdin, 'j');
    await press(stdin, 'j');
    await press(stdin, 'j');
    expect(selectedLine(lastFrame() ?? '')).toContain('/u/5');

    await press(stdin, 'j');

    expect(selectedLine(lastFrame() ?? '')).toContain('/u/5');
  });
});

describe('navigation integration — panel focus cycling', () => {
  it('Tab cycles focus requests → response → requests when details hidden', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(3) });
    await delay(KEY_DELAY_MS);

    expect(selectedLine(lastFrame() ?? '')).toContain('/u/1');

    await press(stdin, TAB);
    // `lastFrame()` does not expose enough focus styling to distinguish panels reliably,
    // so we infer focus from behavior: while response is focused, `j` no longer moves the request selection.
    await press(stdin, 'j');
    expect(selectedLine(lastFrame() ?? '')).toContain('/u/1');

    await press(stdin, TAB);
    await press(stdin, 'j');
    expect(selectedLine(lastFrame() ?? '')).toContain('/u/2');

    await press(stdin, TAB);
    await press(stdin, 'k');
    expect(selectedLine(lastFrame() ?? '')).toContain('/u/2');
  });

  it('Tab cycles requests → details → response → requests when details visible', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(3) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'd');
    expect((lastFrame() ?? '')).toContain('Request Details');
    expect(selectedLine(lastFrame() ?? '')).toContain('/u/1');

    await press(stdin, TAB);
    await press(stdin, 'j');
    expect((lastFrame() ?? '')).toContain('Request Details');
    expect(selectedLine(lastFrame() ?? '')).toContain('/u/1');

    await press(stdin, TAB);
    await press(stdin, 'j');
    expect((lastFrame() ?? '')).toContain('Request Details');
    expect(selectedLine(lastFrame() ?? '')).toContain('/u/1');

    await press(stdin, TAB);
    await press(stdin, 'j');
    expect((lastFrame() ?? '')).toContain('Request Details');
    expect(selectedLine(lastFrame() ?? '')).toContain('/u/2');
  });
});
