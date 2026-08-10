import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from 'ink-testing-library';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseHttpFile } from '../../src/core/parser';
import {
  CTRL_S,
  ENTER,
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

function makeUrlRequest(url: string = 'https://example.com/users'): ParsedRequest[] {
  return [
    {
      name: 'create',
      method: 'POST' as const,
      url,
      headers: {},
      body: '{"name":"Alice"}',
      lineNumber: 1,
      isDirty: false,
    },
  ];
}

function makeFormDataRequest(): ParsedRequest[] {
  return [
    {
      name: 'upload',
      method: 'POST' as const,
      url: 'https://example.com/upload',
      headers: { 'Content-Type': 'multipart/form-data; boundary=---' },
      body: undefined,
      formdataFields: [{ key: 'file', value: 'data', type: 'text' as const }],
      lineNumber: 1,
      isDirty: false,
    },
  ];
}

describe('request URL editing integration', () => {
  it('e opens the editor with the URL tab active and the raw URL seeded', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeUrlRequest('https://example.com/users') });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');

    const frame = lastFrame() ?? '';
    expect(frame).toContain('Edit Request');
    expect(frame).toContain('https://example.com/users');
    expect(frame).toContain('Shift+Tab to switch, Ctrl+S to save, Esc to cancel');
  });

  it('shows the raw {{var}} placeholder in the URL tab while the details panel shows the resolved value', async () => {
    const requests = makeUrlRequest('https://{{host}}/users');
    const variables: FileVariable[] = [{ name: 'host', value: 'example.com' }];
    const { stdin, lastFrame } = renderApp({ requests, variables });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
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

  it('typing in the URL tab and Ctrl+S updates the request; the details panel shows the edited URL', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeUrlRequest('https://example.com/users') });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    await press(stdin, 'X');
    await press(stdin, CTRL_S);

    expect(lastFrame() ?? '').not.toContain('Edit Request');
    expect(lastFrame() ?? '').toContain('Request updated');

    await press(stdin, 'd');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Request Details');
    expect(frame).toContain('https://example.com/usersX');
  });

  it('Shift+Tab switches to the body tab and back, preserving in-progress edits in both buffers', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeUrlRequest('https://example.com/users') });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    await press(stdin, 'X');

    await press(stdin, SHIFT_TAB);
    expect(lastFrame() ?? '').toContain('{"name":"Alice"}');

    await press(stdin, 'Y');

    await press(stdin, SHIFT_TAB);
    expect(lastFrame() ?? '').toContain('https://example.com/usersX');

    await press(stdin, CTRL_S);
    expect(lastFrame() ?? '').toContain('Request updated');

    await press(stdin, 'd');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('https://example.com/usersX');
    expect(frame).toContain('{"name":"Alice"}Y');
  });

  it('Enter is a no-op in the URL tab', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeUrlRequest('https://example.com/users') });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    await press(stdin, ENTER);
    await press(stdin, 'Z');
    await press(stdin, CTRL_S);

    await press(stdin, 'd');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('https://example.com/usersZ');
  });

  it('pasted input containing newlines lands in the URL buffer with newlines stripped', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeUrlRequest('https://a.com') });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    await press(stdin, '\n/x');
    await press(stdin, CTRL_S);

    await press(stdin, 'd');
    const frame = lastFrame() ?? '';
    expect(frame).toContain('https://a.com/x');
  });

  it('on a form-data request: e opens the editor, SHIFT_TAB shows the refusal message, URL tab stays active', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeFormDataRequest() });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    const editorFrame = lastFrame() ?? '';
    expect(editorFrame).toContain('Edit Request');
    expect(editorFrame).toContain('https://example.com/upload');

    await press(stdin, SHIFT_TAB);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('form-data request body is not supported to edit for now');
    expect(frame).toContain('https://example.com/upload');
  });

  it('on a form-data request: the refusal message auto-clears while the editor stays open', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeFormDataRequest() });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    await press(stdin, SHIFT_TAB);
    expect(lastFrame() ?? '').toContain('form-data request body is not supported to edit for now');

    await delay(2200);

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('form-data request body is not supported to edit for now');
    expect(frame).toContain('Edit Request');
  });

  it('on a form-data request: editing the URL and Ctrl+S still commits with dirty marker set', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-formdata-url-'));
    try {
      const filePath = join(tmpDir, 'collection.json');
      const { stdin, lastFrame } = renderApp({ filePath, requests: makeFormDataRequest() });
      await delay(KEY_DELAY_MS);

      await press(stdin, 'e');
      await press(stdin, 'X');
      await press(stdin, CTRL_S);

      expect(lastFrame() ?? '').toContain('Request updated');
      expect(lastFrame() ?? '').toContain('*collection.json');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('a no-op commit shows no transient message and sets no dirty marker', async () => {
    const { stdin, lastFrame } = renderApp({ requests: makeUrlRequest('https://example.com/users') });
    await delay(KEY_DELAY_MS);

    await press(stdin, 'e');
    await press(stdin, CTRL_S);

    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('Edit Request');
    expect(frame).not.toContain('Request updated');
    expect(frame).not.toContain('*test.http');
  });

  it('save-as writes the edited URL to the exported .http file', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-url-export-'));
    try {
      const requests = makeUrlRequest('https://old.example.com/users');
      const filePath = join(tmpDir, 'collection.json');
      const { stdin } = renderApp({ filePath, requests });
      await delay(KEY_DELAY_MS);

      await press(stdin, 'e');
      for (const char of 'staging') {
        await press(stdin, char);
      }
      await press(stdin, CTRL_S);

      await press(stdin, 'S');
      await press(stdin, ENTER);

      const expectedPath = join(tmpDir, 'collection.http');
      expect(existsSync(expectedPath)).toBe(true);
      const content = readFileSync(expectedPath, 'utf8');
      expect(content).toContain('POST https://old.example.com/usersstaging');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('in-place save writes the edited URL into the source file leaving other blocks unchanged', async () => {
    const httpContent = [
      '@host = example.com',
      '',
      '### Get users',
      'GET https://{{host}}/users',
      '',
      '### Create user',
      'POST https://{{host}}/users',
      'Content-Type: application/json',
      '',
      '{"name":"John"}',
      '',
    ].join('\n');

    const tmpDir = mkdtempSync(join(tmpdir(), 'httptui-url-inplace-'));
    try {
      const filePath = join(tmpDir, 'collection.http');
      writeFileSync(filePath, httpContent, 'utf8');
      const parsed = parseHttpFile(httpContent);

      const { stdin, lastFrame } = renderApp({ filePath, requests: parsed.requests, variables: parsed.variables });
      await delay(KEY_DELAY_MS);

      await press(stdin, 'j');

      await press(stdin, 'e');
      for (const char of 'staging') {
        await press(stdin, char);
      }
      await press(stdin, CTRL_S);

      expect(lastFrame() ?? '').toContain('*collection.http');

      await press(stdin, CTRL_S);
      expect(lastFrame() ?? '').toContain('Confirm overriding');

      await press(stdin, 'y');

      expect(lastFrame() ?? '').not.toContain('Confirm overriding');
      expect(lastFrame() ?? '').toContain('Saved');

      const newContent = readFileSync(filePath, 'utf8');
      expect(newContent).toContain('POST https://{{host}}/usersstaging');

      const originalLines = httpContent.split('\n');
      const newLines = newContent.split('\n');

      const getUserStart = originalLines.findIndex(l => l.startsWith('### Get users'));
      const getUserEnd = originalLines.findIndex((l, i) => i > getUserStart && l.startsWith('### '));
      const getUserBlock = originalLines.slice(getUserStart, getUserEnd).join('\n');

      expect(newContent).toContain(getUserBlock);
      expect(newContent).toContain('@host = example.com');
      expect(newContent).toContain('{"name":"John"}');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});