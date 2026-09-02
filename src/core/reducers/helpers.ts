import { DEFAULT_TERMINAL_ROWS, getRequestVisibleHeight } from '../../utils/layout';
import type { AppState } from '../types';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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

export function navigateRequests(state: AppState, nextIndex: number, rows?: number): AppState {
  const index = clamp(nextIndex, 0, state.requests.length - 1);
  const visibleCount = getRequestVisibleHeight(rows ?? DEFAULT_TERMINAL_ROWS);
  return {
    ...state,
    selectedIndex: index,
    requestScrollOffset: clampScrollOffsetToCursor(index, state.requestScrollOffset, visibleCount),
    requestHorizontalOffset: 0,
    detailsScrollOffset: 0,
    detailsHorizontalOffset: 0,
  };
}

export function computeSearchScrollOffset(visualIndex: number, maxOffset?: number): number {
  if (maxOffset !== undefined) {
    return Math.min(Math.max(0, visualIndex), maxOffset);
  }
  return Math.max(0, visualIndex);
}
