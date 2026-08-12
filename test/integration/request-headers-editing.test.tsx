import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from 'ink-testing-library';

import {
  CTRL_S,
  ESC,
  KEY_DELAY_MS,
  SHIFT_TAB,
  delay,
  press,
  renderApp,
} from '../helpers/integration';
import type { FileVariable, ParsedRequest } from '../../src/core/types';

afterEach(() => {
  cleanup();
});

function makeHeadersRequest(
  headers: Record<string, string> = { Accept: 'application/json', Authorization: 'Bearer {{token}}' },
): ParsedRequest[] {
  return [
    {
      name: 'create',
      method: 'POST' as const,
      url: 'https://example.com/users',
      headers,
      body: '{"name":"Alice"}',
      lineNumber: 1,
      isDirty: false,
    },
  ];
}

describe('request headers editing integration', () => {
  it('e opens the editor and two Shift+Tab presses land on the headers tab with raw placeholders seeded', async () => {
    const requests = makeHeadersRequest();
    const variables: FileVariable[] = [{ name: 'token', value: 'secret123' }];
    const { stdin, lastFrame } = renderApp({ requests, variables });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    await press(stdin, SHIFT_TAB);
    await press(stdin, SHIFT_TAB);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Edit Request');
    expect(frame).toContain('headers');
    expect(frame).toContain('Accept: application/json');
    expect(frame).toContain('Authorization: Bearer {{token}}');
    expect(frame).not.toContain('Bearer secret123');
  });

  it('editing a header value and Ctrl+S updates the request; the details panel shows the resolved header', async () => {
    const requests = makeHeadersRequest();
    const variables: FileVariable[] = [{ name: 'token', value: 'secret123' }];
    const { stdin, lastFrame } = renderApp({ requests, variables });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    await press(stdin, SHIFT_TAB);
    await press(stdin, SHIFT_TAB);

    await press(stdin, '\u001B[4~');
    await press(stdin, '\n');
    await press(stdin, 'X-Custom: new-value');

    await press(stdin, CTRL_S);

    expect(lastFrame() ?? '').not.toContain('Edit Request');
    expect(lastFrame() ?? '').toContain('Request updated');

    await press(stdin, 'd');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Request Details');
    expect(frame).toContain('X-Custom: new-value');
  });

  it('a malformed header line without a colon keeps the overlay open and shows a transient error', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeHeadersRequest() });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    await press(stdin, SHIFT_TAB);
    await press(stdin, SHIFT_TAB);

    await press(stdin, '\u001B[4~');
    await press(stdin, '\n');
    await press(stdin, 'malformed line without colon');

    await press(stdin, CTRL_S);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Edit Request');
    expect(frame).toContain('Cannot save: header line 3 is missing a ":"');

    await press(stdin, ESC);

    expect(lastFrame() ?? '').not.toContain('Edit Request');
    expect(lastFrame() ?? '').not.toContain('Request updated');
  });
});
