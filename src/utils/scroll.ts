import { computeResponseLayout } from '../core/responseLayout';
import type { ResponseForLayout } from '../core/responseLayout';
import { formatResponseBody } from '../core/formatter';
import { getResponseContentWidth } from './layout';

export const RESPONSE_PANEL_VERTICAL_CHROME = 3;

export function getResponseTotalLines(options: {
  response: ResponseForLayout & { body: string };
  verbose: boolean;
  rawMode: boolean;
  wrapMode: 'nowrap' | 'wrap';
  columns: number;
}): number {
  const { response, verbose, rawMode, wrapMode, columns } = options;
  const contentWidth = getResponseContentWidth(columns);
  const formattedBody = formatResponseBody(response.body, rawMode);
  const layout = computeResponseLayout({
    response,
    verbose,
    rawMode,
    wrapMode,
    contentWidth,
    formattedBody,
  });
  return layout.totalVisualLines;
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