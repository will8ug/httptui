import { describe, expect, it } from 'vitest';

import type { Action, AppState, ParsedRequest } from '../src/core/types';

const REQUEST_SCROLL_WINDOW = 12;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getVisibleRequestOffset(selectedIndex: number, currentOffset: number): number {
  if (selectedIndex < currentOffset) {
    return selectedIndex;
  }

  if (selectedIndex >= currentOffset + REQUEST_SCROLL_WINDOW) {
    return selectedIndex - REQUEST_SCROLL_WINDOW + 1;
  }

  return currentOffset;
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SELECT_REQUEST': {
      const nextIndex = clamp(action.index, 0, state.requests.length - 1);

      return {
        ...state,
        selectedIndex: nextIndex,
        requestScrollOffset: getVisibleRequestOffset(nextIndex, state.requestScrollOffset),
        requestHorizontalOffset: 0,
        detailsScrollOffset: 0,
        detailsHorizontalOffset: 0,
      };
    }

    case 'MOVE_SELECTION': {
      const delta = action.direction === 'up' ? -1 : 1;
      const nextIndex = clamp(state.selectedIndex + delta, 0, state.requests.length - 1);

      return {
        ...state,
        selectedIndex: nextIndex,
        requestScrollOffset: getVisibleRequestOffset(nextIndex, state.requestScrollOffset),
        requestHorizontalOffset: 0,
        detailsScrollOffset: 0,
        detailsHorizontalOffset: 0,
      };
    }

    case 'SWITCH_PANEL': {
      const nextPanel = (() => {
        switch (state.focusedPanel) {
          case 'requests':
            return state.showRequestDetails ? 'details' : 'response';
          case 'details':
            return 'response';
          case 'response':
            return 'requests';
        }
      })();
      return {
        ...state,
        focusedPanel: nextPanel,
      };
    }

    case 'SCROLL': {
      const delta = action.direction === 'up' ? -1 : 1;

      if (state.focusedPanel === 'details') {
        return {
          ...state,
          detailsScrollOffset: Math.max(0, state.detailsScrollOffset + delta),
        };
      }

      if (state.focusedPanel === 'response') {
        return {
          ...state,
          responseScrollOffset: Math.max(0, state.responseScrollOffset + delta),
        };
      }

      return {
        ...state,
        requestScrollOffset: Math.max(0, state.requestScrollOffset + delta),
      };
    }

    case 'SCROLL_HORIZONTAL': {
      if (state.focusedPanel === 'response' && state.wrapMode === 'wrap') {
        return state;
      }

      const horizontalDelta = action.direction === 'left' ? -2 : 2;

      if (state.focusedPanel === 'details') {
        return {
          ...state,
          detailsHorizontalOffset: Math.max(0, state.detailsHorizontalOffset + horizontalDelta),
        };
      }

      return state;
    }

    case 'TOGGLE_REQUEST_DETAILS': {
      const hiding = state.showRequestDetails;
      return {
        ...state,
        showRequestDetails: !state.showRequestDetails,
        ...(hiding && {
          detailsScrollOffset: 0,
          detailsHorizontalOffset: 0,
          ...(state.focusedPanel === 'details' && { focusedPanel: 'response' as const }),
        }),
      };
    }

    case 'RELOAD_FILE': {
      const currentRequestName = state.requests[state.selectedIndex]?.name;
      const newIndex = currentRequestName
        ? action.requests.findIndex((req) => req.name === currentRequestName)
        : -1;

      return {
        ...state,
        requests: action.requests,
        variables: action.variables,
        selectedIndex: newIndex >= 0 ? newIndex : 0,
        response: null,
        error: null,
        responseScrollOffset: 0,
        requestScrollOffset: 0,
        detailsScrollOffset: 0,
        detailsHorizontalOffset: 0,
        reloadMessage: 'Reloaded',
      };
    }

    case 'LOAD_FILE': {
      const currentRequestName = state.requests[state.selectedIndex]?.name;
      const newIndex = currentRequestName
        ? action.requests.findIndex((req) => req.name === currentRequestName)
        : -1;

      return {
        ...state,
        requests: action.requests,
        variables: action.variables,
        filePath: action.filePath,
        selectedIndex: newIndex >= 0 ? newIndex : 0,
        response: null,
        error: null,
        responseScrollOffset: 0,
        requestScrollOffset: 0,
        detailsScrollOffset: 0,
        detailsHorizontalOffset: 0,
        mode: 'normal',
        fileLoadInput: '',
        fileLoadError: null,
        reloadMessage: `Loaded: ${action.filePath.split('/').pop()}`,
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
    detailsScrollOffset: 0,
    detailsHorizontalOffset: 0,
    reloadMessage: null,
    mode: 'normal',
    fileLoadInput: '',
    fileLoadError: null,
    wrapMode: 'nowrap',
    showRequestDetails: false,
    rawMode: false,
    ...overrides,
  };
}

const requests: ParsedRequest[] = [
  {
    name: 'Get users',
    method: 'GET',
    url: 'https://api.example.com/users',
    headers: {},
    body: undefined,
    lineNumber: 1,
  },
  {
    name: 'Create user',
    method: 'POST',
    url: 'https://api.example.com/users',
    headers: { 'content-type': 'application/json' },
    body: '{"name":"Ada"}',
    lineNumber: 5,
  },
];

const reloadedRequests: ParsedRequest[] = [
  {
    name: 'Get users',
    method: 'GET',
    url: 'https://api.example.com/users?fresh=true',
    headers: {},
    body: undefined,
    lineNumber: 1,
  },
  {
    name: 'Create user',
    method: 'POST',
    url: 'https://api.example.com/users?fresh=true',
    headers: { 'content-type': 'application/json' },
    body: '{"name":"Ada"}',
    lineNumber: 5,
  },
];

describe('request details scrolling reducer behavior', () => {
  describe('SWITCH_PANEL 3-way Tab cycling', () => {
    it('cycles requests → details → response → requests when request details are shown', () => {
      const initialState = createInitialState({ showRequestDetails: true, focusedPanel: 'requests' });

      const detailsState = reducer(initialState, { type: 'SWITCH_PANEL' });
      const responseState = reducer(detailsState, { type: 'SWITCH_PANEL' });
      const requestsState = reducer(responseState, { type: 'SWITCH_PANEL' });

      expect(detailsState.focusedPanel).toBe('details');
      expect(responseState.focusedPanel).toBe('response');
      expect(requestsState.focusedPanel).toBe('requests');
    });

    it('cycles requests → response → requests when request details are hidden', () => {
      const initialState = createInitialState({ showRequestDetails: false, focusedPanel: 'requests' });

      const responseState = reducer(initialState, { type: 'SWITCH_PANEL' });
      const requestsState = reducer(responseState, { type: 'SWITCH_PANEL' });

      expect(responseState.focusedPanel).toBe('response');
      expect(requestsState.focusedPanel).toBe('requests');
    });

    it('moves details → response regardless of showRequestDetails', () => {
      const state = createInitialState({ showRequestDetails: false, focusedPanel: 'details' });

      const result = reducer(state, { type: 'SWITCH_PANEL' });

      expect(result.focusedPanel).toBe('response');
    });

    it('moves response → requests regardless of showRequestDetails', () => {
      const state = createInitialState({ showRequestDetails: true, focusedPanel: 'response' });

      const result = reducer(state, { type: 'SWITCH_PANEL' });

      expect(result.focusedPanel).toBe('requests');
    });
  });

  describe('TOGGLE_REQUEST_DETAILS focus transitions', () => {
    it('moves focus to response when toggling off while details is focused', () => {
      const state = createInitialState({
        showRequestDetails: true,
        focusedPanel: 'details',
      });

      const result = reducer(state, { type: 'TOGGLE_REQUEST_DETAILS' });

      expect(result.showRequestDetails).toBe(false);
      expect(result.focusedPanel).toBe('response');
    });

    it('keeps requests focus unchanged when toggling on', () => {
      const state = createInitialState({
        showRequestDetails: false,
        focusedPanel: 'requests',
      });

      const result = reducer(state, { type: 'TOGGLE_REQUEST_DETAILS' });

      expect(result.showRequestDetails).toBe(true);
      expect(result.focusedPanel).toBe('requests');
    });

    it('keeps response focus when toggling off while response is focused', () => {
      const state = createInitialState({
        showRequestDetails: true,
        focusedPanel: 'response',
      });

      const result = reducer(state, { type: 'TOGGLE_REQUEST_DETAILS' });

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

      const result = reducer(state, { type: 'TOGGLE_REQUEST_DETAILS' });

      expect(result.detailsScrollOffset).toBe(0);
      expect(result.detailsHorizontalOffset).toBe(0);
    });
  });

  describe('SCROLL when focusedPanel === details', () => {
    it('increments detailsScrollOffset on scroll down', () => {
      const state = createInitialState({ focusedPanel: 'details', detailsScrollOffset: 0 });

      const result = reducer(state, { type: 'SCROLL', direction: 'down' });

      expect(result.detailsScrollOffset).toBe(1);
    });

    it('decrements detailsScrollOffset on scroll up', () => {
      const state = createInitialState({ focusedPanel: 'details', detailsScrollOffset: 3 });

      const result = reducer(state, { type: 'SCROLL', direction: 'up' });

      expect(result.detailsScrollOffset).toBe(2);
    });

    it('does not change responseScrollOffset when details is focused', () => {
      const state = createInitialState({
        focusedPanel: 'details',
        detailsScrollOffset: 1,
        responseScrollOffset: 4,
      });

      const result = reducer(state, { type: 'SCROLL', direction: 'down' });

      expect(result.responseScrollOffset).toBe(4);
    });

    it('does not change requestScrollOffset when details is focused', () => {
      const state = createInitialState({
        focusedPanel: 'details',
        detailsScrollOffset: 1,
        requestScrollOffset: 5,
      });

      const result = reducer(state, { type: 'SCROLL', direction: 'down' });

      expect(result.requestScrollOffset).toBe(5);
    });

    it('clamps detailsScrollOffset at 0', () => {
      const state = createInitialState({ focusedPanel: 'details', detailsScrollOffset: 0 });

      const result = reducer(state, { type: 'SCROLL', direction: 'up' });

      expect(result.detailsScrollOffset).toBe(0);
    });
  });

  describe('SCROLL_HORIZONTAL when focusedPanel === details', () => {
    it('increments detailsHorizontalOffset on scroll right', () => {
      const state = createInitialState({ focusedPanel: 'details', detailsHorizontalOffset: 0 });

      const result = reducer(state, { type: 'SCROLL_HORIZONTAL', direction: 'right' });

      expect(result.detailsHorizontalOffset).toBe(2);
    });

    it('decrements detailsHorizontalOffset on scroll left', () => {
      const state = createInitialState({ focusedPanel: 'details', detailsHorizontalOffset: 4 });

      const result = reducer(state, { type: 'SCROLL_HORIZONTAL', direction: 'left' });

      expect(result.detailsHorizontalOffset).toBe(2);
    });

    it('clamps detailsHorizontalOffset at 0', () => {
      const state = createInitialState({ focusedPanel: 'details', detailsHorizontalOffset: 0 });

      const result = reducer(state, { type: 'SCROLL_HORIZONTAL', direction: 'left' });

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

      const result = reducer(state, { type: 'MOVE_SELECTION', direction: 'down' });

      expect(result.detailsScrollOffset).toBe(0);
      expect(result.detailsHorizontalOffset).toBe(0);
    });

    it('SELECT_REQUEST resets both details offsets to 0', () => {
      const state = createInitialState({
        requests,
        detailsScrollOffset: 8,
        detailsHorizontalOffset: 10,
      });

      const result = reducer(state, { type: 'SELECT_REQUEST', index: 1 });

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

      const result = reducer(state, {
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

      const result = reducer(state, {
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

      const result = reducer(state, { type: 'SCROLL', direction: 'up' });

      expect(result.detailsScrollOffset).toBe(0);
    });

    it('detailsHorizontalOffset cannot go negative', () => {
      const state = createInitialState({ focusedPanel: 'details', detailsHorizontalOffset: 0 });

      const result = reducer(state, { type: 'SCROLL_HORIZONTAL', direction: 'left' });

      expect(result.detailsHorizontalOffset).toBe(0);
    });
  });
});
