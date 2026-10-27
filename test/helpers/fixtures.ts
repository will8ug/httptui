import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { importContent, type ImportSuccess } from '../../src/core/importer';
import type { ParsedRequest, FileVariable } from '../../src/core/types';

import { createRequest } from './requests';

const FIXTURE_ROOT = resolve(__dirname, '..', 'fixtures');

export function readFixture(relativePath: string): string {
  return readFileSync(resolve(FIXTURE_ROOT, relativePath), 'utf8');
}

/** Read a fixture file under test/fixtures and JSON.parse it exactly once. */
export function readJsonFixture(relativePath: string): unknown {
  return JSON.parse(readFixture(relativePath)) as unknown;
}

export function importOk(filePath: string, content: string): ImportSuccess {
  const outcome = importContent(filePath, content);
  if (!outcome.ok) {
    throw new Error(`expected successful import, got refusal: ${outcome.error}`);
  }
  return outcome;
}

export const sampleRequests: ParsedRequest[] = [
  createRequest({
    name: 'Get users',
    method: 'GET',
    url: 'https://api.example.com/users',
  }),
  createRequest({
    name: 'Create user',
    method: 'POST',
    url: 'https://api.example.com/users',
    headers: { 'Content-Type': 'application/json' },
    body: '{"name":"John"}',
  }),
  createRequest({
    name: 'Delete user',
    method: 'DELETE',
    url: 'https://api.example.com/users/1',
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