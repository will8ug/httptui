import { computeResponseLayout, formatStatusLine } from '../core/response-layout';
import type { ResponseForLayout } from '../core/response-layout';
import { formatResponseBody } from '../core/formatter';
import { resolveVariables } from '../core/variables';
import { getRequestTarget } from './request';
import { getResponseContentWidth } from './layout';
import type { FileVariable, ParsedRequest, ResponseData } from '../core/types';

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
  formdataFields?: Array<{ key: string; value: string }>;
}): number {
  const headerEntries = Object.entries(options.headers);
  const headerSeparator = headerEntries.length > 0 ? 1 : 0;
  const bodyLines = options.body !== undefined ? options.body.split('\n') : [];
  const formdataLines = options.formdataFields ? options.formdataFields.length : 0;
  return 3 + headerEntries.length + headerSeparator + formdataLines + bodyLines.length;
}

export function getMaxScrollOffset(totalLines: number, visibleHeight: number): number {
  return Math.max(0, totalLines - visibleHeight);
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
      return 2 + 7 + getRequestTarget(resolved.url).length;
    }),
  );
}

export function getMaxResponseLineWidth(options: {
  response: ResponseData | null;
  verbose: boolean;
  rawMode: boolean;
}): number {
  const { response, verbose, rawMode } = options;
  if (!response) {
    return 0;
  }

  const lines: string[] = [];
  const res = response;

  lines.push(formatStatusLine(res).map((segment) => segment.text).join(''));

  if (verbose) {
    for (const [name, value] of Object.entries(res.headers)) {
      lines.push(`${name}: ${value}`);
    }
  }

  const formattedBody = formatResponseBody(res.body, rawMode);
  lines.push(...formattedBody.split('\n'));

  return Math.max(0, ...lines.map((l) => l.length));
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

  return Math.max(0, ...lines.map((l) => l.length));
}