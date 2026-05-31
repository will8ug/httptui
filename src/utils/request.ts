import type { FileVariable, ParsedRequest } from '../core/types';
import { resolveVariables } from '../core/variables';
import { getDetailsTotalLines } from './scroll';

export interface ResolvedRequestDetails {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | undefined;
  totalContentLines: number;
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
    method: resolved.method,
    url: resolved.url,
    headers: resolved.headers,
    body: resolved.body,
  });

  return {
    ...resolved,
    totalContentLines,
  };
}