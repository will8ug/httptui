import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from 'ink-testing-library';

import { App } from '../src/app';
import type { ParsedRequest } from '../src/core/types';

const KEY_DELAY_MS = 50;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function press(stdin: { write: (data: string) => void }, key: string): Promise<void> {
  await delay(KEY_DELAY_MS);
  stdin.write(key);
  await delay(KEY_DELAY_MS);
}

function makeShortUrlRequests(count: number): ParsedRequest[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `r${i + 1}`,
    method: 'GET' as const,
    url: `https://a.co/u/${i + 1}`,
    headers: {},
    body: undefined,
    lineNumber: i + 1,
  }));
}

function makeLongUrlRequests(count: number): ParsedRequest[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `r${i + 1}`,
    method: 'GET' as const,
    url: `https://api.example.com/resource/item-${i + 1}/nested/path/that/exceeds/panel/width`,
    headers: {},
    body: undefined,
    lineNumber: i + 1,
  }));
}

function renderApp(requests: ParsedRequest[]) {
  return render(
    <App
      filePath="test.http"
      requests={requests}
      variables={[]}
      executorConfig={{ insecure: false }}
    />,
  );
}

function selectedLine(frame: string): string {
  const line = frame.split('\n').find((l) => l.includes('▸'));
  if (!line) {
    throw new Error(`No selected line (▸) found in frame:\n${frame}`);
  }
  return line;
}

afterEach(() => {
  cleanup();
});

describe('edge-jump integration — requests panel selection', () => {
  it('g jumps selection back to the first request', async () => {
    const { stdin, lastFrame } = renderApp(makeShortUrlRequests(6));
    await delay(KEY_DELAY_MS);

    await press(stdin, 'j');
    await press(stdin, 'j');
    await press(stdin, 'j');

    expect(selectedLine(lastFrame() ?? '')).toContain('/u/4');

    await press(stdin, 'g');

    expect(selectedLine(lastFrame() ?? '')).toContain('/u/1');
  });

  it('G jumps selection to the last request', async () => {
    const { stdin, lastFrame } = renderApp(makeShortUrlRequests(6));
    await delay(KEY_DELAY_MS);

    expect(selectedLine(lastFrame() ?? '')).toContain('/u/1');

    await press(stdin, 'G');

    expect(selectedLine(lastFrame() ?? '')).toContain('/u/6');
  });
});

describe('edge-jump integration — horizontal shift', () => {
  it('$ shifts the requests panel horizontally, 0 resets it', async () => {
    const { stdin, lastFrame } = renderApp(makeLongUrlRequests(3));
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
    const { stdin, lastFrame } = renderApp(makeShortUrlRequests(3));
    await delay(KEY_DELAY_MS);

    await press(stdin, '?');
    const frame = lastFrame() ?? '';

    expect(frame).toContain('Keyboard Shortcuts');
    expect(frame).toContain('Jump to top of focused panel');
    expect(frame).toContain('Jump to bottom of focused panel');
    expect(frame).toContain('Jump to horizontal start of focused panel');
    expect(frame).toContain('Jump to horizontal end of focused panel');
  });
});

describe('edge-jump integration — status bar budget', () => {
  it('status bar does NOT contain edge-jump key hints', async () => {
    const { lastFrame } = renderApp(makeShortUrlRequests(3));
    await delay(KEY_DELAY_MS);

    const frame = lastFrame() ?? '';

    expect(frame).not.toContain('[g]');
    expect(frame).not.toContain('[G]');
    expect(frame).not.toContain('[0]');
    expect(frame).not.toContain('[$]');
  });

  it('status bar still contains the six expected bar-visible shortcuts', async () => {
    const { lastFrame } = renderApp(makeShortUrlRequests(3));
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
