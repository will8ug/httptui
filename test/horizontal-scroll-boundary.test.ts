import { describe, expect, it } from 'vitest';

import type { Action, AppState, ParsedRequest } from '../src/core/types';
import { getRequestContentWidth, getLeftPanelWidth, getResponseContentWidth } from '../src/utils/layout';
import { getRequestTarget } from '../src/utils/request';

function getMaxRequestLineWidth(requests: readonly ParsedRequest[]): number {
  if (requests.length === 0) {
    return 0;
  }

  return Math.max(...requests.map((r) => 2 + 7 + getRequestTarget(r.url).length));
}

function getMaxResponseLineWidth(state: Pick<AppState, 'response' | 'verbose'>): number {
  if (!state.response) {
    return 0;
  }

  const lines: string[] = [];
  const res = state.response;

  lines.push(`HTTP/1.1 ${res.statusCode} ${res.statusText}  ${Math.round(res.timing.durationMs)}ms`);

  if (state.verbose) {
    for (const [name, value] of Object.entries(res.headers)) {
      lines.push(`${name}: ${value}`);
    }
  }

  lines.push(...res.body.split('\n'));

  return Math.max(0, ...lines.map((l) => l.length));
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SCROLL_HORIZONTAL': {
      if (state.focusedPanel === 'response' && state.wrapMode === 'wrap') {
        return state;
      }

      const columns = action.columns ?? 80;
      const horizontalDelta = action.direction === 'left' ? -2 : 2;

      if (state.focusedPanel === 'response') {
        const contentWidth = getResponseContentWidth(columns);
        const maxOffset = Math.max(0, getMaxResponseLineWidth(state) - contentWidth);
        return {
          ...state,
          responseHorizontalOffset: Math.min(Math.max(0, state.responseHorizontalOffset + horizontalDelta), maxOffset),
        };
      }

      const contentWidth = getRequestContentWidth(columns);
      const maxOffset = Math.max(0, getMaxRequestLineWidth(state.requests) - contentWidth);
      return {
        ...state,
        requestHorizontalOffset: Math.min(Math.max(0, state.requestHorizontalOffset + horizontalDelta), maxOffset),
      };
    }

    default:
      return state;
  }
}

function createInitialState(overrides: Partial<AppState> = {}): AppState {
  return {
    requests: [],
    variables: [],
    selectedIndex: 0,
    focusedPanel: 'requests',
    response: null,
    isLoading: false,
    error: null,
    insecure: false,
    verbose: false,
    showHelp: false,
    filePath: 'test.http',
    responseScrollOffset: 0,
    requestScrollOffset: 0,
    requestHorizontalOffset: 0,
    responseHorizontalOffset: 0,
    reloadMessage: null,
    mode: 'normal',
    fileLoadInput: '',
    fileLoadError: null,
    wrapMode: 'nowrap',
    ...overrides,
  };
}

const longUrlRequests: ParsedRequest[] = [
  {
    name: 'Get users',
    method: 'GET',
    url: 'https://api.example.com/users/very-long-path/that/exceeds/panel/width',
    headers: {},
    body: undefined,
    lineNumber: 1,
  },
];

const shortUrlRequests: ParsedRequest[] = [
  {
    name: 'Get',
    method: 'GET',
    url: 'https://a.co/b',
    headers: {},
    body: undefined,
    lineNumber: 1,
  },
];

describe('Layout utilities', () => {
  it('getLeftPanelWidth returns proportional width clamped to [25, 36]', () => {
    expect(getLeftPanelWidth(80)).toBe(25);
    expect(getLeftPanelWidth(100)).toBe(30);
    expect(getLeftPanelWidth(200)).toBe(36);
  });

  it('getRequestContentWidth returns left panel width minus 4, min 10', () => {
    expect(getRequestContentWidth(100)).toBe(26); // leftPanelWidth(100)=30, 30-4=26
    expect(getRequestContentWidth(80)).toBe(21); // leftPanelWidth(80)=25, 25-4=21
  });

  it('getResponseContentWidth returns right panel content width, min 20', () => {
    expect(getResponseContentWidth(100)).toBe(64); // 100 - 30 - 6 = 64
    expect(getResponseContentWidth(80)).toBe(49); // 80 - 25 - 6 = 49
    expect(getResponseContentWidth(50)).toBe(20); // 50 - 25(max(15,25)) - 6 = 19, min 20
  });
});

describe('SCROLL_HORIZONTAL boundary (right-scroll stops at content edge)', () => {
  describe('request panel', () => {
    it('scrolls right by 2 on request panel', () => {
      const state = createInitialState({
        focusedPanel: 'requests',
        requests: longUrlRequests,
      });
      const result = reducer(state, { type: 'SCROLL_HORIZONTAL', direction: 'right', columns: 80 });

      expect(result.requestHorizontalOffset).toBe(2);
    });

    it('scrolls left by 2, clamped to 0', () => {
      const state = createInitialState({
        focusedPanel: 'requests',
        requestHorizontalOffset: 0,
        requests: longUrlRequests,
      });
      const result = reducer(state, { type: 'SCROLL_HORIZONTAL', direction: 'left', columns: 80 });

      expect(result.requestHorizontalOffset).toBe(0);
    });

    it('clamps offset to max(0, maxLineWidth - contentWidth) on request panel', () => {
      const columns = 80;
      const contentWidth = getRequestContentWidth(columns);
      const maxLineWidth = getMaxRequestLineWidth(longUrlRequests);
      const expectedMaxOffset = Math.max(0, maxLineWidth - contentWidth);

      const state = createInitialState({
        focusedPanel: 'requests',
        requests: longUrlRequests,
        requestHorizontalOffset: expectedMaxOffset,
      });

      const result = reducer(state, { type: 'SCROLL_HORIZONTAL', direction: 'right', columns: 80 });

      expect(result.requestHorizontalOffset).toBe(expectedMaxOffset);
    });

    it('clamps offset to 0 when content fits within panel (no scrolling needed)', () => {
      const state = createInitialState({
        focusedPanel: 'requests',
        requests: shortUrlRequests,
      });

      const result = reducer(state, { type: 'SCROLL_HORIZONTAL', direction: 'right', columns: 200 });

      expect(result.requestHorizontalOffset).toBe(0);
    });
  });

  describe('response panel', () => {
    const longResponse = {
      statusCode: 200,
      statusText: 'OK',
      headers: {} as Record<string, string>,
      body: 'x'.repeat(200),
      timing: { durationMs: 150 },
      size: { bodyBytes: 200 },
    };

    it('scrolls right by 2 on response panel', () => {
      const state = createInitialState({
        focusedPanel: 'response',
        response: longResponse,
      });
      const result = reducer(state, { type: 'SCROLL_HORIZONTAL', direction: 'right', columns: 80 });

      expect(result.responseHorizontalOffset).toBe(2);
    });

    it('clamps offset to max(0, maxLineWidth - contentWidth) on response panel', () => {
      const columns = 80;
      const contentWidth = getResponseContentWidth(columns);
      const state = createInitialState({
        focusedPanel: 'response',
        response: longResponse,
      });
      const maxLineWidth = getMaxResponseLineWidth(state);
      const expectedMaxOffset = Math.max(0, maxLineWidth - contentWidth);

      const scrolledState = createInitialState({
        focusedPanel: 'response',
        response: longResponse,
        responseHorizontalOffset: expectedMaxOffset,
      });

      const result = reducer(scrolledState, { type: 'SCROLL_HORIZONTAL', direction: 'right', columns: 80 });

      expect(result.responseHorizontalOffset).toBe(expectedMaxOffset);
    });

    it('returns state unchanged when wrap mode is on and panel is response', () => {
      const state = createInitialState({
        focusedPanel: 'response',
        response: longResponse,
        wrapMode: 'wrap' as const,
      });

      const result = reducer(state, { type: 'SCROLL_HORIZONTAL', direction: 'right', columns: 80 });

      expect(result).toEqual(state);
    });

    it('clamps offset to 0 when response content fits within panel', () => {
      const shortResponse = {
        statusCode: 200,
        statusText: 'OK',
        headers: {} as Record<string, string>,
        body: 'hi',
        timing: { durationMs: 10 },
        size: { bodyBytes: 2 },
      };

      const state = createInitialState({
        focusedPanel: 'response',
        response: shortResponse,
      });

      const result = reducer(state, { type: 'SCROLL_HORIZONTAL', direction: 'right', columns: 200 });

      expect(result.responseHorizontalOffset).toBe(0);
    });
  });

  describe('defaults columns to 80', () => {
    it('uses 80 columns when columns is not provided in action', () => {
      const state = createInitialState({
        focusedPanel: 'requests',
        requests: longUrlRequests,
      });

      const resultWithDefault = reducer(state, { type: 'SCROLL_HORIZONTAL', direction: 'right' });
      const resultWithExplicit = reducer(state, { type: 'SCROLL_HORIZONTAL', direction: 'right', columns: 80 });

      expect(resultWithDefault.requestHorizontalOffset).toBe(resultWithExplicit.requestHorizontalOffset);
    });
  });
});