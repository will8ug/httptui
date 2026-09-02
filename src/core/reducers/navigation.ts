import { dirname } from 'node:path';

import { DEFAULT_TERMINAL_ROWS, getRequestContentWidth, getRequestVisibleHeight, getResponseContentWidth } from '../../utils/layout';
import { getMaxDetailsLineWidth, getMaxRequestLineWidth, getMaxResponseLineWidth } from '../../utils/scroll';
import type { Action, AppState } from '../types';
import { CLEAR_SEARCH_STATE, clampScrollOffsetToCursor, navigateRequests } from './helpers';

type NavigationAction = Extract<Action, { type: 'SELECT_REQUEST' | 'MOVE_SELECTION' | 'APPEND_REQUEST' | 'SWITCH_PANEL' | 'SCROLL' | 'SCROLL_HORIZONTAL' | 'JUMP_VERTICAL' | 'JUMP_HORIZONTAL' }>;

export function reduceNavigation(state: AppState, action: NavigationAction): AppState {
  switch (action.type) {
    case 'SELECT_REQUEST':
      return {
        ...navigateRequests(state, action.index, action.rows),
        ...CLEAR_SEARCH_STATE,
      };

    case 'MOVE_SELECTION': {
      const delta = action.direction === 'up' ? -1 : 1;
      return {
        ...navigateRequests(state, state.selectedIndex + delta, action.rows),
        ...CLEAR_SEARCH_STATE,
      };
    }

    case 'APPEND_REQUEST': {
      // Pasted requests carry lineNumber 0 as a "no file origin" placeholder; rewrite it
      // to max(existing) + 1 solely so RequestList's `${lineNumber}-${method}-${url}`
      // React keys stay unique across repeated pastes — never a file position.
      const maxLineNumber = state.requests.reduce((max, req) => Math.max(max, req.lineNumber), 0);
      const appended = { ...action.request, lineNumber: maxLineNumber + 1 };
      const nextState = { ...state, requests: [...state.requests, appended] };
      return {
        ...navigateRequests(nextState, nextState.requests.length - 1),
        ...CLEAR_SEARCH_STATE,
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
      const maxOffset = action.maxOffset;

      if (state.focusedPanel === 'details') {
        const next = state.detailsScrollOffset + delta;
        return {
          ...state,
          detailsScrollOffset: maxOffset !== undefined
            ? Math.min(Math.max(0, next), maxOffset)
            : Math.max(0, next),
        };
      }

      if (state.focusedPanel === 'response') {
        const next = state.responseScrollOffset + delta;
        return {
          ...state,
          responseScrollOffset: maxOffset !== undefined
            ? Math.min(Math.max(0, next), maxOffset)
            : Math.max(0, next),
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

      const columns = action.columns ?? 80;
      const horizontalDelta = action.direction === 'left' ? -2 : 2;

      if (state.focusedPanel === 'details') {
        const contentWidth = getResponseContentWidth(columns);
        const maxOffset = Math.max(0, getMaxDetailsLineWidth({ request: state.requests[state.selectedIndex], variables: state.variables }) - contentWidth);
        return {
          ...state,
          detailsHorizontalOffset: Math.min(Math.max(0, state.detailsHorizontalOffset + horizontalDelta), maxOffset),
        };
      }

      if (state.focusedPanel === 'response') {
        const contentWidth = getResponseContentWidth(columns);
        const maxOffset = Math.max(0, getMaxResponseLineWidth({ response: state.response, verbose: state.verbose, rawMode: state.rawMode }) - contentWidth);
        return {
          ...state,
          responseHorizontalOffset: Math.min(Math.max(0, state.responseHorizontalOffset + horizontalDelta), maxOffset),
        };
      }

      const contentWidth = getRequestContentWidth(columns);
      const maxOffset = Math.max(0, getMaxRequestLineWidth({ requests: state.requests, variables: state.variables, baseDir: dirname(state.filePath) }) - contentWidth);
      return {
        ...state,
        requestHorizontalOffset: Math.min(Math.max(0, state.requestHorizontalOffset + horizontalDelta), maxOffset),
      };
    }

    case 'JUMP_VERTICAL': {
      if (state.focusedPanel === 'requests') {
        const lastIndex = Math.max(0, state.requests.length - 1);
        const nextIndex = action.direction === 'start' ? 0 : lastIndex;
        const visibleCount = getRequestVisibleHeight(action.rows ?? DEFAULT_TERMINAL_ROWS);
        return {
          ...state,
          selectedIndex: nextIndex,
          requestScrollOffset: clampScrollOffsetToCursor(nextIndex, state.requestScrollOffset, visibleCount),
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

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- discriminated union narrowing is correct but TS infers always-true
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
        const maxOffset = Math.max(0, getMaxRequestLineWidth({ requests: state.requests, variables: state.variables, baseDir: dirname(state.filePath) }) - contentWidth);
        return { ...state, requestHorizontalOffset: maxOffset };
      }

      if (state.focusedPanel === 'details') {
        if (action.direction === 'start') {
          return { ...state, detailsHorizontalOffset: 0 };
        }
        const contentWidth = getResponseContentWidth(columns);
        const maxOffset = Math.max(0, getMaxDetailsLineWidth({ request: state.requests[state.selectedIndex], variables: state.variables }) - contentWidth);
        return { ...state, detailsHorizontalOffset: maxOffset };
      }

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- discriminated union narrowing is correct but TS infers always-true
      if (state.focusedPanel === 'response') {
        if (action.direction === 'start') {
          return { ...state, responseHorizontalOffset: 0 };
        }
        const contentWidth = getResponseContentWidth(columns);
        const maxOffset = Math.max(0, getMaxResponseLineWidth({ response: state.response, verbose: state.verbose, rawMode: state.rawMode }) - contentWidth);
        return { ...state, responseHorizontalOffset: maxOffset };
      }

      return state;
    }
  }
}
