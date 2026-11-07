import type { Action, AppState } from '../types';
import { mergeVariables } from '../variables';
import { INITIAL_SEARCH, responseVerticalMaxOffset, setTransient, warningSuffix } from './helpers';

type RequestLifecycleAction = Extract<Action, { type: 'SEND_REQUEST' | 'RECEIVE_RESPONSE_HEADERS' | 'APPEND_RESPONSE_BODY' | 'RECEIVE_RESPONSE' | 'REQUEST_ERROR' | 'REQUEST_CANCEL' | 'RELOAD_FILE' }>;

export function reduceRequestLifecycle(state: AppState, action: RequestLifecycleAction): AppState {
  switch (action.type) {
    case 'SEND_REQUEST':
      return {
        ...state,
        isLoading: true,
        response: null,
        requestError: null,
        responseScrollOffset: 0,
        responseHorizontalOffset: 0,
        search: INITIAL_SEARCH,
      };

    // The loading flag intentionally stays set: a headers-time response
    // coexists with loading (ADR 0004) until completion or cancellation.
    case 'RECEIVE_RESPONSE_HEADERS':
      // Headers arriving after loading has ended come from a canceled or
      // completed request's in-flight callback and must not replace the
      // kept response.
      if (!state.isLoading) {
        return state;
      }

      return {
        ...state,
        response: action.response,
      };

    // Appends are a streaming-phase transition: once loading has ended the
    // response is complete or canceled, and a coalesced flush still in flight
    // for it must not grow it.
    case 'APPEND_RESPONSE_BODY': {
      if (!state.isLoading || !state.response) {
        return state;
      }

      // Follow-tail is position-derived, not a mode flag: attachment is
      // re-derived from the offset on every append, so scrolling away and
      // jumping back to the bottom need no bookkeeping here.
      const attached = state.responseScrollOffset >= responseVerticalMaxOffset(state);

      const grown: AppState = {
        ...state,
        response: {
          ...state.response,
          body: state.response.body + action.chunk.display,
          rawBody: state.response.rawBody + action.chunk.raw,
          size: {
            ...state.response.size,
            bodyBytes: state.response.size.bodyBytes + action.chunk.bytes,
          },
        },
      };

      return attached
        ? { ...grown, responseScrollOffset: responseVerticalMaxOffset(grown) }
        : grown;
    }

    case 'RECEIVE_RESPONSE':
      return {
        ...state,
        response: action.response,
        requestError: null,
        isLoading: false,
        responseScrollOffset: 0,
        search: INITIAL_SEARCH,
      };

    case 'REQUEST_ERROR':
      return {
        ...state,
        response: null,
        requestError: action.error,
        isLoading: false,
        responseScrollOffset: 0,
        search: INITIAL_SEARCH,
      };

    case 'REQUEST_CANCEL':
      return {
        ...state,
        isLoading: false,
        response: state.response === null ? null : { ...state.response, canceled: true },
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
        sourceFormat: action.format,
        selectedIndex: newIndex >= 0 ? newIndex : 0,
        response: null,
        requestError: null,
        responseScrollOffset: 0,
        requestScrollOffset: 0,
        detailsScrollOffset: 0,
        detailsHorizontalOffset: 0,
        ...setTransient({ message: `Reloaded${warningSuffix(action.warningCount)}` }),
        search: INITIAL_SEARCH,
      };
    }
  }
}
