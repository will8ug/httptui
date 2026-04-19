import { describe, expect, it } from 'vitest';

import { reducer, getVisibleRequestOffset } from '../src/core/reducer';
import type { Action, AppState, ParsedRequest } from '../src/core/types';
import { createRequest } from './helpers/requests';
import { createInitialState } from './helpers/state';

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

const reduce = (state: AppState, action: Action): AppState => reducer(state, action);

describe('request details scrolling reducer behavior', () => {
  describe('SWITCH_PANEL 3-way Tab cycling', () => {
    it('cycles requests → details → response → requests when request details are shown', () => {
      const initialState = createInitialState({
        showRequestDetails: true,
        focusedPanel: 'requests',
        requestScrollOffset: getVisibleRequestOffset(0, 0),
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
      const state = createInitialState({ focusedPanel: 'details', detailsScrollOffset: 0 });

      const result = reduce(state, { type: 'SCROLL', direction: 'down' });

      expect(result.detailsScrollOffset).toBe(1);
    });

    it('decrements detailsScrollOffset on scroll up', () => {
      const state = createInitialState({ focusedPanel: 'details', detailsScrollOffset: 3 });

      const result = reduce(state, { type: 'SCROLL', direction: 'up' });

      expect(result.detailsScrollOffset).toBe(2);
    });

    it('does not change responseScrollOffset when details is focused', () => {
      const state = createInitialState({
        focusedPanel: 'details',
        detailsScrollOffset: 1,
        responseScrollOffset: 4,
      });

      const result = reduce(state, { type: 'SCROLL', direction: 'down' });

      expect(result.responseScrollOffset).toBe(4);
    });

    it('does not change requestScrollOffset when details is focused', () => {
      const state = createInitialState({
        focusedPanel: 'details',
        detailsScrollOffset: 1,
        requestScrollOffset: 5,
      });

      const result = reduce(state, { type: 'SCROLL', direction: 'down' });

      expect(result.requestScrollOffset).toBe(5);
    });

    it('clamps detailsScrollOffset at 0', () => {
      const state = createInitialState({ focusedPanel: 'details', detailsScrollOffset: 0 });

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
      const state = createInitialState({ focusedPanel: 'details', detailsScrollOffset: 0 });

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

  describe('SCROLL with maxOffset clamping', () => {
    it('clamps detailsScrollOffset to maxOffset when scrolling down at boundary', () => {
      const state = createInitialState({ focusedPanel: 'details', detailsScrollOffset: 5 });

      const result = reduce(state, { type: 'SCROLL', direction: 'down', maxOffset: 5 });

      expect(result.detailsScrollOffset).toBe(5);
    });

    it('does not exceed maxOffset when scrolling down past boundary', () => {
      const state = createInitialState({ focusedPanel: 'details', detailsScrollOffset: 5 });

      const result = reduce(state, { type: 'SCROLL', direction: 'down', maxOffset: 5 });

      expect(result.detailsScrollOffset).toBe(5);
    });

    it('immediately scrolls up from maxOffset without excess offset accumulation', () => {
      const state = createInitialState({ focusedPanel: 'details', detailsScrollOffset: 5 });

      const scrolledDown = reduce(state, { type: 'SCROLL', direction: 'down', maxOffset: 5 });
      expect(scrolledDown.detailsScrollOffset).toBe(5);

      const scrolledUp = reduce(scrolledDown, { type: 'SCROLL', direction: 'up', maxOffset: 5 });
      expect(scrolledUp.detailsScrollOffset).toBe(4);
    });

    it('clamps responseScrollOffset to maxOffset when scrolling down at boundary', () => {
      const state = createInitialState({ focusedPanel: 'response', responseScrollOffset: 10 });

      const result = reduce(state, { type: 'SCROLL', direction: 'down', maxOffset: 10 });

      expect(result.responseScrollOffset).toBe(10);
    });

    it('immediately scrolls up from maxOffset in response panel', () => {
      const state = createInitialState({ focusedPanel: 'response', responseScrollOffset: 10 });

      const result = reduce(state, { type: 'SCROLL', direction: 'up', maxOffset: 10 });

      expect(result.responseScrollOffset).toBe(9);
    });

    it('preserves backward compatibility when maxOffset is absent (details)', () => {
      const state = createInitialState({ focusedPanel: 'details', detailsScrollOffset: 3 });

      const result = reduce(state, { type: 'SCROLL', direction: 'down' });

      expect(result.detailsScrollOffset).toBe(4);
    });

    it('preserves backward compatibility when maxOffset is absent (response)', () => {
      const state = createInitialState({ focusedPanel: 'response', responseScrollOffset: 7 });

      const result = reduce(state, { type: 'SCROLL', direction: 'down' });

      expect(result.responseScrollOffset).toBe(8);
    });

    it('preserves backward compatibility: lower-bound clamp still works without maxOffset', () => {
      const state = createInitialState({ focusedPanel: 'details', detailsScrollOffset: 0 });

      const result = reduce(state, { type: 'SCROLL', direction: 'up' });

      expect(result.detailsScrollOffset).toBe(0);
    });

    it('scrolls normally within bounds with maxOffset', () => {
      const state = createInitialState({ focusedPanel: 'details', detailsScrollOffset: 2 });

      const up = reduce(state, { type: 'SCROLL', direction: 'up', maxOffset: 5 });
      expect(up.detailsScrollOffset).toBe(1);

      const down = reduce(state, { type: 'SCROLL', direction: 'down', maxOffset: 5 });
      expect(down.detailsScrollOffset).toBe(3);
    });

    it('clamps to 0 when scrolling up at offset 0 with maxOffset', () => {
      const state = createInitialState({ focusedPanel: 'details', detailsScrollOffset: 0 });

      const result = reduce(state, { type: 'SCROLL', direction: 'up', maxOffset: 5 });

      expect(result.detailsScrollOffset).toBe(0);
    });
  });
});
