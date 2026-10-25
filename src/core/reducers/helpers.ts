import { dirname } from 'node:path';

import { getPanelContentWidth, getRequestVisibleHeight } from '../../utils/layout';
import { computeLayoutMetrics } from '../../utils/layout-metrics';
import { getRequestTarget, resolveRequestDetails } from '../../utils/request';
import { cellWidth } from '../../utils/text';
import { computeResponseViewport } from '../response-viewport';
import type { ResponseViewportModel } from '../response-viewport';
import type { AppState, FileVariable, ParsedRequest } from '../types';
import { resolveVariables } from '../variables';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function selectedRequest(state: AppState): ParsedRequest | undefined {
  return state.requests[state.selectedIndex];
}

/**
 * Canonical search-active predicate: the search bar is open (mode) or a
 * confirmed query lingers. searchMatches is deliberately not consulted: the
 * reducers couple it to lastSearchQuery (set together, cleared together).
 * Callers run only in normal mode (search mode is routed to the search input
 * handler first), so the mode disjunct is unreachable at those sites.
 */
export function isSearchActive(state: AppState): boolean {
  return state.mode === 'search' || state.lastSearchQuery !== '';
}

/**
 * Canonical response-visible predicate: the response panel is rendered —
 * always in split view (no panel maximized), and in fullscreen only when the
 * response panel is the maximized one. Keys that operate on the response
 * (display toggles, search entry) are gated on this; details-maximized counts
 * as not visible, where those keys are no-ops.
 */
export function responseVisible(state: AppState): boolean {
  return state.maximizedPanel === null || state.maximizedPanel === 'response';
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
      searchVisible: isSearchActive(state),
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

export function getMaxRequestLineWidth(options: {
  requests: readonly ParsedRequest[];
  variables: FileVariable[];
  baseDir?: string;
}): number {
  const { requests, variables, baseDir } = options;
  if (requests.length === 0) {
    return 0;
  }

  return Math.max(
    ...requests.map((r) => {
      const resolved = resolveVariables(r, variables, baseDir);
      return 2 + 7 + cellWidth(getRequestTarget(resolved.url));
    }),
  );
}

export function getMaxDetailsLineWidth(options: {
  request: ParsedRequest | undefined;
  variables: FileVariable[];
}): number {
  const { request, variables } = options;
  if (!request) {
    return 0;
  }

  const resolved = resolveVariables(request, variables);
  const lines: string[] = [];

  lines.push(`${resolved.method} ${resolved.url}`);

  for (const [name, value] of Object.entries(resolved.headers)) {
    lines.push(`${name}: ${value}`);
  }

  if (resolved.body !== undefined) {
    lines.push(...resolved.body.split('\n'));
  }

  return Math.max(0, ...lines.map((l) => cellWidth(l)));
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
  // Matches the details totals derivation (the same count the panel height
  // uses), not every rendered line: the form-data separator is uncounted.
  const { totalContentLines } = resolveRequestDetails(request, state.variables);
  return Math.max(0, totalContentLines - effectiveDetailMaxContent);
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
