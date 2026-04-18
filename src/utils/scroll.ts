import { colorizeJson } from './colors';
import { getResponseContentWidth } from './layout';
import { wrapColorizedSegments, wrapLine } from './wrap';

export const RESPONSE_PANEL_VERTICAL_CHROME = 3;

function isJsonString(value: string): boolean {
  if (value.trim() === '') {
    return false;
  }
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

export function getResponseTotalLines(options: {
  response: { body: string; statusCode: number; statusText: string; headers: Record<string, string>; timing: { durationMs: number } };
  verbose: boolean;
  rawMode: boolean;
  wrapMode: 'nowrap' | 'wrap';
  columns: number;
}): number {
  const { response, verbose, rawMode, wrapMode, columns } = options;
  const contentWidth = getResponseContentWidth(columns);
  const isJsonBody = !rawMode && isJsonString(response.body);
  const statusText = `HTTP/1.1 ${response.statusCode} ${response.statusText}  ${Math.round(response.timing.durationMs)}ms`;

  if (wrapMode === 'wrap') {
    let count = statusText.length <= contentWidth ? 1 : wrapLine(statusText, contentWidth).length;

    if (verbose) {
      for (const [name, value] of Object.entries(response.headers)) {
        count += wrapLine(`${name}: ${value}`, contentWidth).length;
      }
    }

    count += 1;

    for (const line of response.body.split('\n')) {
      if (isJsonBody) {
        const segments = colorizeJson(line === '' ? ' ' : line);
        count += wrapColorizedSegments(segments, contentWidth).length;
      } else {
        count += wrapLine(line === '' ? ' ' : line, contentWidth).length;
      }
    }

    return count;
  }

  return 1
    + (verbose ? Object.keys(response.headers).length : 0)
    + 1
    + response.body.split('\n').length;
}

export function getDetailsTotalLines(options: {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | undefined;
}): number {
  const headerEntries = Object.entries(options.headers);
  const headerSeparator = headerEntries.length > 0 ? 1 : 0;
  const bodyLines = options.body !== undefined ? options.body.split('\n') : [];
  return 3 + headerEntries.length + headerSeparator + bodyLines.length;
}

export function getMaxScrollOffset(totalLines: number, visibleHeight: number): number {
  return Math.max(0, totalLines - visibleHeight);
}