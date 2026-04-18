import { describe, expect, it } from 'vitest';

import type { Action, AppState, ParsedRequest, ResponseData } from '../src/core/types';
import { getRequestContentWidth, getResponseContentWidth } from '../src/utils/layout';
import { getRequestTarget } from '../src/utils/request';

const REQUEST_SCROLL_WINDOW = 12;

function getVisibleRequestOffset(selectedIndex: number, currentOffset: number): number {
  if (selectedIndex < currentOffset) {
    return selectedIndex;
  }

  if (selectedIndex >= currentOffset + REQUEST_SCROLL_WINDOW) {
    return selectedIndex - REQUEST_SCROLL_WINDOW + 1;
  }

  return currentOffset;
}

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

function getMaxDetailsLineWidth(state: AppState): number {
  const request = state.requests[state.selectedIndex];
  if (!request) {
    return 0;
  }

  const lines: string[] = [];
  lines.push(`${request.method} ${request.url}`);
  for (const [name, value] of Object.entries(request.headers)) {
    lines.push(`${name}: ${value}`);
  }
  if (request.body !== undefined) {
    lines.push(...request.body.split('\n'));
  }

  return Math.max(0, ...lines.map((l) => l.length));
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'JUMP_VERTICAL': {
      if (state.focusedPanel === 'requests') {
        const lastIndex = Math.max(0, state.requests.length - 1);
        const nextIndex = action.direction === 'start' ? 0 : lastIndex;
        return {
          ...state,
          selectedIndex: nextIndex,
          requestScrollOffset: getVisibleRequestOffset(nextIndex, state.requestScrollOffset),
          requestHorizontalOffset: 0,
          detailsScrollOffset: 0,
          detailsHorizontalOffset: 0,
        };
      }

      if (state.focusedPanel === 'details') {
        if (action.direction === 'start') {
          return { ...state, detailsScrollOffset: 0 };
        }
        if (action.maxOffset === undefined) {
          return state;
        }
        return { ...state, detailsScrollOffset: Math.max(0, action.maxOffset) };
      }

      if (state.focusedPanel === 'response') {
        if (action.direction === 'start') {
          return { ...state, responseScrollOffset: 0 };
        }
        if (action.maxOffset === undefined) {
          return state;
        }
        return { ...state, responseScrollOffset: Math.max(0, action.maxOffset) };
      }

      return state;
    }

    case 'JUMP_HORIZONTAL': {
      if (state.focusedPanel === 'response' && state.wrapMode === 'wrap') {
        return state;
      }

      const columns = action.columns ?? 80;

      if (state.focusedPanel === 'requests') {
        if (action.direction === 'start') {
          return { ...state, requestHorizontalOffset: 0 };
        }
        const contentWidth = getRequestContentWidth(columns);
        const maxOffset = Math.max(0, getMaxRequestLineWidth(state.requests) - contentWidth);
        return { ...state, requestHorizontalOffset: maxOffset };
      }

      if (state.focusedPanel === 'details') {
        if (action.direction === 'start') {
          return { ...state, detailsHorizontalOffset: 0 };
        }
        const contentWidth = getResponseContentWidth(columns);
        const maxOffset = Math.max(0, getMaxDetailsLineWidth(state) - contentWidth);
        return { ...state, detailsHorizontalOffset: maxOffset };
      }

      if (state.focusedPanel === 'response') {
        if (action.direction === 'start') {
          return { ...state, responseHorizontalOffset: 0 };
        }
        const contentWidth = getResponseContentWidth(columns);
        const maxOffset = Math.max(0, getMaxResponseLineWidth(state) - contentWidth);
        return { ...state, responseHorizontalOffset: maxOffset };
      }

      return state;
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
    showRequestDetails: false,
    rawMode: false,
    detailsScrollOffset: 0,
    detailsHorizontalOffset: 0,
    reloadMessage: null,
    mode: 'normal',
    fileLoadInput: '',
    fileLoadError: null,
    wrapMode: 'nowrap',
    ...overrides,
  };
}

function makeRequests(count: number, longUrl = false): ParsedRequest[] {
  const url = longUrl
    ? 'https://api.example.com/users/very-long-path/that/exceeds/panel/width'
    : 'https://a.co/b';
  return Array.from({ length: count }, (_, i) => ({
    name: `Request ${i + 1}`,
    method: 'GET' as const,
    url,
    headers: {},
    body: undefined,
    lineNumber: i + 1,
  }));
}

const longResponse: ResponseData = {
  statusCode: 200,
  statusText: 'OK',
  headers: {},
  body: 'x'.repeat(200),
  timing: { durationMs: 100 },
  size: { bodyBytes: 200 },
};

describe('JUMP_VERTICAL reducer', () => {
  describe('requests panel', () => {
    it('direction: "start" sets selectedIndex to 0 and adjusts requestScrollOffset', () => {
      const state = createInitialState({
        focusedPanel: 'requests',
        requests: makeRequests(20),
        selectedIndex: 15,
        requestScrollOffset: 10,
      });

      const result = reducer(state, { type: 'JUMP_VERTICAL', direction: 'start' });

      expect(result.selectedIndex).toBe(0);
      expect(result.requestScrollOffset).toBe(0);
    });

    it('direction: "end" sets selectedIndex to requests.length - 1 and adjusts requestScrollOffset', () => {
      const requests = makeRequests(20);
      const state = createInitialState({
        focusedPanel: 'requests',
        requests,
        selectedIndex: 0,
        requestScrollOffset: 0,
      });

      const result = reducer(state, { type: 'JUMP_VERTICAL', direction: 'end' });

      expect(result.selectedIndex).toBe(19);
      expect(result.requestScrollOffset).toBe(19 - REQUEST_SCROLL_WINDOW + 1);
    });

    it('direction: "end" with empty requests clamps selectedIndex to 0', () => {
      const state = createInitialState({
        focusedPanel: 'requests',
        requests: [],
      });

      const result = reducer(state, { type: 'JUMP_VERTICAL', direction: 'end' });

      expect(result.selectedIndex).toBe(0);
    });

    it('resets requestHorizontalOffset, detailsScrollOffset, detailsHorizontalOffset', () => {
      const state = createInitialState({
        focusedPanel: 'requests',
        requests: makeRequests(5),
        requestHorizontalOffset: 12,
        detailsScrollOffset: 3,
        detailsHorizontalOffset: 7,
      });

      const result = reducer(state, { type: 'JUMP_VERTICAL', direction: 'end' });

      expect(result.requestHorizontalOffset).toBe(0);
      expect(result.detailsScrollOffset).toBe(0);
      expect(result.detailsHorizontalOffset).toBe(0);
    });
  });

  describe('details panel', () => {
    it('direction: "start" sets detailsScrollOffset to 0', () => {
      const state = createInitialState({
        focusedPanel: 'details',
        detailsScrollOffset: 15,
      });

      const result = reducer(state, { type: 'JUMP_VERTICAL', direction: 'start' });

      expect(result.detailsScrollOffset).toBe(0);
    });

    it('direction: "end" with maxOffset sets detailsScrollOffset to maxOffset', () => {
      const state = createInitialState({
        focusedPanel: 'details',
        detailsScrollOffset: 0,
      });

      const result = reducer(state, { type: 'JUMP_VERTICAL', direction: 'end', maxOffset: 25 });

      expect(result.detailsScrollOffset).toBe(25);
    });

    it('direction: "end" without maxOffset leaves detailsScrollOffset unchanged', () => {
      const state = createInitialState({
        focusedPanel: 'details',
        detailsScrollOffset: 12,
      });

      const result = reducer(state, { type: 'JUMP_VERTICAL', direction: 'end' });

      expect(result.detailsScrollOffset).toBe(12);
      expect(result).toBe(state);
    });
  });

  describe('response panel', () => {
    it('direction: "start" sets responseScrollOffset to 0', () => {
      const state = createInitialState({
        focusedPanel: 'response',
        responseScrollOffset: 30,
      });

      const result = reducer(state, { type: 'JUMP_VERTICAL', direction: 'start' });

      expect(result.responseScrollOffset).toBe(0);
    });

    it('direction: "end" with maxOffset sets responseScrollOffset to maxOffset', () => {
      const state = createInitialState({
        focusedPanel: 'response',
        responseScrollOffset: 0,
      });

      const result = reducer(state, { type: 'JUMP_VERTICAL', direction: 'end', maxOffset: 100 });

      expect(result.responseScrollOffset).toBe(100);
    });

    it('direction: "end" without maxOffset leaves responseScrollOffset unchanged', () => {
      const state = createInitialState({
        focusedPanel: 'response',
        responseScrollOffset: 42,
      });

      const result = reducer(state, { type: 'JUMP_VERTICAL', direction: 'end' });

      expect(result.responseScrollOffset).toBe(42);
      expect(result).toBe(state);
    });
  });
});

describe('JUMP_HORIZONTAL reducer', () => {
  describe('requests panel', () => {
    it('direction: "start" sets requestHorizontalOffset to 0', () => {
      const state = createInitialState({
        focusedPanel: 'requests',
        requests: makeRequests(5, true),
        requestHorizontalOffset: 12,
      });

      const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'start' });

      expect(result.requestHorizontalOffset).toBe(0);
    });

    it('direction: "end" clamps requestHorizontalOffset to max(0, maxWidth - contentWidth)', () => {
      const requests = makeRequests(1, true);
      const columns = 80;
      const contentWidth = getRequestContentWidth(columns);
      const maxWidth = 2 + 7 + getRequestTarget(requests[0]!.url).length;
      const expected = Math.max(0, maxWidth - contentWidth);

      const state = createInitialState({
        focusedPanel: 'requests',
        requests,
      });

      const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end', columns });

      expect(result.requestHorizontalOffset).toBe(expected);
      expect(expected).toBeGreaterThan(0);
    });

    it('direction: "end" when content fits clamps to 0', () => {
      const state = createInitialState({
        focusedPanel: 'requests',
        requests: makeRequests(1, false),
      });

      const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end', columns: 200 });

      expect(result.requestHorizontalOffset).toBe(0);
    });
  });

  describe('details panel', () => {
    it('direction: "start" sets detailsHorizontalOffset to 0', () => {
      const state = createInitialState({
        focusedPanel: 'details',
        detailsHorizontalOffset: 20,
      });

      const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'start' });

      expect(result.detailsHorizontalOffset).toBe(0);
    });

    it('direction: "end" clamps detailsHorizontalOffset to max(0, maxDetailsWidth - contentWidth)', () => {
      const columns = 80;
      const contentWidth = getResponseContentWidth(columns);
      const longUrl = 'https://api.example.com/' + 'x'.repeat(contentWidth + 50);
      const requests: ParsedRequest[] = [
        {
          name: 'r',
          method: 'GET',
          url: longUrl,
          headers: {},
          body: undefined,
          lineNumber: 1,
        },
      ];
      const firstLineWidth = `GET ${longUrl}`.length;
      const expected = Math.max(0, firstLineWidth - contentWidth);

      const state = createInitialState({
        focusedPanel: 'details',
        requests,
      });

      const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end', columns });

      expect(result.detailsHorizontalOffset).toBe(expected);
      expect(expected).toBeGreaterThan(0);
    });
  });

  describe('response panel (nowrap)', () => {
    it('direction: "start" sets responseHorizontalOffset to 0', () => {
      const state = createInitialState({
        focusedPanel: 'response',
        response: longResponse,
        responseHorizontalOffset: 50,
        wrapMode: 'nowrap',
      });

      const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'start' });

      expect(result.responseHorizontalOffset).toBe(0);
    });

    it('direction: "end" clamps responseHorizontalOffset to max(0, maxResponseWidth - contentWidth)', () => {
      const columns = 80;
      const contentWidth = getResponseContentWidth(columns);
      const state = createInitialState({
        focusedPanel: 'response',
        response: longResponse,
        wrapMode: 'nowrap',
      });
      const maxLineWidth = getMaxResponseLineWidth(state);
      const expected = Math.max(0, maxLineWidth - contentWidth);

      const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end', columns });

      expect(result.responseHorizontalOffset).toBe(expected);
      expect(expected).toBeGreaterThan(0);
    });
  });

  describe('response panel (wrap) — no-op', () => {
    it('direction: "start" returns state unchanged when wrapMode is wrap', () => {
      const state = createInitialState({
        focusedPanel: 'response',
        response: longResponse,
        responseHorizontalOffset: 15,
        wrapMode: 'wrap',
      });

      const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'start' });

      expect(result).toBe(state);
      expect(result.responseHorizontalOffset).toBe(15);
    });

    it('direction: "end" returns state unchanged when wrapMode is wrap', () => {
      const state = createInitialState({
        focusedPanel: 'response',
        response: longResponse,
        wrapMode: 'wrap',
      });

      const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end', columns: 80 });

      expect(result).toBe(state);
    });
  });

  describe('defaults columns to 80', () => {
    it('produces identical result whether columns is omitted or explicitly 80', () => {
      const state = createInitialState({
        focusedPanel: 'requests',
        requests: makeRequests(1, true),
      });

      const resultDefault = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end' });
      const resultExplicit = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end', columns: 80 });

      expect(resultDefault.requestHorizontalOffset).toBe(resultExplicit.requestHorizontalOffset);
    });
  });
});
