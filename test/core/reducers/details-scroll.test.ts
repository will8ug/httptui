import { describe, expect, it } from 'vitest';

import { reducer, clampScrollOffsetToCursor } from '../../../src/core/reducer';
import type { Action, AppState, ParsedRequest } from '../../../src/core/types';
import { createRequest } from '../../helpers/requests';
import { createMockResponse } from '../../helpers/responses';
import { createInitialState } from '../../helpers/state';

const requests: ParsedRequest[] = [
  createRequest({
    name: 'Get users',
    method: 'GET',
    url: 'https://api.example.com/users',
    lineNumber: 1,
  }),
  createRequest({
    name: 'Create user',
    method: 'POST',
    url: 'https://api.example.com/users',
    headers: { 'content-type': 'application/json' },
    body: '{"name":"Ada"}',
    lineNumber: 5,
  }),
];

const reloadedRequests: ParsedRequest[] = [
  createRequest({
    name: 'Get users',
    method: 'GET',
    url: 'https://api.example.com/users?fresh=true',
    lineNumber: 1,
  }),
  createRequest({
    name: 'Create user',
    method: 'POST',
    url: 'https://api.example.com/users?fresh=true',
    headers: { 'content-type': 'application/json' },
    body: '{"name":"Ada"}',
    lineNumber: 5,
  }),
];

const wideDetailsRequests: ParsedRequest[] = [
  createRequest({
    name: 'Wide details request',
    url: 'https://api.example.com/users/very-long-path/that/exceeds/the-default-details-panel-width/for-scroll-tests',
  }),
];

// 12 headers render 3 + 12 + 1 = 16 details content lines; the split panel
// window is 10 lines, so the derived max details offset is 6.
const tallDetailsRequests: ParsedRequest[] = [
  createRequest({
    name: 'Tall details request',
    headers: Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [`h-${String(i).padStart(2, '0')}`, 'v']),
    ),
  }),
];

// 12 form-data fields render 3 + 12 = 15 details content lines against the
// 10-line split window, so the derived max details offset is 5.
const formdataRequests: ParsedRequest[] = [
  createRequest({
    name: 'Formdata request',
    method: 'POST',
    formdataFields: Array.from({ length: 12 }, (_, i) => ({
      key: `field-${i}`,
      value: 'v',
      type: 'text' as const,
    })),
  }),
];

// 28 body lines render status + separator + 28 = 30 visual lines; a 24-row
// terminal shows 24 - 1 (status bar) - 3 (panel chrome) = 20 of them, so the
// derived max response offset is 10.
const TWENTY_EIGHT_LINE_BODY = Array.from(
  { length: 28 },
  (_, i) => `line-${i + 1}`,
).join('\n');

const reduce = (state: AppState, action: Action): AppState => reducer(state, action);

describe('request details scrolling reducer behavior', () => {
  describe('SWITCH_PANEL 3-way Tab cycling', () => {
    it('cycles requests → details → response → requests when request details are shown', () => {
      const initialState = createInitialState({
        showRequestDetails: true,
        focusedPanel: 'requests',
        requestScrollOffset: clampScrollOffsetToCursor(0, 0, 19),
      });

      const detailsState = reduce(initialState, { type: 'SWITCH_PANEL' });
      const responseState = reduce(detailsState, { type: 'SWITCH_PANEL' });
      const requestsState = reduce(responseState, { type: 'SWITCH_PANEL' });

      expect(detailsState.focusedPanel).toBe('details');
      expect(responseState.focusedPanel).toBe('response');
      expect(requestsState.focusedPanel).toBe('requests');
    });

    it('cycles requests → response → requests when request details are hidden', () => {
      const initialState = createInitialState({ showRequestDetails: false, focusedPanel: 'requests' });

      const responseState = reduce(initialState, { type: 'SWITCH_PANEL' });
      const requestsState = reduce(responseState, { type: 'SWITCH_PANEL' });

      expect(responseState.focusedPanel).toBe('response');
      expect(requestsState.focusedPanel).toBe('requests');
    });

    it('moves details → response regardless of showRequestDetails', () => {
      const state = createInitialState({ showRequestDetails: false, focusedPanel: 'details' });

      const result = reduce(state, { type: 'SWITCH_PANEL' });

      expect(result.focusedPanel).toBe('response');
    });

    it('moves response → requests regardless of showRequestDetails', () => {
      const state = createInitialState({ showRequestDetails: true, focusedPanel: 'response' });

      const result = reduce(state, { type: 'SWITCH_PANEL' });

      expect(result.focusedPanel).toBe('requests');
    });
  });

  describe('TOGGLE_REQUEST_DETAILS focus transitions', () => {
    it('moves focus to response when toggling off while details is focused', () => {
      const state = createInitialState({
        showRequestDetails: true,
        focusedPanel: 'details',
      });

      const result = reduce(state, { type: 'TOGGLE_REQUEST_DETAILS' });

      expect(result.showRequestDetails).toBe(false);
      expect(result.focusedPanel).toBe('response');
    });

    it('keeps requests focus unchanged when toggling on', () => {
      const state = createInitialState({
        showRequestDetails: false,
        focusedPanel: 'requests',
      });

      const result = reduce(state, { type: 'TOGGLE_REQUEST_DETAILS' });

      expect(result.showRequestDetails).toBe(true);
      expect(result.focusedPanel).toBe('requests');
    });

    it('keeps response focus when toggling off while response is focused', () => {
      const state = createInitialState({
        showRequestDetails: true,
        focusedPanel: 'response',
      });

      const result = reduce(state, { type: 'TOGGLE_REQUEST_DETAILS' });

      expect(result.showRequestDetails).toBe(false);
      expect(result.focusedPanel).toBe('response');
    });

    it('resets details offsets when toggling off', () => {
      const state = createInitialState({
        showRequestDetails: true,
        focusedPanel: 'response',
        detailsScrollOffset: 7,
        detailsHorizontalOffset: 6,
      });

      const result = reduce(state, { type: 'TOGGLE_REQUEST_DETAILS' });

      expect(result.detailsScrollOffset).toBe(0);
      expect(result.detailsHorizontalOffset).toBe(0);
    });
  });

  describe('SCROLL when focusedPanel === details', () => {
    it('increments detailsScrollOffset on scroll down', () => {
      const state = createInitialState({ requests: tallDetailsRequests, focusedPanel: 'details', detailsScrollOffset: 0 });

      const result = reduce(state, { type: 'SCROLL', direction: 'down' });

      expect(result.detailsScrollOffset).toBe(1);
    });

    it('decrements detailsScrollOffset on scroll up', () => {
      const state = createInitialState({ requests: tallDetailsRequests, focusedPanel: 'details', detailsScrollOffset: 3 });

      const result = reduce(state, { type: 'SCROLL', direction: 'up' });

      expect(result.detailsScrollOffset).toBe(2);
    });

    it('does not change responseScrollOffset when details is focused', () => {
      const state = createInitialState({
        requests: tallDetailsRequests,
        focusedPanel: 'details',
        detailsScrollOffset: 1,
        responseScrollOffset: 4,
      });

      const result = reduce(state, { type: 'SCROLL', direction: 'down' });

      expect(result.responseScrollOffset).toBe(4);
    });

    it('does not change requestScrollOffset when details is focused', () => {
      const state = createInitialState({
        requests: tallDetailsRequests,
        focusedPanel: 'details',
        detailsScrollOffset: 1,
        requestScrollOffset: 5,
      });

      const result = reduce(state, { type: 'SCROLL', direction: 'down' });

      expect(result.requestScrollOffset).toBe(5);
    });

    it('clamps detailsScrollOffset at 0', () => {
      const state = createInitialState({ requests: tallDetailsRequests, focusedPanel: 'details', detailsScrollOffset: 0 });

      const result = reduce(state, { type: 'SCROLL', direction: 'up' });

      expect(result.detailsScrollOffset).toBe(0);
    });
  });

  describe('SCROLL_HORIZONTAL when focusedPanel === details', () => {
    it('increments detailsHorizontalOffset on scroll right', () => {
      const state = createInitialState({
        requests: wideDetailsRequests,
        focusedPanel: 'details',
        detailsHorizontalOffset: 0,
      });

      const result = reduce(state, { type: 'SCROLL_HORIZONTAL', direction: 'right' });

      expect(result.detailsHorizontalOffset).toBe(2);
    });

    it('decrements detailsHorizontalOffset on scroll left', () => {
      const state = createInitialState({
        requests: wideDetailsRequests,
        focusedPanel: 'details',
        detailsHorizontalOffset: 4,
      });

      const result = reduce(state, { type: 'SCROLL_HORIZONTAL', direction: 'left' });

      expect(result.detailsHorizontalOffset).toBe(2);
    });

    it('clamps detailsHorizontalOffset at 0', () => {
      const state = createInitialState({
        requests: wideDetailsRequests,
        focusedPanel: 'details',
        detailsHorizontalOffset: 0,
      });

      const result = reduce(state, { type: 'SCROLL_HORIZONTAL', direction: 'left' });

      expect(result.detailsHorizontalOffset).toBe(0);
    });
  });

  describe('offset resets on state transitions', () => {
    it('MOVE_SELECTION resets both details offsets to 0', () => {
      const state = createInitialState({
        requests,
        selectedIndex: 0,
        detailsScrollOffset: 8,
        detailsHorizontalOffset: 10,
      });

      const result = reduce(state, { type: 'MOVE_SELECTION', direction: 'down' });

      expect(result.detailsScrollOffset).toBe(0);
      expect(result.detailsHorizontalOffset).toBe(0);
    });

    it('SELECT_REQUEST resets both details offsets to 0', () => {
      const state = createInitialState({
        requests,
        detailsScrollOffset: 8,
        detailsHorizontalOffset: 10,
      });

      const result = reduce(state, { type: 'SELECT_REQUEST', index: 1 });

      expect(result.detailsScrollOffset).toBe(0);
      expect(result.detailsHorizontalOffset).toBe(0);
    });

    it('RELOAD_FILE resets both details offsets to 0', () => {
      const state = createInitialState({
        requests,
        selectedIndex: 1,
        detailsScrollOffset: 8,
        detailsHorizontalOffset: 10,
      });

      const result = reduce(state, {
        type: 'RELOAD_FILE',
        requests: reloadedRequests,
        variables: [],
      });

      expect(result.detailsScrollOffset).toBe(0);
      expect(result.detailsHorizontalOffset).toBe(0);
    });

    it('LOAD_FILE resets both details offsets to 0', () => {
      const state = createInitialState({
        requests,
        selectedIndex: 1,
        detailsScrollOffset: 8,
        detailsHorizontalOffset: 10,
        mode: 'fileLoad',
        fileLoadInput: 'next.http',
        fileLoadError: 'bad path',
      });

      const result = reduce(state, {
        type: 'LOAD_FILE',
        requests: reloadedRequests,
        variables: [],
        filePath: '/tmp/next.http',
      });

      expect(result.detailsScrollOffset).toBe(0);
      expect(result.detailsHorizontalOffset).toBe(0);
    });
  });

  describe('scroll clamping', () => {
    it('detailsScrollOffset cannot go negative', () => {
      const state = createInitialState({ requests: tallDetailsRequests, focusedPanel: 'details', detailsScrollOffset: 0 });

      const result = reduce(state, { type: 'SCROLL', direction: 'up' });

      expect(result.detailsScrollOffset).toBe(0);
    });

    it('detailsHorizontalOffset cannot go negative', () => {
      const state = createInitialState({
        requests: wideDetailsRequests,
        focusedPanel: 'details',
        detailsHorizontalOffset: 0,
      });

      const result = reduce(state, { type: 'SCROLL_HORIZONTAL', direction: 'left' });

      expect(result.detailsHorizontalOffset).toBe(0);
    });
  });

  describe('SCROLL clamps at content bounds derived from state', () => {
    it('clamps detailsScrollOffset at the derived bound when scrolling down at the edge', () => {
      const state = createInitialState({ requests: tallDetailsRequests, focusedPanel: 'details', detailsScrollOffset: 6 });

      const result = reduce(state, { type: 'SCROLL', direction: 'down' });

      expect(result.detailsScrollOffset).toBe(6);
    });

    it('counts rendered form-data fields in the derived details bound', () => {
      const state = createInitialState({ requests: formdataRequests, focusedPanel: 'details', detailsScrollOffset: 5 });

      const result = reduce(state, { type: 'SCROLL', direction: 'down' });

      expect(result.detailsScrollOffset).toBe(5);
    });

    it('immediately scrolls up from the derived details bound without excess offset accumulation', () => {
      const state = createInitialState({ requests: tallDetailsRequests, focusedPanel: 'details', detailsScrollOffset: 6 });

      const scrolledDown = reduce(state, { type: 'SCROLL', direction: 'down' });
      expect(scrolledDown.detailsScrollOffset).toBe(6);

      const scrolledUp = reduce(scrolledDown, { type: 'SCROLL', direction: 'up' });
      expect(scrolledUp.detailsScrollOffset).toBe(5);
    });

    it('clamps responseScrollOffset at the derived bound when scrolling down at the edge', () => {
      const state = createInitialState({
        response: createMockResponse({ body: TWENTY_EIGHT_LINE_BODY }),
        focusedPanel: 'response',
        responseScrollOffset: 10,
      });

      const result = reduce(state, { type: 'SCROLL', direction: 'down' });

      expect(result.responseScrollOffset).toBe(10);
    });

    it('scrolls normally within the derived response bound', () => {
      const state = createInitialState({
        response: createMockResponse({ body: TWENTY_EIGHT_LINE_BODY }),
        focusedPanel: 'response',
        responseScrollOffset: 4,
      });

      const result = reduce(state, { type: 'SCROLL', direction: 'down' });

      expect(result.responseScrollOffset).toBe(5);
    });

    it('immediately scrolls up from the derived bound in response panel', () => {
      const state = createInitialState({
        response: createMockResponse({ body: TWENTY_EIGHT_LINE_BODY }),
        focusedPanel: 'response',
        responseScrollOffset: 10,
      });

      const result = reduce(state, { type: 'SCROLL', direction: 'up' });

      expect(result.responseScrollOffset).toBe(9);
    });

    it('keeps a details scroll inside the derived bounds', () => {
      const state = createInitialState({ requests: tallDetailsRequests, focusedPanel: 'details', detailsScrollOffset: 3 });

      const result = reduce(state, { type: 'SCROLL', direction: 'down' });

      expect(result.detailsScrollOffset).toBe(4);
    });

    it('keeps the lower-bound clamp', () => {
      const state = createInitialState({ requests: tallDetailsRequests, focusedPanel: 'details', detailsScrollOffset: 0 });

      const result = reduce(state, { type: 'SCROLL', direction: 'up' });

      expect(result.detailsScrollOffset).toBe(0);
    });

    it('scrolls normally within the derived bounds', () => {
      const state = createInitialState({ requests: tallDetailsRequests, focusedPanel: 'details', detailsScrollOffset: 2 });

      const up = reduce(state, { type: 'SCROLL', direction: 'up' });
      expect(up.detailsScrollOffset).toBe(1);

      const down = reduce(state, { type: 'SCROLL', direction: 'down' });
      expect(down.detailsScrollOffset).toBe(3);
    });
  });
});
