/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { parse as parseYaml } from 'yaml';

import type { ParseResult } from './types';
import { parseHttpFile } from './importers/http';
import { parsePostmanCollection } from './importers/postman';
import { parseOpenApiSpec } from './importers/openapi';

type DetectedFormat = 'http' | 'postman' | 'openapi';

export type ImportFormat = DetectedFormat | 'curl';

export interface ImportSuccess extends ParseResult {
  ok: true;
  format: ImportFormat;
  warnings: string[];
}

export interface ImportFailure {
  ok: false;
  error: string;
}

export type ImportOutcome = ImportSuccess | ImportFailure;

interface DetectedDocument {
  format: DetectedFormat;
  doc: unknown;
}

const YAML_MARKER_RE = /^(openapi|swagger)\s*:/m;
const JSON_MARKER_RE = /"(openapi|swagger)"\s*:/;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function probeJsonFormat(doc: any): DetectedFormat {
  if (doc && String(doc.openapi ?? '')) {
    return 'openapi';
  }

  if (doc && String(doc.swagger ?? '')) {
    return 'openapi';
  }

  if (doc?.info?.schema && typeof doc.info.schema === 'string' && doc.info.schema.toLowerCase().includes('postman')) {
    return 'postman';
  }

  if (doc?.info && doc?.item !== undefined) {
    return 'postman';
  }

  return 'http';
}

// YAML files probe only the OpenAPI markers: Postman detection has always been
// JSON-only, and widening it here would silently reroute .yaml http sources.
function probeYamlFormat(doc: any): DetectedFormat {
  if (doc && String(doc.openapi ?? '')) {
    return 'openapi';
  }

  if (doc && String(doc.swagger ?? '')) {
    return 'openapi';
  }

  return 'http';
}

/**
 * Parse the document exactly once and probe its structure. A malformed
 * JSON/YAML document carrying an OpenAPI marker is a failed spec and throws;
 * without the marker it is ordinary http-format content.
 */
function detectAndParse(filePath: string, content: string): DetectedDocument {
  const lower = filePath.toLowerCase();

  if (lower.endsWith('.json')) {
    try {
      const doc: unknown = JSON.parse(content);

      return { format: probeJsonFormat(doc), doc };
    } catch (e) {
      if (JSON_MARKER_RE.test(content)) {
        throw new Error(`Failed to parse OpenAPI spec: invalid JSON: ${errorMessage(e)}`);
      }

      return { format: 'http', doc: undefined };
    }
  }

  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) {
    try {
      const doc: unknown = parseYaml(content);

      return { format: probeYamlFormat(doc), doc };
    } catch (e) {
      if (YAML_MARKER_RE.test(content)) {
        throw new Error(`Failed to parse OpenAPI spec: invalid YAML: ${errorMessage(e)}`);
      }

      return { format: 'http', doc: undefined };
    }
  }

  return { format: 'http', doc: undefined };
}

export function importContent(filePath: string, content: string): ImportOutcome {
  try {
    const detected = detectAndParse(filePath, content);

    if (detected.format === 'postman') {
      return parsePostmanCollection(detected.doc);
    }

    if (detected.format === 'openapi') {
      return parseOpenApiSpec(detected.doc);
    }

    return parseHttpFile(content);
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
