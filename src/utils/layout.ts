export const DEFAULT_TERMINAL_COLUMNS = 80;
export const DEFAULT_TERMINAL_ROWS = 24;
export const MIN_CONTENT_AREA_ROWS = 3;

const LEFT_PANEL_RATIO = 0.3;
const LEFT_PANEL_MIN_WIDTH = 25;
const LEFT_PANEL_MAX_WIDTH = 36;
const MIN_REQUEST_CONTENT_WIDTH = 10;
const MIN_RESPONSE_CONTENT_WIDTH = 20;

/** Border (1 + 1) + paddingX (1 + 1) for the request list panel */
const REQUEST_PANEL_CHROME = 4;
/** Border (1 + 1) + paddingX (1 + 1) for the response panel, plus 2 for adjacent panel border overlap */
const RESPONSE_PANEL_CHROME = 6;

export function getLeftPanelWidth(columns: number): number {
  const proportionalWidth = Math.floor(columns * LEFT_PANEL_RATIO);
  return Math.max(LEFT_PANEL_MIN_WIDTH, Math.min(proportionalWidth, LEFT_PANEL_MAX_WIDTH));
}

export function getRequestContentWidth(columns: number): number {
  return Math.max(MIN_REQUEST_CONTENT_WIDTH, getLeftPanelWidth(columns) - REQUEST_PANEL_CHROME);
}

export function getResponseContentWidth(columns: number): number {
  return Math.max(MIN_RESPONSE_CONTENT_WIDTH, columns - getLeftPanelWidth(columns) - RESPONSE_PANEL_CHROME);
}

export function getDetailPanelHeight(
  totalContentLines: number,
  maxContentLines: number,
): number {
  const BORDER_ROWS = 2;
  return Math.min(totalContentLines, maxContentLines) + BORDER_ROWS;
}