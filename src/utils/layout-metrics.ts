import type { AppState, ParsedRequest } from '../core/types';
import { resolveRequestDetails } from './request';
import {
  getDetailPanelHeight,
  getEditorContentWidth,
  getEditorVisibleHeight,
  getFullscreenContentWidth,
  getFullscreenRequestContentWidth,
  getFullscreenVisibleHeight,
} from './layout';

const DETAIL_PANEL_MAX_CONTENT = 10;

export interface LayoutMetrics {
  detailsTotalLines: number;
  responseAvailableHeight: number;
  fullscreenContentWidth: number;
  fullscreenRequestContentWidth: number;
  fullscreenVisibleHeight: number;
  editorContentWidth: number;
  editorVisibleHeight: number;
  effectiveResponseHeight: number;
  effectiveDetailMaxContent: number;
}

export function computeLayoutMetrics(
  state: AppState,
  selectedRequest: ParsedRequest | undefined,
  rows: number,
  columns: number,
): LayoutMetrics {
  let detailPanelHeight = 0;
  let detailsTotalLines = 0;
  if (state.showRequestDetails && selectedRequest) {
    const resolved = resolveRequestDetails(selectedRequest, state.variables);
    detailsTotalLines = resolved.totalContentLines;
    detailPanelHeight = getDetailPanelHeight(detailsTotalLines, DETAIL_PANEL_MAX_CONTENT);
  }

  const responseAvailableHeight = rows - 1 - detailPanelHeight;
  const fullscreenAvailableHeight = rows - 1;
  const fullscreenContentWidth = getFullscreenContentWidth(columns);
  const fullscreenRequestContentWidth = getFullscreenRequestContentWidth(columns);
  const fullscreenVisibleHeight = getFullscreenVisibleHeight(fullscreenAvailableHeight);
  const editorContentWidth = getEditorContentWidth(columns);
  const editorVisibleHeight = getEditorVisibleHeight(rows);

  return {
    detailsTotalLines,
    responseAvailableHeight,
    fullscreenContentWidth,
    fullscreenRequestContentWidth,
    fullscreenVisibleHeight,
    editorContentWidth,
    editorVisibleHeight,
    effectiveResponseHeight: state.maximizedPanel === 'response' ? fullscreenAvailableHeight : responseAvailableHeight,
    effectiveDetailMaxContent: state.maximizedPanel === 'details' ? fullscreenVisibleHeight : DETAIL_PANEL_MAX_CONTENT,
  };
}
