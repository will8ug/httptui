import { describe, expect, it } from 'vitest';

import { getMaxDetailsLineWidth, getMaxRequestLineWidth } from '../../src/core/reducers/helpers';
import { formatResponseBody } from '../../src/core/formatter';
import { formatStatusLine } from '../../src/core/response-layout';
import type { AppState, ParsedRequest } from '../../src/core/types';
import { getRequestContentWidth, getLeftPanelWidth, getDetailPanelHeight, getPanelContentWidth } from '../../src/utils/layout';
import { RESPONSE_PANEL_CHROME, getResponseContentWidth } from '../../src/core/response-viewport';
import { createInitialState, reducer } from '../helpers/state';
import { createRequest, makeRequests } from '../helpers/requests';
import { compactJsonResponse, createMockResponse } from '../helpers/responses';
import { viewportOf } from '../helpers/viewport';

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

  it('getResponseContentWidth returns columns minus left panel and panel chrome', () => {
    // 100 - 30 - 4 = 66; 80 - 25 - 4 = 51; 50 - 25 (left floor) - 4 = 21.
    expect(getResponseContentWidth(100)).toBe(100 - getLeftPanelWidth(100) - RESPONSE_PANEL_CHROME);
    expect(getResponseContentWidth(80)).toBe(80 - getLeftPanelWidth(80) - RESPONSE_PANEL_CHROME);
    expect(getResponseContentWidth(50)).toBe(50 - getLeftPanelWidth(50) - RESPONSE_PANEL_CHROME);
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
      const result = reducer(state, { type: 'SCROLL_HORIZONTAL', direction: 'right' });

      expect(result.requestHorizontalOffset).toBe(2);
    });

    it('scrolls left by 2, clamped to 0', () => {
      const state = createInitialState({
        focusedPanel: 'requests',
        requestHorizontalOffset: 0,
        requests: longUrlRequests,
      });
      const result = reducer(state, { type: 'SCROLL_HORIZONTAL', direction: 'left' });

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

      const result = reducer(state, { type: 'SCROLL_HORIZONTAL', direction: 'right' });

      expect(result.requestHorizontalOffset).toBe(expectedMaxOffset);
    });

    it('clamps offset to 0 when content fits within panel (no scrolling needed)', () => {
      const state = createInitialState({
        focusedPanel: 'requests',
        requests: shortUrlRequests,
        geometry: { rows: 24, columns: 200 },
      });

      const result = reducer(state, { type: 'SCROLL_HORIZONTAL', direction: 'right' });

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
      const result = reducer(state, { type: 'SCROLL_HORIZONTAL', direction: 'right' });

      expect(result.responseHorizontalOffset).toBe(2);
    });

    it('clamps offset to max(0, maxLineWidth - contentWidth) on response panel', () => {
      const state = createInitialState({
        focusedPanel: 'response',
        response: longResponse,
      });
      const model = viewportOf(state);
      const expectedMaxOffset = Math.max(0, model.maxLineDisplayWidth - model.contentWidth);

      const scrolledState = createInitialState({
        focusedPanel: 'response',
        response: longResponse,
        responseHorizontalOffset: expectedMaxOffset,
      });

      const result = reducer(scrolledState, { type: 'SCROLL_HORIZONTAL', direction: 'right' });

      expect(result.responseHorizontalOffset).toBe(expectedMaxOffset);
    });

    it('returns state unchanged when wrap mode is on and panel is response', () => {
      const state = createInitialState({
        focusedPanel: 'response',
        response: longResponse,
        wrapMode: 'wrap' as const,
      });

      const result = reducer(state, { type: 'SCROLL_HORIZONTAL', direction: 'right' });

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
        geometry: { rows: 24, columns: 200 },
      });

      const result = reducer(state, { type: 'SCROLL_HORIZONTAL', direction: 'right' });

      expect(result.responseHorizontalOffset).toBe(0);
    });
  });

  describe('derives columns from the state geometry', () => {
    it('plateaus at the geometry bound', () => {
      // Request line: 2 + 7 + 46-cell path = 55 cells; at 100 columns the
      // content width is 30 - 4 = 26, so the bound is 29 (an 80-column
      // reading would plateau at 34 instead).
      const state = createInitialState({
        focusedPanel: 'requests',
        requests: longUrlRequests,
        geometry: { rows: 24, columns: 100 },
      });

      let current = state;
      for (let i = 0; i < 60; i += 1) {
        current = reducer(current, { type: 'SCROLL_HORIZONTAL', direction: 'right' });
      }

      expect(current.requestHorizontalOffset).toBe(29);
    });
  });

  describe('response viewport width with compact JSON (formatted vs raw body)', () => {
    it('measures formatted body lines in non-raw mode, not raw body lines', () => {
      const state = createInitialState({
        response: compactJsonResponse,
        rawMode: false,
      });

      const formattedBody = formatResponseBody(compactJsonResponse.body, false);
      const formattedMaxBodyLine = Math.max(...formattedBody.split('\n').map((l) => l.length));
      const rawMaxBodyLine = Math.max(...compactJsonResponse.body.split('\n').map((l) => l.length));

      expect(formattedMaxBodyLine).toBeLessThan(rawMaxBodyLine);

      const model = viewportOf(state);
      // Every formatted line fits the content width, so the separator is the
      // widest rendered line; measuring the raw body instead would report its
      // single 117-cell line.
      expect(model.maxLineDisplayWidth).toBe(model.contentWidth);
      expect(model.maxLineDisplayWidth).toBeLessThan(rawMaxBodyLine);
    });

    it('measures raw body lines in raw mode (unchanged behavior)', () => {
      const state = createInitialState({
        response: compactJsonResponse,
        rawMode: true,
      });

      const rawMaxBodyLine = Math.max(...compactJsonResponse.body.split('\n').map((l) => l.length));
      const statusLineLength = formatStatusLine(compactJsonResponse).map((s) => s.text).join('').length;
      const expected = Math.max(statusLineLength, rawMaxBodyLine);

      expect(viewportOf(state).maxLineDisplayWidth).toBe(expected);
    });
  });

  describe('SCROLL_HORIZONTAL response bound with compact JSON (formatted body)', () => {
    it('step scroll cannot exceed formatted body bound in non-raw mode', () => {
      const state = createInitialState({
        focusedPanel: 'response',
        response: compactJsonResponse,
        rawMode: false,
      });
      const model = viewportOf(state);
      const formattedBound = Math.max(0, model.maxLineDisplayWidth - model.contentWidth);

      const scrolledState = createInitialState({
        focusedPanel: 'response',
        response: compactJsonResponse,
        rawMode: false,
        responseHorizontalOffset: formattedBound,
      });

      const result = reducer(scrolledState, { type: 'SCROLL_HORIZONTAL', direction: 'right' });

      expect(result.responseHorizontalOffset).toBeLessThanOrEqual(formattedBound);
      expect(result.responseHorizontalOffset).toBe(formattedBound);
    });

    it('repeated step scroll plateaus at formatted bound, never reaching raw line length', () => {
      const state = createInitialState({
        focusedPanel: 'response',
        response: compactJsonResponse,
        rawMode: false,
      });
      const model = viewportOf(state);
      const formattedBound = Math.max(0, model.maxLineDisplayWidth - model.contentWidth);
      const rawMaxBodyLine = Math.max(...compactJsonResponse.body.split('\n').map((l) => l.length));

      let currentState = state;
      for (let i = 0; i < 100; i += 1) {
        currentState = reducer(currentState, { type: 'SCROLL_HORIZONTAL', direction: 'right' });
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
        geometry: { rows: 24, columns },
      });
      const model = viewportOf(state);
      const maxLineWidth = model.maxLineDisplayWidth;
      const expectedBound = Math.max(0, maxLineWidth - model.contentWidth);
      // 250-cell body line - (200 columns - 4 chrome) = 54
      expect(maxLineWidth).toBe(250);
      expect(expectedBound).toBe(54);

      // The split-layout response width at 200 columns is 160, so a split-based bound
      // would be 90 — the fullscreen clamp must stop 36 cells earlier.
      const splitBound = Math.max(0, maxLineWidth - getResponseContentWidth(columns));
      expect(splitBound - expectedBound).toBe(36);

      let currentState = state;
      for (let i = 0; i < 100; i += 1) {
        currentState = reducer(currentState, { type: 'SCROLL_HORIZONTAL', direction: 'right' });
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
        geometry: { rows: 24, columns },
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
        currentState = reducer(currentState, { type: 'SCROLL_HORIZONTAL', direction: 'right' });
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
        geometry: { rows: 24, columns },
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
        currentState = reducer(currentState, { type: 'SCROLL_HORIZONTAL', direction: 'right' });
        expect(currentState.detailsHorizontalOffset).toBeLessThanOrEqual(expectedBound);
      }

      expect(currentState.detailsHorizontalOffset).toBe(expectedBound);
    });
  });
});
