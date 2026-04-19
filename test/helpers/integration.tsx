import React from 'react';
import { render } from 'ink-testing-library';

import { App } from '../../src/app';
import type { AppProps, ParsedRequest } from '../../src/core/types';

export const KEY_DELAY_MS = 50;

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function press(stdin: { write: (data: string) => void }, key: string): Promise<void> {
  await delay(KEY_DELAY_MS);
  stdin.write(key);
  await delay(KEY_DELAY_MS);
}

const defaultProps: AppProps = {
  filePath: 'test.http',
  requests: [],
  variables: [],
  executorConfig: { insecure: false },
};

export function renderApp(overrides: Partial<AppProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(
    <App
      filePath={props.filePath}
      requests={props.requests}
      variables={props.variables}
      executorConfig={props.executorConfig}
    />,
  );
}

export function selectedLine(frame: string): string {
  const line = frame.split('\n').find((l) => l.includes('▸'));
  if (!line) {
    throw new Error(`No selected line (▸) found in frame:\n${frame}`);
  }
  return line;
}

export function makeShortUrlRequests(count: number): ParsedRequest[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `r${i + 1}`,
    method: 'GET' as const,
    url: `https://a.co/u/${i + 1}`,
    headers: {},
    body: undefined,
    lineNumber: i + 1,
  }));
}

export function makeLongUrlRequests(count: number): ParsedRequest[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `r${i + 1}`,
    method: 'GET' as const,
    url: `https://api.example.com/resource/item-${i + 1}/nested/path/that/exceeds/panel/width`,
    headers: {},
    body: undefined,
    lineNumber: i + 1,
  }));
}