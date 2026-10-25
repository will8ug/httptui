import { formatResponseBody } from '../formatter';
import type { Action, AppState } from '../types';
import { INITIAL_SEARCH, computeSearchScrollOffset, responseVerticalMaxOffset } from './helpers';

type SearchAction = Extract<Action, { type: 'ENTER_SEARCH' | 'UPDATE_SEARCH_INPUT' | 'CONFIRM_SEARCH' | 'CANCEL_SEARCH' | 'NEXT_MATCH' | 'PREV_MATCH' }>;

function leaveSearch(state: AppState): AppState {
  const next: AppState = {
    ...state,
    mode: 'normal',
    search: INITIAL_SEARCH,
  };
  return {
    ...next,
    responseScrollOffset: Math.min(next.responseScrollOffset, responseVerticalMaxOffset(next)),
  };
}

export function reduceSearch(state: AppState, action: SearchAction): AppState {
  switch (action.type) {
    case 'ENTER_SEARCH': {
      if (!state.response) {
        return state;
      }
      return {
        ...state,
        mode: 'search',
        focusedPanel: 'response',
        search: { ...INITIAL_SEARCH, lastQuery: state.search.lastQuery },
      };
    }

    case 'UPDATE_SEARCH_INPUT':
      return {
        ...state,
        search: { ...state.search, query: action.value },
      };

    case 'CONFIRM_SEARCH': {
      if (!state.search.query || !state.response) {
        return leaveSearch(state);
      }

      const formattedBody = formatResponseBody(state.response.body, state.rawMode);
      const bodyLines = formattedBody.split('\n');
      const queryLower = state.search.query.toLowerCase();
      const matches: number[] = [];

      for (let i = 0; i < bodyLines.length; i++) {
        if (bodyLines[i].toLowerCase().includes(queryLower)) {
          matches.push(i);
        }
      }

      const scrollOffset = action.firstMatchVisualIndex !== undefined
        ? computeSearchScrollOffset(action.firstMatchVisualIndex, responseVerticalMaxOffset(state))
        : state.responseScrollOffset;

      return {
        ...state,
        mode: 'normal',
        search: { ...state.search, matches, currentMatchIndex: 0, lastQuery: state.search.query },
        responseScrollOffset: scrollOffset,
      };
    }

    case 'CANCEL_SEARCH':
      return leaveSearch(state);

    case 'NEXT_MATCH': {
      if (state.search.matches.length === 0) {
        return state;
      }
      const nextIndex = (state.search.currentMatchIndex + 1) % state.search.matches.length;
      const scrollOffset = computeSearchScrollOffset(action.targetVisualIndex, responseVerticalMaxOffset(state));
      return {
        ...state,
        search: { ...state.search, currentMatchIndex: nextIndex },
        responseScrollOffset: scrollOffset,
      };
    }

    case 'PREV_MATCH': {
      if (state.search.matches.length === 0) {
        return state;
      }
      const prevIndex = (state.search.currentMatchIndex - 1 + state.search.matches.length) % state.search.matches.length;
      const scrollOffset = computeSearchScrollOffset(action.targetVisualIndex, responseVerticalMaxOffset(state));
      return {
        ...state,
        search: { ...state.search, currentMatchIndex: prevIndex },
        responseScrollOffset: scrollOffset,
      };
    }
  }
}
