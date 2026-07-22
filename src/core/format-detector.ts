/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { parse as parseYaml } from 'yaml';

import type { ParseResult } from './types';
import { parseHttpFile } from './parser';
import { parsePostmanCollection } from './postman-parser';
import { parseOpenApiSpec } from './openapi-parser';

const YAML_MARKER_RE = /^(openapi|swagger)\s*:/m;
const JSON_MARKER_RE = /"(openapi|swagger)"\s*:/;

export function detectFormat(filePath: string, content: string): 'http' | 'postman' | 'openapi' {
  const lower = filePath.toLowerCase();

  if (lower.endsWith('.json')) {
    try {
      const parsed = JSON.parse(content);

      if (parsed && String(parsed.openapi ?? '')) {
        return 'openapi';
      }

      if (parsed && String(parsed.swagger ?? '')) {
        return 'openapi';
      }

      if (parsed?.info?.schema && typeof parsed.info.schema === 'string' && parsed.info.schema.toLowerCase().includes('postman')) {
        return 'postman';
      }

      if (parsed?.info && parsed?.item !== undefined) {
        return 'postman';
      }
    } catch (e) {
      if (JSON_MARKER_RE.test(content)) {
        throw new Error(`Failed to parse OpenAPI spec: invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return 'http';
  }

  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) {
    try {
      const parsed = parseYaml(content);

      if (parsed && String(parsed.openapi ?? '')) {
        return 'openapi';
      }

      if (parsed && String(parsed.swagger ?? '')) {
        return 'openapi';
      }
    } catch (e) {
      if (YAML_MARKER_RE.test(content)) {
        throw new Error(`Failed to parse OpenAPI spec: invalid YAML: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return 'http';
  }

  return 'http';
}

export function parseAnyFormat(filePath: string, content: string): ParseResult {
  const format = detectFormat(filePath, content);

  if (format === 'postman') {
    return parsePostmanCollection(content);
  }

  if (format === 'openapi') {
    const lower = filePath.toLowerCase();
    const doc = lower.endsWith('.json') ? JSON.parse(content) : parseYaml(content);
    return parseOpenApiSpec(doc);
  }

  return parseHttpFile(content);
}
