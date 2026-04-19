import { describe, expect, it } from 'vitest';

import { createInitialState } from './helpers/state';
import { makeRequests } from './helpers/requests';
import { longResponse } from './helpers/responses';
import {
  reducer,
  getVisibleRequestOffset,
  getMaxRequestLineWidth,
  getMaxResponseLineWidth,
  getMaxDetailsLineWidth,
  REQUEST_SCROLL_WINDOW,
  clamp,
} from '../src/core/reducer';
import type { Action, AppState, ParsedRequest, ResponseData } from '../src/core/types';
import { getRequestContentWidth, getResponseContentWidth } from '../src/utils/layout';

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
      expect(result.requestScrollOffset).toBe(getVisibleRequestOffset(0, 10));
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
        requests: makeRequests(5, { longUrl: true }),
        requestHorizontalOffset: 12,
      });

      const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'start' });

      expect(result.requestHorizontalOffset).toBe(0);
    });

    it('direction: "end" clamps requestHorizontalOffset to max(0, maxWidth - contentWidth)', () => {
      const requests = makeRequests(1, { longUrl: true });
      const columns = 80;
      const contentWidth = getRequestContentWidth(columns);
      const maxWidth = getMaxRequestLineWidth(requests);
      const expected = clamp(maxWidth - contentWidth, 0, Number.POSITIVE_INFINITY);

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
        requests: makeRequests(1),
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

      const state: AppState = createInitialState({
        focusedPanel: 'details',
        requests,
      });
      const expected = clamp(getMaxDetailsLineWidth(state) - contentWidth, 0, Number.POSITIVE_INFINITY);

      const result = reducer(state, { type: 'JUMP_HORIZONTAL', direction: 'end', columns });

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
      const columns = 80;
      const contentWidth = getResponseContentWidth(columns);
      const state: AppState = createInitialState({
        focusedPanel: 'response',
        response: longResponse,
        wrapMode: 'nowrap',
      });
      const maxLineWidth = getMaxResponseLineWidth(state);
      const expected = clamp(maxLineWidth - contentWidth, 0, Number.POSITIVE_INFINITY);

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
        requests: makeRequests(1, { longUrl: true }),
      });

      const action: Action = { type: 'JUMP_HORIZONTAL', direction: 'end' };
      const resultDefault = reducer(state, action);
      const resultExplicit = reducer(state, { ...action, columns: 80 });

      expect(resultDefault.requestHorizontalOffset).toBe(resultExplicit.requestHorizontalOffset);
    });
  });
});
