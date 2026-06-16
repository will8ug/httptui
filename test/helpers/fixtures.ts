import type { ParsedRequest, FileVariable } from '../../src/core/types';

import { createRequest } from './requests';

export const sampleRequests: ParsedRequest[] = [
  createRequest({
    name: 'Get users',
    method: 'GET',
    url: 'https://api.example.com/users',
    lineNumber: 1,
  }),
  createRequest({
    name: 'Create user',
    method: 'POST',
    url: 'https://api.example.com/users',
    headers: { 'Content-Type': 'application/json' },
    body: '{"name":"John"}',
    lineNumber: 8,
  }),
  createRequest({
    name: 'Delete user',
    method: 'DELETE',
    url: 'https://api.example.com/users/1',
    lineNumber: 15,
  }),
];

export const sampleVariables: FileVariable[] = [
  { name: 'baseUrl', value: 'https://api.example.com' },
];

/**
 * Convert FileVariable[] to a Map for easy assertion lookups.
 */
export function toVarMap(vars: FileVariable[]): Map<string, string> {
  return new Map(vars.map(v => [v.name, v.value]));
}