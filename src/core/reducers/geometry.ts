import { computeLayoutMetrics } from '../../utils/layout-metrics';
import { computeResponseViewport } from '../response-viewport';
import type { Action, AppState } from '../types';

type GeometryAction = Extract<Action, { type: 'SET_GEOMETRY' }>;

export function reduceGeometry(state: AppState, action: GeometryAction): AppState {
  const geometry = { rows: action.rows, columns: action.columns };

  if (state.response === null) {
    return { ...state, geometry };
  }

  const selectedRequest = state.requests[state.selectedIndex];
  const { effectiveResponseHeight } = computeLayoutMetrics(
    state,
    selectedRequest,
    action.rows,
    action.columns,
  );
  const { maxVerticalOffset } = computeResponseViewport({
    response: state.response,
    verbose: state.verbose,
    rawMode: state.rawMode,
    wrapMode: state.wrapMode,
    geometry: {
      columns: action.columns,
      availableHeight: effectiveResponseHeight,
      fullscreen: state.maximizedPanel === 'response',
      searchVisible: state.mode === 'search',
    },
  });

  return {
    ...state,
    geometry,
    responseScrollOffset: Math.min(state.responseScrollOffset, maxVerticalOffset),
  };
}
