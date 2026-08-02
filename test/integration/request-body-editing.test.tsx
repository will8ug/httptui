import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from 'ink-testing-library';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  CTRL_S,
  ENTER,
  ESC,
  KEY_DELAY_MS,
  LEFT_ARROW,
  RIGHT_ARROW,
  UP_ARROW,
  delay,
  press,
  renderApp,
} from '../helpers/integration';
import type { FileVariable, ParsedRequest } from '../../src/core/types';

afterEach(() => {
  cleanup();
});

function makeBodyRequest(body: string = 'original-body'): ParsedRequest[] {
  return [
    {
      name: 'create',
      method: 'POST' as const,
      url: 'https://example.com/users',
      headers: {},
      body,
      lineNumber: 1,
    },
  ];
}

describe('request body editing integration', () => {
  it('e opens the body editor showing the raw body and Edit Body title', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeBodyRequest('{"name":"Alice"}') });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Edit Body');
    expect(frame).toContain('{"name":"Alice"}');
    expect(frame).toContain('Ctrl+S to save, Esc to cancel');
  });

  it('typing then Ctrl+S commits and the change shows in the details panel', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeBodyRequest('{"name":"Alice"}') });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    await press(stdin, 'X');
    await press(stdin, CTRL_S);

    expect(lastFrame() ?? '').not.toContain('Edit Body');
    expect(lastFrame() ?? '').toContain('Body updated');

    await press(stdin, 'd');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Request Details');
    expect(frame).toContain('{"name":"Alice"}X');
  });

  it('Escape discards the edit and reopening shows the original body', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeBodyRequest('original-body') });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    await press(stdin, 'X');
    await press(stdin, ESC);

    expect(lastFrame() ?? '').not.toContain('Edit Body');

    await press(stdin, 'e');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Edit Body');
    expect(frame).toContain('original-body');
    expect(frame).not.toContain('original-bodyX');
  });

  it('Enter inserts a newline and keeps the overlay open', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeBodyRequest('abc') });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    await press(stdin, ENTER);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Edit Body');
    expect(frame).toContain('Ctrl+S to save, Esc to cancel');
  });

  it('left and right arrows move the cursor for mid-buffer insertion', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeBodyRequest('abc') });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    await press(stdin, LEFT_ARROW);
    await press(stdin, LEFT_ARROW);
    await press(stdin, 'X');
    await press(stdin, RIGHT_ARROW);
    await press(stdin, 'Y');
    await press(stdin, CTRL_S);

    await press(stdin, 'd');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('aXbYc');
  });

  it('e on a form-data request shows the not-supported message and does not open the editor', async () => {
    const requests: ParsedRequest[] = [
      {
        name: 'upload',
        method: 'POST' as const,
        url: 'https://example.com/upload',
        headers: { 'Content-Type': 'multipart/form-data; boundary=---' },
        body: undefined,
        formdataFields: [{ key: 'file', value: 'data', type: 'text' as const }],
        lineNumber: 1,
      },
    ];
    const { stdin, lastFrame } = renderApp({ requests });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Edit Body');
    expect(frame).toContain('form-data request body is not supported to edit for now');
  });

  it('editor shows the raw {{host}} placeholder while the details panel shows the resolved value', async () => {
    const requests: ParsedRequest[] = [
      {
        name: 'create',
        method: 'POST' as const,
        url: 'https://{{host}}/users',
        headers: {},
        body: '{"host":"{{host}}"}',
        lineNumber: 1,
      },
    ];
    const variables: FileVariable[] = [{ name: 'host', value: 'example.com' }];
    const { stdin, lastFrame } = renderApp({ requests, variables });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    const editorFrame = lastFrame() ?? '';
    expect(editorFrame).toContain('Edit Body');
    expect(editorFrame).toContain('{{host}}');
    expect(editorFrame).not.toContain('example.com');

    await press(stdin, ESC);

    await press(stdin, 'd');
    const detailsFrame = lastFrame() ?? '';
    expect(detailsFrame).toContain('Request Details');
    expect(detailsFrame).toContain('example.com');
    expect(detailsFrame).not.toContain('{{host}}');
  });

  it('committing an edit then S writes the edited body to the exported .http file', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-edit-export-'));
    try {
      const requests = makeBodyRequest('original-body');
      const filePath = join(tmpDir, 'collection.json');
      const { stdin } = renderApp({ filePath, requests });
      await delay(KEY_DELAY_MS);

      await press(stdin, 'e');
      for (const char of 'XYZ') {
        await press(stdin, char);
      }
      await press(stdin, CTRL_S);

      await press(stdin, 'S');
      await press(stdin, ENTER);

      const expectedPath = join(tmpDir, 'collection.http');
      expect(existsSync(expectedPath)).toBe(true);
      const content = readFileSync(expectedPath, 'utf8');
      expect(content).toContain('original-bodyXYZ');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('scrolls the viewport to follow the cursor in a body taller than the overlay', async () => {
    const longBody = Array.from({ length: 20 }, (_, i) => `line-${i}`).join('\n');
    const { stdin, lastFrame } = renderApp({ requests: makeBodyRequest(longBody) });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');

    const atEnd = lastFrame() ?? '';
    expect(atEnd).toContain('line-19');
    expect(atEnd).not.toContain('line-0');

    for (let i = 0; i < 19; i += 1) {
      await press(stdin, UP_ARROW);
    }

    const atTop = lastFrame() ?? '';
    expect(atTop).toContain('line-0');
    expect(atTop).not.toContain('line-19');
  });

  it('inserts newlines when a multi-line body is pasted as one chunk', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeBodyRequest('') });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    await press(stdin, '{"a":1,\n"b":2}');
    await press(stdin, CTRL_S);
    await press(stdin, 'd');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('"a":1,');
    expect(frame).toContain('"b":2}');
  });
});
