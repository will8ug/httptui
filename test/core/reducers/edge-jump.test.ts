import { describe, expect, it } from 'vitest';

import { createInitialState } from '../../helpers/state';
import { createRequest, makeRequests } from '../../helpers/requests';
import { longResponse, compactJsonResponse, createMockResponse } from '../../helpers/responses';
import { viewportOf } from '../../helpers/viewport';
import { reducer, clamp } from '../../../src/core/reducer';
import { getMaxRequestLineWidth, getMaxDetailsLineWidth } from '../../../src/core/reducers/helpers';
import type { AppState, ParsedRequest, ResponseData } from '../../../src/core/types';
import { getRequestContentWidth, getDetailsContentWidth, getPanelContentWidth } from '../../../src/utils/layout';

describe('JUMP_VERTICAL reducer', () => {
  describe('requests panel', () => {
    it('direction: "end" with empty requests clamps selectedIndex to 0', () => {
      const state = createInitialState({
        focusedPanel: 'requests',
        requests: [],
      });

      const result = reducer(state, { type: 'JUMP_VERTICAL', direction: 'end' });

      expect(result.selectedIndex).toBe(clamp(0, 0, 0));
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
    // 12 headers render 3 + 12 + 1 = 16 content lines against the 10-line
    // split window, so the derived max details offset is 6.
    const tallDetailsRequests = [
      createRequest({
        headers: Object.fromEntries(
          Array.from({ length: 12 }, (_, i) => [`h-${String(i).padStart(2, '0')}`, 'v']),
        ),
      }),
    ];

    it('direction: "start" sets detailsScrollOffset to 0', () => {
      const state = createInitialState({
        focusedPanel: 'details',
        requests: tallDetailsRequests,
        detailsScrollOffset: 5,
      });

      const result = reducer(state, { type: 'JUMP_VERTICAL', direction: 'start' });

      expect(result.detailsScrollOffset).toBe(0);
    });

    it('direction: "end" jumps to the derived content bound', () => {
      const state = createInitialState({
        focusedPanel: 'details',
        requests: tallDetailsRequests,
        detailsScrollOffset: 0,
      });

      const result = reducer(state, { type: 'JUMP_VERTICAL', direction: 'end' });

      expect(result.detailsScrollOffset).toBe(6);
    });
  });

  describe('response panel', () => {
    // 28 body lines render status + separator + 28 = 30 visual lines; the
    // default 24-row geometry shows 24 - 1 - 3 = 20, so the derived max
    // response offset is 10.
    const twentyEightLineResponse = createMockResponse({
      body: Array.from({ length: 28 }, (_, i) => `line-${i + 1}`).join('\n'),
    });

    it('direction: "start" sets responseScrollOffset to 0', () => {
      const state = createInitialState({
        focusedPanel: 'response',
        response: twentyEightLineResponse,
        responseScrollOffset: 9,
      });

      const result = reducer(state, { type: 'JUMP_VERTICAL', direction: 'start' });

      expect(result.responseScrollOffset).toBe(0);
    });

    it('direction: "end" jumps to the derived content bound', () => {
      const state = createInitialState({
        focusedPanel: 'response',
        response: twentyEightLineResponse,
        responseScrollOffset: 0,
      });

      const result = reducer(state, { type: 'JUMP_VERTICAL', direction: 'end' });

      expect(result.responseScrollOffset).toBe(10);
    });

    it('direction: "end" without a response lands on 0', () => {
      const state = createInitialState({
        focusedPanel: 'response',
        responseScrollOffset: 3,
      });

      const result = reducer(state, { type: 'JUMP_VERTICAL', direction: 'end' });

      expect(result.responseScrollOffset).toBe(0);
    });
  });
});

describe('JUMP_HORIZONTAL reducer', () => {
  describe('requests panel', () => {
    it('direction: "end" clamps requestHorizontalOffset to max(0, maxWidth - contentWidth)', () => {
      const requests = makeRequests(1, { longUrl: true });
      const columns = 80;
      const contentWidth = getRequestContentWidth(columns);
      const maxWidth = getMaxRequestLineWidth({ requests, variables: [] });
      const expected = clamp(maxWidth - contentWidth, 0, Number.POSITIVE_INFINITY);

      const state = createInitialState({
        focusedPanel: 'requests',
        requests,
      });

      const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end' });

      expect(result.requestHorizontalOffset).toBe(expected);
      expect(expected).toBeGreaterThan(0);
    });

    it('direction: "end" when content fits clamps to 0', () => {
      const state = createInitialState({
        focusedPanel: 'requests',
        requests: makeRequests(1),
        geometry: { rows: 24, columns: 200 },
      });

      const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end' });

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
      const contentWidth = getDetailsContentWidth(columns);
      const longUrl = 'https://api.example.com/' + 'x'.repeat(contentWidth + 50);
      const requests: ParsedRequest[] = [
        {
          name: 'r',
          method: 'GET',
          url: longUrl,
          headers: {},
          body: undefined,
          lineNumber: 1,
          isDirty: false,
        },
      ];

      const state: AppState = createInitialState({
        focusedPanel: 'details',
        requests,
      });
      const expected = clamp(getMaxDetailsLineWidth({ request: state.requests[state.selectedIndex], variables: state.variables }) - contentWidth, 0, Number.POSITIVE_INFINITY);

      const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end' });

      expect(result.detailsHorizontalOffset).toBe(expected);
      expect(expected).toBeGreaterThan(0);
    });
  });

  describe('response panel (nowrap)', () => {
    it('direction: "start" sets responseHorizontalOffset to 0', () => {
      const response: ResponseData = longResponse;
      const state = createInitialState({
        focusedPanel: 'response',
        response,
        responseHorizontalOffset: 50,
        wrapMode: 'nowrap',
      });

      const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'start' });

      expect(result.responseHorizontalOffset).toBe(0);
    });

    it('direction: "end" clamps responseHorizontalOffset to max(0, maxResponseWidth - contentWidth)', () => {
      const state: AppState = createInitialState({
        focusedPanel: 'response',
        response: longResponse,
        wrapMode: 'nowrap',
      });
      const model = viewportOf(state);
      const expected = clamp(model.maxLineDisplayWidth - model.contentWidth, 0, Number.POSITIVE_INFINITY);

      const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end' });

      expect(result.responseHorizontalOffset).toBe(expected);
      expect(expected).toBeGreaterThan(0);
    });

    it('direction: "end" without a response lands on 0', () => {
      const state = createInitialState({
        focusedPanel: 'response',
        responseHorizontalOffset: 3,
        wrapMode: 'nowrap',
      });

      const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end' });

      expect(result.responseHorizontalOffset).toBe(0);
    });

    it('direction: "end" measures tab-expanded body lines in display cells', () => {
      const state = createInitialState({
        focusedPanel: 'response',
        response: createMockResponse({ body: '\t' + 'x'.repeat(60) }),
        rawMode: true,
        wrapMode: 'nowrap',
      });

      const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end' });

      // A tab at column 0 expands to 8 cells, so the rendered line is
      // 8 + 60 = 68 cells against the 51-cell split content width: bound 17.
      expect(result.responseHorizontalOffset).toBe(17);
    });
  });

  describe('response panel (nowrap) — compact JSON uses formatted body width', () => {
    it('direction: "end" with rawMode false uses formatted body bound (regression: body no longer vanishes)', () => {
      const state: AppState = createInitialState({
        focusedPanel: 'response',
        response: compactJsonResponse,
        rawMode: false,
        wrapMode: 'nowrap',
      });
      const model = viewportOf(state);
      const expected = clamp(model.maxLineDisplayWidth - model.contentWidth, 0, Number.POSITIVE_INFINITY);

      const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end' });

      expect(result.responseHorizontalOffset).toBe(expected);
      expect(expected).toBe(0);
    });

    it('direction: "end" with rawMode true uses raw body bound (unchanged behavior)', () => {
      const state: AppState = createInitialState({
        focusedPanel: 'response',
        response: compactJsonResponse,
        rawMode: true,
        wrapMode: 'nowrap',
      });
      const model = viewportOf(state);
      const expected = clamp(model.maxLineDisplayWidth - model.contentWidth, 0, Number.POSITIVE_INFINITY);

      const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end' });

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

      const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end' });

      expect(result).toBe(state);
    });

    it('direction: "end" returns state unchanged when wrapMode is wrap (compact JSON)', () => {
      const state = createInitialState({
        focusedPanel: 'response',
        response: compactJsonResponse,
        rawMode: false,
        wrapMode: 'wrap',
      });

      const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end' });

      expect(result).toBe(state);
    });
  });

  describe('derives columns from the state geometry', () => {
    it('lands on the geometry bound', () => {
      // Request line: 2 + 7 + 46-cell path = 55 cells; at 100 columns the
      // content width is 30 - 4 = 26, so the bound is 29 (an 80-column
      // reading would land on 34 instead).
      const state = createInitialState({
        focusedPanel: 'requests',
        requests: makeRequests(1, { longUrl: true }),
        geometry: { rows: 24, columns: 100 },
      });

      const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end' });

      expect(result.requestHorizontalOffset).toBe(29);
    });
  });
});

describe('JUMP_HORIZONTAL reducer — fullscreen bounds', () => {
  const columns = 200;
  const longUrl = 'https://api.example.com/' + 'x'.repeat(300);

  it('direction: "end" with maximized requests panel lands on the fullscreen bound', () => {
    const state = createInitialState({
      focusedPanel: 'requests',
      maximizedPanel: 'requests',
      requests: [createRequest({ url: longUrl })],
      geometry: { rows: 24, columns },
    });
    const expected = Math.max(
      0,
      getMaxRequestLineWidth({ requests: state.requests, variables: state.variables }) -
        getPanelContentWidth({ panel: 'requests', maximizedPanel: 'requests', columns }),
    );

    const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end' });

    expect(result.requestHorizontalOffset).toBe(expected);
    expect(expected).toBeGreaterThan(0);
  });

  it('direction: "end" with maximized details panel lands on the fullscreen bound', () => {
    const state = createInitialState({
      focusedPanel: 'details',
      maximizedPanel: 'details',
      requests: [createRequest({ url: longUrl })],
      geometry: { rows: 24, columns },
    });
    const expected = Math.max(
      0,
      getMaxDetailsLineWidth({ request: state.requests[state.selectedIndex], variables: state.variables }) -
        getPanelContentWidth({ panel: 'details', maximizedPanel: 'details', columns }),
    );

    const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end' });

    expect(result.detailsHorizontalOffset).toBe(expected);
    expect(expected).toBeGreaterThan(0);
  });

  it('direction: "end" with maximized response panel lands on the fullscreen bound', () => {
    const state = createInitialState({
      focusedPanel: 'response',
      maximizedPanel: 'response',
      response: createMockResponse({ body: 'x'.repeat(300) }),
      wrapMode: 'nowrap',
      geometry: { rows: 24, columns },
    });
    const model = viewportOf(state);
    const expected = Math.max(0, model.maxLineDisplayWidth - model.contentWidth);

    const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end' });

    expect(result.responseHorizontalOffset).toBe(expected);
    expect(expected).toBeGreaterThan(0);
  });

  it('direction: "start" resets the offset to 0 while the panel is maximized', () => {
    const state = createInitialState({
      focusedPanel: 'response',
      maximizedPanel: 'response',
      response: longResponse,
      responseHorizontalOffset: 50,
      wrapMode: 'nowrap',
    });

    const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'start' });

    expect(result.responseHorizontalOffset).toBe(0);
  });

  it('direction: "end" returns state unchanged when wrapMode is wrap and the response panel is maximized', () => {
    const state = createInitialState({
      focusedPanel: 'response',
      maximizedPanel: 'response',
      response: longResponse,
      responseHorizontalOffset: 15,
      wrapMode: 'wrap',
    });

    const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end' });

    expect(result).toBe(state);
    expect(result.responseHorizontalOffset).toBe(15);
  });

  it('direction: "end" uses the split bound when a different panel is maximized', () => {
    const state = createInitialState({
      focusedPanel: 'requests',
      maximizedPanel: 'response',
      requests: makeRequests(1, { longUrl: true }),
      geometry: { rows: 24, columns },
    });
    const maxWidth = getMaxRequestLineWidth({ requests: state.requests, variables: state.variables });
    const splitWidth = getPanelContentWidth({ panel: 'requests', maximizedPanel: 'response', columns });
    const expected = Math.max(0, maxWidth - splitWidth);
    const fullscreenBound = Math.max(
      0,
      maxWidth - getPanelContentWidth({ panel: 'requests', maximizedPanel: 'requests', columns }),
    );

    const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end' });

    expect(splitWidth).toBe(getRequestContentWidth(columns));
    expect(result.requestHorizontalOffset).toBe(expected);
    expect(result.requestHorizontalOffset).not.toBe(fullscreenBound);
    expect(expected).toBeGreaterThan(0);
  });
});
