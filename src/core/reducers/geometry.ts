import type { Action, AppState } from '../types';
import { detailsVerticalMaxOffset, responseVerticalMaxOffset } from './helpers';

type GeometryAction = Extract<Action, { type: 'SET_GEOMETRY' }>;

export function reduceGeometry(state: AppState, action: GeometryAction): AppState {
  const next: AppState = { ...state, geometry: { rows: action.rows, columns: action.columns } };

  const responseScrollOffset = next.response === null
    ? next.responseScrollOffset
    : Math.min(next.responseScrollOffset, responseVerticalMaxOffset(next));
  const detailsScrollOffset = next.focusedPanel === 'details'
    ? Math.min(next.detailsScrollOffset, detailsVerticalMaxOffset(next))
    : next.detailsScrollOffset;

  return { ...next, responseScrollOffset, detailsScrollOffset };
}
