import type { HttpMethod, ParsedRequest, ResolvedRequest } from '../../src/core/types';

export function makeRequests(count: number, opts?: { longUrl?: boolean }): ParsedRequest[] {
  const url = opts?.longUrl
    ? 'https://api.example.com/users/very-long-path/that/exceeds/panel/width'
    : 'https://a.co/b';

  return Array.from({ length: count }, (_, i) => ({
    name: `Request ${i + 1}`,
    method: 'GET' as HttpMethod,
    url,
    headers: {},
    body: undefined,
    lineNumber: i + 1,
  }));
}

export function createRequest(overrides: Partial<ParsedRequest> = {}): ParsedRequest {
  return {
    name: 'Test Request',
    method: 'GET',
    url: 'https://api.example.com/users',
    headers: {},
    body: undefined,
    lineNumber: 1,
    ...overrides,
  };
}

export function createResolvedRequest(overrides: Partial<ResolvedRequest> = {}): ResolvedRequest {
  return {
    method: 'GET',
    url: 'https://api.example.com/users',
    headers: {},
    body: undefined,
    ...overrides,
  };
}