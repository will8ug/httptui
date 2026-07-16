/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import type { ParseResult } from './types';
import { parseHttpFile } from './parser';
import { parsePostmanCollection } from './postman-parser';
import { parseOpenApiSpec } from './openapi-parser';

export function detectFormat(filePath: string, content: string): 'http' | 'postman' | 'openapi' {
  if (!filePath.toLowerCase().endsWith('.json')) {
    return 'http';
  }

  try {
    const parsed = JSON.parse(content);

    if (parsed?.openapi && typeof parsed.openapi === 'string') {
      return 'openapi';
    }

    if (parsed?.swagger && typeof parsed.swagger === 'string') {
      return 'openapi';
    }

    if (parsed?.info?.schema && typeof parsed.info.schema === 'string' && parsed.info.schema.toLowerCase().includes('postman')) {
      return 'postman';
    }

    if (parsed?.info && parsed?.item !== undefined) {
      return 'postman';
    }
  } catch {
    // Not valid JSON — fall through to http parser
  }

  return 'http';
}

export function parseAnyFormat(filePath: string, content: string): ParseResult {
  const format = detectFormat(filePath, content);

  if (format === 'postman') {
    return parsePostmanCollection(content);
  }

  if (format === 'openapi') {
    return parseOpenApiSpec(content);
  }

  return parseHttpFile(content);
}
