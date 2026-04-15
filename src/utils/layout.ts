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