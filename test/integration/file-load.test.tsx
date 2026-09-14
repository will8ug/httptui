import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from 'ink-testing-library';

import {
  ENTER,
  KEY_DELAY_MS,
  LEFT_ARROW,
  TAB,
  delay,
  makeShortUrlRequests,
  press,
  renderApp,
} from '../helpers/integration';

afterEach(() => {
  cleanup();
});

describe('file-load integration', () => {
  it('Enter with non-existent path shows error', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    stdin.write('./does-not-exist.http');
    await delay(KEY_DELAY_MS * 2);
    await press(stdin, ENTER);

    expect(lastFrame() ?? '').toMatch(/not found/i);
  });
});

describe('file-load tab completion', () => {
  const fixtureDir = 'test/fixtures/tab-complete';

  it('completes a single matching directory with a trailing separator and chains into it', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    stdin.write(`${fixtureDir}/ad`);
    await delay(KEY_DELAY_MS);
    await press(stdin, TAB);

    expect(lastFrame() ?? '').toContain(`${fixtureDir}/admin/`);

    await press(stdin, TAB);

    expect(lastFrame() ?? '').toContain(`${fixtureDir}/admin/routes.http`);
  });

  it('extends multiple matches to the longest common prefix without listing candidates', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    stdin.write(`${fixtureDir}/u`);
    await delay(KEY_DELAY_MS);
    await press(stdin, TAB);

    const frame = lastFrame() ?? '';
    expect(frame).toContain(`${fixtureDir}/users`);
    expect(frame).not.toContain('users.http');
  });

  it('lists candidates when a second Tab makes no further progress', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    stdin.write(`${fixtureDir}/u`);
    await delay(KEY_DELAY_MS);
    await press(stdin, TAB);
    await press(stdin, TAB);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('users-staging.http');
    expect(frame).toContain('users.http');
  });

  it('clears the candidate list when typing continues', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    stdin.write(`${fixtureDir}/u`);
    await delay(KEY_DELAY_MS);
    await press(stdin, TAB);
    await press(stdin, TAB);
    expect(lastFrame() ?? '').toContain('users-staging.http');

    await press(stdin, '-');

    const frame = lastFrame() ?? '';
    expect(frame).toContain(`${fixtureDir}/users-`);
    expect(frame).not.toContain('users-staging.http');
  });

  it('clears the candidate list when the cursor moves', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    stdin.write(`${fixtureDir}/u`);
    await delay(KEY_DELAY_MS);
    await press(stdin, TAB);
    await press(stdin, TAB);
    expect(lastFrame() ?? '').toContain('users-staging.http');

    await press(stdin, LEFT_ARROW);

    const frame = lastFrame() ?? '';
    expect(frame).toContain(`${fixtureDir}/users`);
    expect(frame).not.toContain('users-staging.http');
  });

  it('leaves the input unchanged and shows no error when nothing matches', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeShortUrlRequests(1) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'o');
    stdin.write(`${fixtureDir}/zzz`);
    await delay(KEY_DELAY_MS);
    await press(stdin, TAB);

    const frame = lastFrame() ?? '';
    expect(frame).toContain(`${fixtureDir}/zzz`);
    expect(frame).not.toMatch(/not found/i);
  });
});
