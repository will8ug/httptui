import { describe, expect, it } from 'vitest';

import { getMaxRequestLineWidth, getMaxResponseLineWidth } from '../../src/core/reducer';
import { formatResponseBody } from '../../src/core/formatter';
import { formatStatusLine } from '../../src/core/responseLayout';
import type { Action, AppState, ParsedRequest } from '../../src/core/types';
import { getRequestContentWidth, getLeftPanelWidth, getResponseContentWidth, getDetailPanelHeight } from '../../src/utils/layout';
import { createInitialState, reducer } from '../helpers/state';
import { makeRequests } from '../helpers/requests';
import { compactJsonResponse } from '../helpers/responses';

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
    expect(getResponseContentWidth(100)).toBe(64); // 100 - 30 - 6 = 64
    expect(getResponseContentWidth(80)).toBe(49); // 80 - 25 - 6 = 49
    expect(getResponseContentWidth(50)).toBe(20); // 50 - 25(max(15,25)) - 6 = 19, min 20
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
    const longResponse: NonNullable<AppState['response']> = {
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

      expect(getMaxResponseLineWidth(state)).toBe(expectedFormatted);
      expect(getMaxResponseLineWidth(state)).not.toBe(expectedRaw);
    });

    it('measures raw body lines in raw mode (unchanged behavior)', () => {
      const state = createInitialState({
        response: compactJsonResponse,
        rawMode: true,
      });

      const rawMaxBodyLine = Math.max(...compactJsonResponse.body.split('\n').map((l) => l.length));
      const statusLineLength = formatStatusLine(compactJsonResponse).map((s) => s.text).join('').length;
      const expected = Math.max(statusLineLength, rawMaxBodyLine);

      expect(getMaxResponseLineWidth(state)).toBe(expected);
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
      const formattedBound = Math.max(0, getMaxResponseLineWidth(state) - contentWidth);

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
      const formattedBound = Math.max(0, getMaxResponseLineWidth(state) - contentWidth);
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
