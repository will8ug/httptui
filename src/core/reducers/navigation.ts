import { getRequestVisibleHeight } from '../../utils/layout';
import type { Action, AppState } from '../types';
import { clamp, clampScrollOffsetToCursor, detailsHorizontalMaxOffset, detailsVerticalMaxOffset, INITIAL_SEARCH, navigateRequests, requestsHorizontalMaxOffset, responseHorizontalMaxOffset, responseVerticalMaxOffset } from './helpers';

type NavigationAction = Extract<Action, { type: 'SELECT_REQUEST' | 'MOVE_SELECTION' | 'APPEND_REQUEST' | 'SWITCH_PANEL' | 'SCROLL' | 'SCROLL_HORIZONTAL' | 'JUMP_VERTICAL' | 'JUMP_HORIZONTAL' }>;

export function reduceNavigation(state: AppState, action: NavigationAction): AppState {
  switch (action.type) {
    case 'SELECT_REQUEST':
      return navigateRequests(state, action.index);

    case 'MOVE_SELECTION': {
      const delta = action.direction === 'up' ? -1 : 1;
      return navigateRequests(state, state.selectedIndex + delta);
    }

    case 'APPEND_REQUEST': {
      // Pasted requests carry lineNumber 0 as a "no file origin" placeholder; rewrite it
      // to max(existing) + 1 solely so RequestList's `${lineNumber}-${method}-${url}`
      // React keys stay unique across repeated pastes — never a file position.
      const maxLineNumber = state.requests.reduce((max, req) => Math.max(max, req.lineNumber), 0);
      const appended = { ...action.request, lineNumber: maxLineNumber + 1 };
      const nextState = { ...state, requests: [...state.requests, appended] };
      return navigateRequests(nextState, nextState.requests.length - 1);
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
      const leavesResponse = state.focusedPanel === 'response' && nextPanel !== 'response';
      return {
        ...state,
        focusedPanel: nextPanel,
        ...(leavesResponse && { search: INITIAL_SEARCH }),
      };
    }

    case 'SCROLL': {
      const delta = action.direction === 'up' ? -1 : 1;

      if (state.focusedPanel === 'details') {
        return {
          ...state,
          detailsScrollOffset: clamp(state.detailsScrollOffset + delta, 0, detailsVerticalMaxOffset(state)),
        };
      }

      if (state.focusedPanel === 'response') {
        return {
          ...state,
          responseScrollOffset: clamp(state.responseScrollOffset + delta, 0, responseVerticalMaxOffset(state)),
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
          detailsHorizontalOffset: clamp(state.detailsHorizontalOffset + horizontalDelta, 0, detailsHorizontalMaxOffset(state)),
        };
      }

      if (state.focusedPanel === 'response') {
        return {
          ...state,
          responseHorizontalOffset: clamp(state.responseHorizontalOffset + horizontalDelta, 0, responseHorizontalMaxOffset(state)),
        };
      }

      return {
        ...state,
        requestHorizontalOffset: clamp(state.requestHorizontalOffset + horizontalDelta, 0, requestsHorizontalMaxOffset(state)),
      };
    }

    case 'JUMP_VERTICAL': {
      if (state.focusedPanel === 'requests') {
        const lastIndex = Math.max(0, state.requests.length - 1);
        const nextIndex = action.direction === 'start' ? 0 : lastIndex;
        const visibleCount = getRequestVisibleHeight(state.geometry.rows);
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
        return {
          ...state,
          detailsScrollOffset: action.direction === 'start' ? 0 : detailsVerticalMaxOffset(state),
        };
      }

      return {
        ...state,
        responseScrollOffset: action.direction === 'start' ? 0 : responseVerticalMaxOffset(state),
      };
    }

    case 'JUMP_HORIZONTAL': {
      if (state.focusedPanel === 'response' && state.wrapMode === 'wrap') {
        return state;
      }

      if (state.focusedPanel === 'requests') {
        if (action.direction === 'start') {
          return { ...state, requestHorizontalOffset: 0 };
        }
        return { ...state, requestHorizontalOffset: requestsHorizontalMaxOffset(state) };
      }

      if (state.focusedPanel === 'details') {
        if (action.direction === 'start') {
          return { ...state, detailsHorizontalOffset: 0 };
        }
        return { ...state, detailsHorizontalOffset: detailsHorizontalMaxOffset(state) };
      }

      if (action.direction === 'start') {
        return { ...state, responseHorizontalOffset: 0 };
      }
      return { ...state, responseHorizontalOffset: responseHorizontalMaxOffset(state) };
    }
  }
}
