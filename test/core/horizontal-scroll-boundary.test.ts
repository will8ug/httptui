import { describe, expect, it } from 'vitest';

import { getMaxDetailsLineWidth, getMaxRequestLineWidth, getMaxResponseLineWidth } from '../../src/utils/scroll';
import { formatResponseBody } from '../../src/core/formatter';
import { formatStatusLine } from '../../src/core/response-layout';
import type { Action, AppState, ParsedRequest } from '../../src/core/types';
import { getRequestContentWidth, getLeftPanelWidth, getResponseContentWidth, getDetailPanelHeight, getPanelContentWidth } from '../../src/utils/layout';
import { createInitialState, reducer } from '../helpers/state';
import { createRequest, makeRequests } from '../helpers/requests';
import { compactJsonResponse, createMockResponse } from '../helpers/responses';

const longUrlRequests: ParsedRequest[] = makeRequests(1, { longUrl: true });
const shortUrlRequests: ParsedRequest[] = makeRequests(1);

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
    expect(getResponseContentWidth(100)).toBe(66); // 100 - 30 - 4 = 66
    expect(getResponseContentWidth(80)).toBe(51); // 80 - 25 - 4 = 51
    expect(getResponseContentWidth(50)).toBe(21); // 50 - 25(max(15,25)) - 4 = 21
  });

  it('getDetailPanelHeight returns min(total, max) + 2 border rows', () => {
    expect(getDetailPanelHeight(10, 10)).toBe(12);
    expect(getDetailPanelHeight(5, 10)).toBe(7);
    expect(getDetailPanelHeight(15, 10)).toBe(12);
    expect(getDetailPanelHeight(0, 10)).toBe(2);
    expect(getDetailPanelHeight(3, 3)).toBe(5);
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
      const maxLineWidth = getMaxRequestLineWidth({ requests: longUrlRequests, variables: [] });
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
    const longResponse: NonNullable<AppState['response']> = {
      statusCode: 200,
      statusText: 'OK',
      headers: {} as Record<string, string>,
      body: 'x'.repeat(200),
      rawBody: 'x'.repeat(200),
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
      const maxLineWidth = getMaxResponseLineWidth({ response: state.response, verbose: state.verbose, rawMode: state.rawMode });
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
        rawBody: 'hi',
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
      const defaultAction: Action = { type: 'SCROLL_HORIZONTAL', direction: 'right' };

      const state = createInitialState({
        focusedPanel: 'requests',
        requests: longUrlRequests,
      });

      const resultWithDefault = reducer(state, defaultAction);
      const resultWithExplicit = reducer(state, { type: 'SCROLL_HORIZONTAL', direction: 'right', columns: 80 });

      expect(resultWithDefault.requestHorizontalOffset).toBe(resultWithExplicit.requestHorizontalOffset);
    });
  });

  describe('getMaxResponseLineWidth with compact JSON (formatted vs raw body)', () => {
    it('measures formatted body lines in non-raw mode, not raw body lines', () => {
      const state = createInitialState({
        response: compactJsonResponse,
        rawMode: false,
      });

      const formattedBody = formatResponseBody(compactJsonResponse.body, false);
      const formattedMaxBodyLine = Math.max(...formattedBody.split('\n').map((l) => l.length));
      const rawMaxBodyLine = Math.max(...compactJsonResponse.body.split('\n').map((l) => l.length));
      const statusLineLength = formatStatusLine(compactJsonResponse).map((s) => s.text).join('').length;

      expect(formattedMaxBodyLine).toBeLessThan(rawMaxBodyLine);

      const expectedFormatted = Math.max(statusLineLength, formattedMaxBodyLine);
      const expectedRaw = Math.max(statusLineLength, rawMaxBodyLine);

      expect(getMaxResponseLineWidth({ response: state.response, verbose: state.verbose, rawMode: state.rawMode })).toBe(expectedFormatted);
      expect(getMaxResponseLineWidth({ response: state.response, verbose: state.verbose, rawMode: state.rawMode })).not.toBe(expectedRaw);
    });

    it('measures raw body lines in raw mode (unchanged behavior)', () => {
      const state = createInitialState({
        response: compactJsonResponse,
        rawMode: true,
      });

      const rawMaxBodyLine = Math.max(...compactJsonResponse.body.split('\n').map((l) => l.length));
      const statusLineLength = formatStatusLine(compactJsonResponse).map((s) => s.text).join('').length;
      const expected = Math.max(statusLineLength, rawMaxBodyLine);

      expect(getMaxResponseLineWidth({ response: state.response, verbose: state.verbose, rawMode: state.rawMode })).toBe(expected);
    });
  });

  describe('SCROLL_HORIZONTAL response bound with compact JSON (formatted body)', () => {
    it('step scroll cannot exceed formatted body bound in non-raw mode', () => {
      const columns = 80;
      const contentWidth = getResponseContentWidth(columns);
      const state = createInitialState({
        focusedPanel: 'response',
        response: compactJsonResponse,
        rawMode: false,
      });
      const formattedBound = Math.max(0, getMaxResponseLineWidth({ response: state.response, verbose: state.verbose, rawMode: state.rawMode }) - contentWidth);

      const scrolledState = createInitialState({
        focusedPanel: 'response',
        response: compactJsonResponse,
        rawMode: false,
        responseHorizontalOffset: formattedBound,
      });

      const result = reducer(scrolledState, { type: 'SCROLL_HORIZONTAL', direction: 'right', columns });

      expect(result.responseHorizontalOffset).toBeLessThanOrEqual(formattedBound);
      expect(result.responseHorizontalOffset).toBe(formattedBound);
    });

    it('repeated step scroll plateaus at formatted bound, never reaching raw line length', () => {
      const columns = 80;
      const contentWidth = getResponseContentWidth(columns);
      const state = createInitialState({
        focusedPanel: 'response',
        response: compactJsonResponse,
        rawMode: false,
      });
      const formattedBound = Math.max(0, getMaxResponseLineWidth({ response: state.response, verbose: state.verbose, rawMode: state.rawMode }) - contentWidth);
      const rawMaxBodyLine = Math.max(...compactJsonResponse.body.split('\n').map((l) => l.length));

      let currentState = state;
      for (let i = 0; i < 100; i += 1) {
        currentState = reducer(currentState, { type: 'SCROLL_HORIZONTAL', direction: 'right', columns });
        expect(currentState.responseHorizontalOffset).toBeLessThanOrEqual(formattedBound);
      }

      expect(currentState.responseHorizontalOffset).toBe(formattedBound);
      expect(currentState.responseHorizontalOffset).toBeLessThan(rawMaxBodyLine);
    });
  });
});

describe('SCROLL_HORIZONTAL fullscreen boundary (maximized panel clamps at fullscreen width)', () => {
  const columns = 200;

  describe('maximized response panel', () => {
    // Body of exactly 250 cells; not JSON, so it displays as one unformatted line.
    const wideResponse = createMockResponse({ body: 'x'.repeat(250), size: { bodyBytes: 250 } });

    it('clamps at the fullscreen content width when the response panel is maximized', () => {
      const state = createInitialState({
        focusedPanel: 'response',
        maximizedPanel: 'response',
        wrapMode: 'nowrap',
        response: wideResponse,
      });
      const maxLineWidth = getMaxResponseLineWidth({ response: state.response, verbose: state.verbose, rawMode: state.rawMode });
      const fullscreenWidth = getPanelContentWidth({ panel: 'response', maximizedPanel: 'response', columns });
      const expectedBound = Math.max(0, maxLineWidth - fullscreenWidth);
      // 250-cell body line - (200 columns - 4 chrome) = 54
      expect(maxLineWidth).toBe(250);
      expect(expectedBound).toBe(54);

      // The split-layout response width at 200 columns is 160, so a split-based bound
      // would be 90 — the fullscreen clamp must stop 36 cells earlier.
      const splitBound = Math.max(0, maxLineWidth - getResponseContentWidth(columns));
      expect(splitBound - expectedBound).toBe(36);

      let currentState = state;
      for (let i = 0; i < 100; i += 1) {
        currentState = reducer(currentState, { type: 'SCROLL_HORIZONTAL', direction: 'right', columns });
        expect(currentState.responseHorizontalOffset).toBeLessThanOrEqual(expectedBound);
      }

      expect(currentState.responseHorizontalOffset).toBe(expectedBound);
    });
  });

  describe('maximized requests panel', () => {
    // Pathname of 30 `segment/` groups (241 cells); displayed line = 2 + 7 + 241 = 250 cells.
    const longPathRequests = [createRequest({ url: `https://api.example.com/${'segment/'.repeat(30)}` })];

    it('clamps at the fullscreen request width when the requests panel is maximized', () => {
      const state = createInitialState({
        focusedPanel: 'requests',
        maximizedPanel: 'requests',
        requests: longPathRequests,
      });
      const maxLineWidth = getMaxRequestLineWidth({ requests: state.requests, variables: state.variables });
      const fullscreenWidth = getPanelContentWidth({ panel: 'requests', maximizedPanel: 'requests', columns });
      const expectedBound = Math.max(0, maxLineWidth - fullscreenWidth);
      // 250-cell request line - (200 columns - 4 chrome) = 54
      expect(maxLineWidth).toBe(250);
      expect(expectedBound).toBe(54);

      // The split-layout request width at 200 columns is 32, so a split-based bound
      // would be 218 — a 164-cell correction separates it from the fullscreen bound.
      const splitBound = Math.max(0, maxLineWidth - getRequestContentWidth(columns));
      expect(splitBound - expectedBound).toBe(164);

      let currentState = state;
      for (let i = 0; i < 100; i += 1) {
        currentState = reducer(currentState, { type: 'SCROLL_HORIZONTAL', direction: 'right', columns });
        expect(currentState.requestHorizontalOffset).toBeLessThanOrEqual(expectedBound);
      }

      expect(currentState.requestHorizontalOffset).toBe(expectedBound);
    });
  });

  describe('maximized details panel', () => {
    // Body of exactly 250 cells; the `GET <url>` line (33 cells) is shorter.
    const wideBodyRequest = createRequest({ body: 'y'.repeat(250) });

    it('clamps at the fullscreen content width when the details panel is maximized', () => {
      const state = createInitialState({
        focusedPanel: 'details',
        maximizedPanel: 'details',
        showRequestDetails: true,
        requests: [wideBodyRequest],
        selectedIndex: 0,
      });
      const maxLineWidth = getMaxDetailsLineWidth({ request: state.requests[state.selectedIndex], variables: state.variables });
      const fullscreenWidth = getPanelContentWidth({ panel: 'details', maximizedPanel: 'details', columns });
      const expectedBound = Math.max(0, maxLineWidth - fullscreenWidth);
      // 250-cell body line - (200 columns - 4 chrome) = 54
      expect(maxLineWidth).toBe(250);
      expect(expectedBound).toBe(54);

      // The split-layout details width at 200 columns is 160, so a split-based bound
      // would be 90 — the fullscreen clamp must stop 36 cells earlier.
      const splitBound = Math.max(0, maxLineWidth - getResponseContentWidth(columns));
      expect(splitBound - expectedBound).toBe(36);

      let currentState = state;
      for (let i = 0; i < 100; i += 1) {
        currentState = reducer(currentState, { type: 'SCROLL_HORIZONTAL', direction: 'right', columns });
        expect(currentState.detailsHorizontalOffset).toBeLessThanOrEqual(expectedBound);
      }

      expect(currentState.detailsHorizontalOffset).toBe(expectedBound);
    });
  });
});
