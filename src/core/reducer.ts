import type { Action, AppState, AppProps } from './types';
import { formatResponseBody } from './formatter';
import { resolveVariables } from './variables';
import { getRequestContentWidth, getResponseContentWidth } from '../utils/layout';
import { getDetailsTotalLines, getMaxScrollOffset, getResponseTotalLines, RESPONSE_PANEL_VERTICAL_CHROME } from '../utils/scroll';
import { getRequestTarget } from '../utils/request';

export const REQUEST_SCROLL_WINDOW = 12;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getVisibleRequestOffset(selectedIndex: number, currentOffset: number): number {
  if (selectedIndex < currentOffset) {
    return selectedIndex;
  }

  if (selectedIndex >= currentOffset + REQUEST_SCROLL_WINDOW) {
    return selectedIndex - REQUEST_SCROLL_WINDOW + 1;
  }

  return currentOffset;
}

export const CLEAR_SEARCH_STATE = {
  searchQuery: '',
  searchMatches: [] as number[],
  currentMatchIndex: 0,
  lastSearchQuery: '',
};

export function getMaxRequestLineWidth(requests: readonly { url: string }[]): number {
  if (requests.length === 0) {
    return 0;
  }

  return Math.max(...requests.map((r) => 2 + 7 + getRequestTarget(r.url).length));
}

export function getMaxResponseLineWidth(state: AppState): number {
  if (!state.response) {
    return 0;
  }

  const lines: string[] = [];
  const res = state.response;

  lines.push(`HTTP/1.1 ${res.statusCode} ${res.statusText}  ${Math.round(res.timing.durationMs)}ms`);

  if (state.verbose) {
    for (const [name, value] of Object.entries(res.headers)) {
      lines.push(`${name}: ${value}`);
    }
  }

  lines.push(...res.body.split('\n'));

  return Math.max(0, ...lines.map((l) => l.length));
}

export function getMaxDetailsLineWidth(state: AppState): number {
  const request = state.requests[state.selectedIndex];
  if (!request) {
    return 0;
  }

  const resolved = resolveVariables(request, state.variables);
  const lines: string[] = [];

  lines.push(`${resolved.method} ${resolved.url}`);

  for (const [name, value] of Object.entries(resolved.headers)) {
    lines.push(`${name}: ${value}`);
  }

  if (resolved.body !== undefined) {
    lines.push(...resolved.body.split('\n'));
  }

  return Math.max(0, ...lines.map((l) => l.length));
}

export function computeVerticalMaxOffset(
  state: AppState,
  columns: number,
  responseAvailableHeight: number,
  detailPanelMaxContent: number,
): number | undefined {
  if (state.focusedPanel === 'details') {
    const request = state.requests[state.selectedIndex];
    if (!request) {
      return undefined;
    }
    const resolved = resolveVariables(request, state.variables);
    const totalContentLines = getDetailsTotalLines({
      method: resolved.method,
      url: resolved.url,
      headers: resolved.headers,
      body: resolved.body,
    });
    return getMaxScrollOffset(totalContentLines, detailPanelMaxContent);
  }

  if (state.focusedPanel === 'response' && state.response) {
    const totalLines = getResponseTotalLines({
      response: state.response,
      verbose: state.verbose,
      rawMode: state.rawMode,
      wrapMode: state.wrapMode,
      columns,
    });
    const visibleHeight = Math.max(1, responseAvailableHeight - RESPONSE_PANEL_VERTICAL_CHROME);
    return getMaxScrollOffset(totalLines, visibleHeight);
  }

  return undefined;
}

export function computeSearchScrollOffset(visualIndex: number, maxOffset?: number): number {
  if (maxOffset !== undefined) {
    return Math.min(Math.max(0, visualIndex), maxOffset);
  }
  return Math.max(0, visualIndex);
}

export function reducer(state: AppState, action: Action): AppState {
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
        ...CLEAR_SEARCH_STATE,
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
        ...CLEAR_SEARCH_STATE,
      };
    }

    case 'SEND_REQUEST':
      return {
        ...state,
        isLoading: true,
        error: null,
        responseScrollOffset: 0,
        responseHorizontalOffset: 0,
        ...CLEAR_SEARCH_STATE,
      };

    case 'RECEIVE_RESPONSE':
      return {
        ...state,
        response: action.response,
        error: null,
        isLoading: false,
        responseScrollOffset: 0,
        ...CLEAR_SEARCH_STATE,
      };

    case 'REQUEST_ERROR':
      return {
        ...state,
        response: null,
        error: action.error,
        isLoading: false,
        responseScrollOffset: 0,
        ...CLEAR_SEARCH_STATE,
      };

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
        const maxOffset = Math.max(0, getMaxDetailsLineWidth(state) - contentWidth);
        return {
          ...state,
          detailsHorizontalOffset: Math.min(Math.max(0, state.detailsHorizontalOffset + horizontalDelta), maxOffset),
        };
      }

      if (state.focusedPanel === 'response') {
        const contentWidth = getResponseContentWidth(columns);
        const maxOffset = Math.max(0, getMaxResponseLineWidth(state) - contentWidth);
        return {
          ...state,
          responseHorizontalOffset: Math.min(Math.max(0, state.responseHorizontalOffset + horizontalDelta), maxOffset),
        };
      }

      const contentWidth = getRequestContentWidth(columns);
      const maxOffset = Math.max(0, getMaxRequestLineWidth(state.requests) - contentWidth);
      return {
        ...state,
        requestHorizontalOffset: Math.min(Math.max(0, state.requestHorizontalOffset + horizontalDelta), maxOffset),
      };
    }

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

    case 'JUMP_VERTICAL': {
      if (state.focusedPanel === 'requests') {
        const lastIndex = Math.max(0, state.requests.length - 1);
        const nextIndex = action.direction === 'start' ? 0 : lastIndex;
        return {
          ...state,
          selectedIndex: nextIndex,
          requestScrollOffset: getVisibleRequestOffset(nextIndex, state.requestScrollOffset),
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
        const maxOffset = Math.max(0, getMaxRequestLineWidth(state.requests) - contentWidth);
        return { ...state, requestHorizontalOffset: maxOffset };
      }

      if (state.focusedPanel === 'details') {
        if (action.direction === 'start') {
          return { ...state, detailsHorizontalOffset: 0 };
        }
        const contentWidth = getResponseContentWidth(columns);
        const maxOffset = Math.max(0, getMaxDetailsLineWidth(state) - contentWidth);
        return { ...state, detailsHorizontalOffset: maxOffset };
      }

      if (state.focusedPanel === 'response') {
        if (action.direction === 'start') {
          return { ...state, responseHorizontalOffset: 0 };
        }
        const contentWidth = getResponseContentWidth(columns);
        const maxOffset = Math.max(0, getMaxResponseLineWidth(state) - contentWidth);
        return { ...state, responseHorizontalOffset: maxOffset };
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

    case 'CLEAR_RELOAD_MESSAGE':
      return {
        ...state,
        reloadMessage: null,
      };

    case 'ENTER_FILE_LOAD':
      return {
        ...state,
        mode: 'fileLoad',
        fileLoadInput: '',
        fileLoadError: null,
      };

    case 'UPDATE_FILE_LOAD_INPUT':
      return {
        ...state,
        fileLoadInput: action.value,
      };

    case 'SET_FILE_LOAD_ERROR':
      return {
        ...state,
        fileLoadError: action.error,
      };

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

    case 'CANCEL_FILE_LOAD':
      return {
        ...state,
        mode: 'normal',
        fileLoadInput: '',
        fileLoadError: null,
      };

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

    default:
      return state;
  }
}

export function createInitialState(props: AppProps): AppState {
  return {
    requests: props.requests,
    variables: props.variables,
    selectedIndex: 0,
    focusedPanel: 'requests',
    response: null,
    isLoading: false,
    error: null,
    verbose: false,
    showHelp: false,
    filePath: props.filePath,
    responseScrollOffset: 0,
    requestScrollOffset: 0,
    requestHorizontalOffset: 0,
    responseHorizontalOffset: 0,
    detailsScrollOffset: 0,
    detailsHorizontalOffset: 0,
    insecure: props.executorConfig.insecure,
    reloadMessage: null,
    mode: 'normal',
    fileLoadInput: '',
    fileLoadError: null,
    wrapMode: 'nowrap',
    showRequestDetails: false,
    rawMode: false,
    searchQuery: '',
    searchMatches: [],
    currentMatchIndex: 0,
    lastSearchQuery: '',
  };
}