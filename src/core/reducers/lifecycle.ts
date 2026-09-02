import type { Action, AppState } from '../types';
import { mergeVariables } from '../variables';
import { CLEAR_SEARCH_STATE, setTransient } from './helpers';

type RequestLifecycleAction = Extract<Action, { type: 'SEND_REQUEST' | 'RECEIVE_RESPONSE' | 'REQUEST_ERROR' | 'REQUEST_CANCEL' | 'RELOAD_FILE' }>;

export function reduceRequestLifecycle(state: AppState, action: RequestLifecycleAction): AppState {
  switch (action.type) {
    case 'SEND_REQUEST':
      return {
        ...state,
        isLoading: true,
        requestError: null,
        responseScrollOffset: 0,
        responseHorizontalOffset: 0,
        ...CLEAR_SEARCH_STATE,
      };

    case 'RECEIVE_RESPONSE':
      return {
        ...state,
        response: action.response,
        requestError: null,
        isLoading: false,
        responseScrollOffset: 0,
        ...CLEAR_SEARCH_STATE,
      };

    case 'REQUEST_ERROR':
      return {
        ...state,
        response: null,
        requestError: action.error,
        isLoading: false,
        responseScrollOffset: 0,
        ...CLEAR_SEARCH_STATE,
      };

    case 'REQUEST_CANCEL':
      return {
        ...state,
        isLoading: false,
        ...setTransient({ warning: action.warning }),
      };

    case 'RELOAD_FILE': {
      const currentRequestName = state.requests[state.selectedIndex]?.name;
      const newIndex = currentRequestName
        ? action.requests.findIndex((req) => req.name === currentRequestName)
        : -1;

      return {
        ...state,
        requests: action.requests,
        fileVariables: action.variables,
        variables: mergeVariables(action.variables, state.environmentVariables),
        selectedIndex: newIndex >= 0 ? newIndex : 0,
        response: null,
        requestError: null,
        responseScrollOffset: 0,
        requestScrollOffset: 0,
        detailsScrollOffset: 0,
        detailsHorizontalOffset: 0,
        ...setTransient({ message: 'Reloaded' }),
      };
    }
  }
}
