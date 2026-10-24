import type { FileVariable, FormDataParam, ParsedRequest } from '../core/types';
import { resolveVariables } from '../core/variables';

export interface ResolvedRequestDetails {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | undefined;
  formdataFields?: FormDataParam[];
  totalContentLines: number;
}

/**
 * Counts the lines RequestDetailsView renders: title + request line +
 * separator (3), one line per header plus a header separator when any exist,
 * one line per form-data field, and one line per body line.
 */
function getDetailsTotalLines(options: {
  headers: Record<string, string>;
  body: string | undefined;
  formdataFields?: FormDataParam[];
}): number {
  const headerEntries = Object.entries(options.headers);
  const headerSeparator = headerEntries.length > 0 ? 1 : 0;
  const bodyLines = options.body !== undefined ? options.body.split('\n') : [];
  const formdataLines = options.formdataFields ? options.formdataFields.length : 0;
  return 3 + headerEntries.length + headerSeparator + formdataLines + bodyLines.length;
}

export function hasUnsavedChanges(requests: ParsedRequest[]): boolean {
  return requests.some((r) => r.isDirty);
}

export function getRequestTarget(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const target = `${parsedUrl.pathname || '/'}${parsedUrl.search}`;
    return target === '' ? '/' : target;
  } catch {
    return url;
  }
}

export function resolveRequestDetails(
  request: ParsedRequest,
  variables: FileVariable[],
): ResolvedRequestDetails {
  const resolved = resolveVariables(request, variables);
  const totalContentLines = getDetailsTotalLines({
    headers: resolved.headers,
    body: resolved.body,
    formdataFields: resolved.formdataFields,
  });

  return {
    ...resolved,
    totalContentLines,
  };
}