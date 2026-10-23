import { dirname } from 'node:path';

import { getRequestVisibleHeight } from '../../utils/layout';
import { computeLayoutMetrics } from '../../utils/layout-metrics';
import { getDetailsTotalLines, getMaxDetailsLineWidth, getMaxRequestLineWidth, getMaxScrollOffset } from '../../utils/scroll';
import { computeResponseViewport, getPanelContentWidth } from '../response-viewport';
import type { ResponseViewportModel } from '../response-viewport';
import type { AppState, ParsedRequest } from '../types';
import { resolveVariables } from '../variables';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function selectedRequest(state: AppState): ParsedRequest | undefined {
  return state.requests[state.selectedIndex];
}

/**
 * Builds the response viewport from state alone (geometry, panel visibility,
 * search-bar visibility), so reducer-derived bounds always match the model the
 * panel renders from. Returns null while no response is loaded.
 */
export function responseViewportFromState(state: AppState): ResponseViewportModel | null {
  if (state.response === null) {
    return null;
  }
  const { effectiveResponseHeight } = computeLayoutMetrics(
    state,
    selectedRequest(state),
    state.geometry.rows,
    state.geometry.columns,
  );
  return computeResponseViewport({
    response: state.response,
    verbose: state.verbose,
    rawMode: state.rawMode,
    wrapMode: state.wrapMode,
    geometry: {
      columns: state.geometry.columns,
      availableHeight: effectiveResponseHeight,
      fullscreen: state.maximizedPanel === 'response',
      searchVisible: state.mode === 'search' || state.lastSearchQuery !== '',
    },
  });
}

export function responseVerticalMaxOffset(state: AppState): number {
  return responseViewportFromState(state)?.maxVerticalOffset ?? 0;
}

export function responseHorizontalMaxOffset(state: AppState): number {
  const model = responseViewportFromState(state);
  if (model === null) {
    return 0;
  }
  return Math.max(0, model.maxLineDisplayWidth - model.contentWidth);
}

export function detailsVerticalMaxOffset(state: AppState): number {
  const request = selectedRequest(state);
  if (!request) {
    return 0;
  }
  const { effectiveDetailMaxContent } = computeLayoutMetrics(
    state,
    request,
    state.geometry.rows,
    state.geometry.columns,
  );
  const resolved = resolveVariables(request, state.variables);
  const totalLines = getDetailsTotalLines({
    method: resolved.method,
    url: resolved.url,
    headers: resolved.headers,
    body: resolved.body,
  });
  return getMaxScrollOffset(totalLines, effectiveDetailMaxContent);
}

export function detailsHorizontalMaxOffset(state: AppState): number {
  const contentWidth = getPanelContentWidth({
    panel: 'details',
    maximizedPanel: state.maximizedPanel,
    columns: state.geometry.columns,
  });
  return Math.max(0, getMaxDetailsLineWidth({ request: selectedRequest(state), variables: state.variables }) - contentWidth);
}

export function requestsHorizontalMaxOffset(state: AppState): number {
  const contentWidth = getPanelContentWidth({
    panel: 'requests',
    maximizedPanel: state.maximizedPanel,
    columns: state.geometry.columns,
  });
  return Math.max(0, getMaxRequestLineWidth({ requests: state.requests, variables: state.variables, baseDir: dirname(state.filePath) }) - contentWidth);
}

export function clampScrollOffsetToCursor(selectedIndex: number, currentOffset: number, visibleCount: number): number {
  if (selectedIndex < currentOffset) {
    return selectedIndex;
  }

  if (selectedIndex >= currentOffset + visibleCount) {
    return selectedIndex - visibleCount + 1;
  }

  return currentOffset;
}

export const CLEAR_SEARCH_STATE = {
  searchQuery: '',
  searchMatches: [] as number[],
  currentMatchIndex: 0,
  lastSearchQuery: '',
};

export const EMPTY_EDIT_BUFFERS = {
  body: { text: '', cursor: 0 },
  headers: { text: '', cursor: 0 },
  url: { text: '', cursor: 0 },
};

export function setTransient(
  transient: { message?: string | null; error?: string | null; warning?: string | null },
): Pick<AppState, 'transientMessage' | 'transientError' | 'transientWarning'> {
  return {
    transientMessage: transient.message ?? null,
    transientError: transient.error ?? null,
    transientWarning: transient.warning ?? null,
  };
}

export function navigateRequests(state: AppState, nextIndex: number): AppState {
  const index = clamp(nextIndex, 0, state.requests.length - 1);
  const visibleCount = getRequestVisibleHeight(state.geometry.rows);
  return {
    ...state,
    selectedIndex: index,
    requestScrollOffset: clampScrollOffsetToCursor(index, state.requestScrollOffset, visibleCount),
    requestHorizontalOffset: 0,
    detailsScrollOffset: 0,
    detailsHorizontalOffset: 0,
  };
}

export function computeSearchScrollOffset(visualIndex: number, maxOffset: number): number {
  return Math.min(Math.max(0, visualIndex), maxOffset);
}
