import type { Action, AppState } from '../types';
import { CLEAR_SEARCH_STATE } from './helpers';

type TogglesAction = Extract<Action, { type: 'TOGGLE_VERBOSE' | 'TOGGLE_HELP' | 'CLOSE_HELP' | 'TOGGLE_WRAP' | 'TOGGLE_RAW' | 'TOGGLE_REQUEST_DETAILS' | 'TOGGLE_FULLSCREEN' }>;

export function reduceToggles(state: AppState, action: TogglesAction): AppState {
  switch (action.type) {
    case 'TOGGLE_VERBOSE':
      return {
        ...state,
        verbose: !state.verbose,
      };

    case 'TOGGLE_HELP':
      return {
        ...state,
        showHelp: !state.showHelp,
      };

    case 'CLOSE_HELP':
      return {
        ...state,
        showHelp: false,
      };

    case 'TOGGLE_WRAP':
      return {
        ...state,
        wrapMode: state.wrapMode === 'nowrap' ? 'wrap' : 'nowrap',
        responseScrollOffset: 0,
        responseHorizontalOffset: 0,
      };

    case 'TOGGLE_RAW':
      return {
        ...state,
        rawMode: !state.rawMode,
        ...CLEAR_SEARCH_STATE,
      };

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

    case 'TOGGLE_FULLSCREEN': {
      if (state.maximizedPanel === null) {
        const panel = state.focusedPanel;
        return {
          ...state,
          maximizedPanel: panel,
          ...(panel === 'requests' ? { requestHorizontalOffset: 0 } : {}),
          ...(panel === 'response' ? { responseHorizontalOffset: 0 } : {}),
          ...(panel === 'details' ? { detailsHorizontalOffset: 0 } : {}),
        };
      }

      const previousPanel = state.maximizedPanel;
      return {
        ...state,
        maximizedPanel: null,
        ...(previousPanel === 'requests' ? { requestHorizontalOffset: 0 } : {}),
        ...(previousPanel === 'response' ? { responseHorizontalOffset: 0 } : {}),
        ...(previousPanel === 'details' ? { detailsHorizontalOffset: 0 } : {}),
      };
    }
  }
}
