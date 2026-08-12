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
  SHIFT_TAB,
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
      isDirty: false,
    },
  ];
}

describe('request body editing integration', () => {
  it('e opens the editor on the URL tab; Shift+Tab switches to the body tab showing the raw body', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeBodyRequest('{"name":"Alice"}') });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    expect(lastFrame() ?? '').toContain('Edit Request');

    await press(stdin, SHIFT_TAB);
    await press(stdin, SHIFT_TAB);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Edit Request');
    expect(frame).toContain('{"name":"Alice"}');
    expect(frame).toContain('Shift+Tab to switch, Ctrl+S to save, Esc to cancel');
  });

  it('typing then Ctrl+S commits and the change shows in the details panel', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeBodyRequest('{"name":"Alice"}') });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    await press(stdin, SHIFT_TAB);
    await press(stdin, SHIFT_TAB);
    await press(stdin, 'X');
    await press(stdin, CTRL_S);

    expect(lastFrame() ?? '').not.toContain('Edit Request');
    expect(lastFrame() ?? '').toContain('Request updated');

    await press(stdin, 'd');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Request Details');
    expect(frame).toContain('{"name":"Alice"}X');
  });

  it('Ctrl+S without edits closes the editor without showing Request updated', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeBodyRequest('{"name":"Alice"}') });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    await press(stdin, SHIFT_TAB);
    await press(stdin, SHIFT_TAB);
    expect(lastFrame() ?? '').toContain('Edit Request');

    await press(stdin, CTRL_S);

    expect(lastFrame() ?? '').not.toContain('Edit Request');
    expect(lastFrame() ?? '').not.toContain('Request updated');
  });

  it('Escape discards the edit and reopening shows the original body', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeBodyRequest('original-body') });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    await press(stdin, SHIFT_TAB);
    await press(stdin, SHIFT_TAB);
    await press(stdin, 'X');
    await press(stdin, ESC);

    expect(lastFrame() ?? '').not.toContain('Edit Request');

    await press(stdin, 'e');
    await press(stdin, SHIFT_TAB);
    await press(stdin, SHIFT_TAB);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Edit Request');
    expect(frame).toContain('original-body');
    expect(frame).not.toContain('original-bodyX');
  });

  it('Enter inserts a newline and keeps the overlay open', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeBodyRequest('abc') });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    await press(stdin, SHIFT_TAB);
    await press(stdin, SHIFT_TAB);
    await press(stdin, ENTER);

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Edit Request');
    expect(frame).toContain('Shift+Tab to switch, Ctrl+S to save, Esc to cancel');
  });

  it('left and right arrows move the cursor for mid-buffer insertion', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeBodyRequest('abc') });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    await press(stdin, SHIFT_TAB);
    await press(stdin, SHIFT_TAB);
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

  it('editor shows the raw {{host}} placeholder while the details panel shows the resolved value', async () => {
    const requests: ParsedRequest[] = [
      {
        name: 'create',
        method: 'POST' as const,
        url: 'https://{{host}}/users',
        headers: {},
        body: '{"host":"{{host}}"}',
        lineNumber: 1,
        isDirty: false,
      },
    ];
    const variables: FileVariable[] = [{ name: 'host', value: 'example.com' }];
    const { stdin, lastFrame } = renderApp({ requests, variables });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    await press(stdin, SHIFT_TAB);
    await press(stdin, SHIFT_TAB);
    const editorFrame = lastFrame() ?? '';
    expect(editorFrame).toContain('Edit Request');
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
      await press(stdin, SHIFT_TAB);
      await press(stdin, SHIFT_TAB);
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
    await press(stdin, SHIFT_TAB);
    await press(stdin, SHIFT_TAB);

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
    await press(stdin, SHIFT_TAB);
    await press(stdin, SHIFT_TAB);
    await press(stdin, '{"a":1,\n"b":2}');
    await press(stdin, CTRL_S);
    await press(stdin, 'd');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('"a":1,');
    expect(frame).toContain('"b":2}');
  });
});