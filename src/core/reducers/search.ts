import { formatResponseBody } from '../formatter';
import type { Action, AppState } from '../types';
import { CLEAR_SEARCH_STATE, computeSearchScrollOffset } from './helpers';

type SearchAction = Extract<Action, { type: 'ENTER_SEARCH' | 'UPDATE_SEARCH_INPUT' | 'CONFIRM_SEARCH' | 'CANCEL_SEARCH' | 'NEXT_MATCH' | 'PREV_MATCH' }>;

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
        searchQuery: '',
        searchMatches: [],
        currentMatchIndex: 0,
      };
    }

    case 'UPDATE_SEARCH_INPUT':
      return {
        ...state,
        searchQuery: action.value,
      };

    case 'CONFIRM_SEARCH': {
      if (!state.searchQuery || !state.response) {
        return {
          ...state,
          mode: 'normal',
          ...CLEAR_SEARCH_STATE,
        };
      }

      const formattedBody = formatResponseBody(state.response.body, state.rawMode);
      const bodyLines = formattedBody.split('\n');
      const queryLower = state.searchQuery.toLowerCase();
      const matches: number[] = [];

      for (let i = 0; i < bodyLines.length; i++) {
        if (bodyLines[i].toLowerCase().includes(queryLower)) {
          matches.push(i);
        }
      }

      const scrollOffset = action.firstMatchVisualIndex !== undefined
        ? computeSearchScrollOffset(action.firstMatchVisualIndex, action.maxOffset)
        : state.responseScrollOffset;

      return {
        ...state,
        mode: 'normal',
        searchMatches: matches,
        currentMatchIndex: 0,
        lastSearchQuery: state.searchQuery,
        responseScrollOffset: scrollOffset,
      };
    }

    case 'CANCEL_SEARCH':
      return {
        ...state,
        mode: 'normal',
        ...CLEAR_SEARCH_STATE,
      };

    case 'NEXT_MATCH': {
      if (state.searchMatches.length === 0) {
        return state;
      }
      const nextIndex = (state.currentMatchIndex + 1) % state.searchMatches.length;
      const scrollOffset = computeSearchScrollOffset(action.targetVisualIndex, action.maxOffset);
      return {
        ...state,
        currentMatchIndex: nextIndex,
        responseScrollOffset: scrollOffset,
      };
    }

    case 'PREV_MATCH': {
      if (state.searchMatches.length === 0) {
        return state;
      }
      const prevIndex = (state.currentMatchIndex - 1 + state.searchMatches.length) % state.searchMatches.length;
      const scrollOffset = computeSearchScrollOffset(action.targetVisualIndex, action.maxOffset);
      return {
        ...state,
        currentMatchIndex: prevIndex,
        responseScrollOffset: scrollOffset,
      };
    }
  }
}
