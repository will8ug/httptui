export const DEFAULT_TERMINAL_COLUMNS = 80;
export const DEFAULT_TERMINAL_ROWS = 24;
export const MIN_CONTENT_AREA_ROWS = 3;

export function getLeftPanelWidth(columns: number): number {
  const proportionalWidth = Math.floor(columns * 0.3);
  return Math.max(25, Math.min(proportionalWidth, 36));
}

export function getRequestContentWidth(columns: number): number {
  return Math.max(10, getLeftPanelWidth(columns) - 4);
}

export function getResponseContentWidth(columns: number): number {
  return Math.max(20, columns - getLeftPanelWidth(columns) - 6);
}

export function getDetailPanelHeight(
  headerCount: number,
  bodyLineCount: number,
  maxContentLines: number,
): number {
  const FIXED_LINES = 3;
  const BORDER_ROWS = 2;
  const headerSeparator = headerCount > 0 ? 1 : 0;
  const available = maxContentLines - FIXED_LINES - headerSeparator;

  let contentLines = FIXED_LINES;
  let remaining = available;

  if (headerCount > 0 && remaining > 0) {
    const shown = Math.min(headerCount, remaining);
    contentLines += shown;
    remaining -= shown;
    if (remaining > 0) {
      contentLines += 1;
      remaining -= 1;
    }
  }

  if (bodyLineCount > 0 && remaining > 0) {
    contentLines += Math.min(bodyLineCount, remaining);
  }

  return contentLines + BORDER_ROWS;
}