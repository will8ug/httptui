/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import pkg from 'postman-collection';

import type { FileVariable, HttpMethod, ParseResult, ParsedRequest } from './types';

const { Collection } = pkg;

const SUPPORTED_METHODS: ReadonlySet<string> = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]);

const UNSUPPORTED_AUTH_TYPES: ReadonlySet<string> = new Set([
  'oauth2',
  'oauth1',
  'digest',
  'ntlm',
  'hawk',
  'awsv4',
  'noauth',
]);

function warn(message: string): void {
  process.stderr.write(`\x1b[33m⚠ ${message}\x1b[0m\n`);
}

function isSupportedMethod(method: string): method is HttpMethod {
  if (!method) {
    return false;
  }

  return SUPPORTED_METHODS.has(method.toUpperCase());
}

function buildAuthHeaders(item: any): Record<string, string> {
  if (!item?.request?.auth) {
    return {};
  }

  const auth = item.request.auth;
  const authType = auth.type?.toLowerCase();

  if (!authType || UNSUPPORTED_AUTH_TYPES.has(authType)) {
    if (authType) {
      warn(`Unsupported auth type "${authType}" in request "${item.name ?? '(unnamed)'}" — skipped`);
    }

    return {};
  }

  const getParams = (propName: string): any[] => {
    const prop = auth[propName];

    if (!prop) {
      return [];
    }

    return prop.members ?? (Array.isArray(prop) ? prop : []);
  };

  try {
    if (authType === 'basic') {
      const params = getParams('basic');
      const username = params.find((p: any) => p.key === 'username')?.value ?? '';
      const password = params.find((p: any) => p.key === 'password')?.value ?? '';
      const encoded = Buffer.from(`${username}:${password}`).toString('base64');

      return { Authorization: `Basic ${encoded}` };
    }

    if (authType === 'bearer') {
      const params = getParams('bearer');
      const token = params.find((p: any) => p.key === 'token')?.value ?? '';

      return { Authorization: `Bearer ${token}` };
    }

    if (authType === 'apikey') {
      const params = getParams('apikey');
      const keyEntry = params.find((p: any) => p.key === 'key');
      const valueEntry = params.find((p: any) => p.key === 'value');
      const inEntry = params.find((p: any) => p.key === 'in');

      const addTo = (inEntry?.value ?? 'header').toLowerCase();

      if (addTo === 'header' && keyEntry && valueEntry) {
        return { [keyEntry.value]: valueEntry.value };
      }

      if (addTo !== 'header') {
        warn(`API Key with "in: ${inEntry?.value}" in request "${item.name ?? '(unnamed)'}" — only header mode supported`);
      }
    }
  } catch {
    // auth parsing is best-effort; silently skip malformed auth
  }

  return {};
}

function convertKeyValueParamsToUrlEncoded(params: any[]): string | undefined {
  const pairs: Array<{ key: string; value: string }> = [];

  for (const param of params) {
    if (param.key) {
      pairs.push({ key: param.key, value: param.value ?? '' });
    }
  }

  if (pairs.length === 0) {
    return undefined;
  }

  return pairs
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join('&');
}

function ensureUrlEncodedContentType(headers: Record<string, string>): void {
  const hasContentType = Object.keys(headers).some(
    (key) => key.toLowerCase() === 'content-type',
  );

  if (!hasContentType) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }
}

function convertBody(item: any): string | undefined {
  if (!item?.request?.body) {
    return undefined;
  }

  const body = item.request.body;

  try {
    const mode = body.mode;

    if (mode === 'raw') {
      const raw = body.raw;

      return raw && raw.length > 0 ? raw : undefined;
    }

    if (mode === 'urlencoded') {
      const params = body.urlencoded?.members ?? body.urlencoded ?? [];

      return convertKeyValueParamsToUrlEncoded(Array.isArray(params) ? params : []);
    }

    if (mode === 'formdata') {
      const params = body.formdata?.members ?? body.formdata ?? [];
      const paramArray = Array.isArray(params) ? params : [];
      const hasFiles = paramArray.some((p: any) => p.type === 'file');

      if (hasFiles) {
        warn(`Request "${item.name ?? '(unnamed)'}" has form-data with file uploads — not supported`);

        return undefined;
      }

      return convertKeyValueParamsToUrlEncoded(paramArray);
    }

    if (mode === 'graphql') {
      warn(`Request "${item.name ?? '(unnamed)'}" has GraphQL body — not supported`);

      return undefined;
    }

    if (mode === 'file') {
      warn(`Request "${item.name ?? '(unnamed)'}" has binary file body — not supported`);

      return undefined;
    }

    // unknown body mode — best effort: try raw
    if (body.raw && body.raw.length > 0) {
      return body.raw;
    }
  } catch {
    // body parsing is best-effort
  }

  return undefined;
}

function checkForScripts(item: any): void {
  if (!item?.request?.events) {
    return;
  }

  const events = item.request.events;

  for (const event of events) {
    if (event.listen === 'test') {
      warn(`Request "${item.name ?? '(unnamed)'}" has test scripts — not supported`);
    } else if (event.listen === 'prerequest') {
      warn(`Request "${item.name ?? '(unnamed)'}" has pre-request scripts — not supported`);
    }
  }
}

function flattenCollectionItems(items: any[], parentPath?: string): any[] {
  const result: any[] = [];

  for (const item of items) {
    if (!item) {
      continue;
    }

    const childrenRaw = item.items ?? item.item;
    const children = childrenRaw?.members ?? childrenRaw;

    if (children && Array.isArray(children) && children.length > 0) {
      const folderName = item.name ?? '';
      const folderPath = parentPath ? `${parentPath} / ${folderName}` : folderName;

      result.push(...flattenCollectionItems(children, folderPath));
    } else {
      const entry: any = { ...item };

      if (parentPath) {
        entry._folderPrefix = parentPath;
      }

      result.push(entry);
    }
  }

  return result;
}

export function detectFormat(filePath: string, content: string): 'http' | 'postman' {
  if (!filePath.toLowerCase().endsWith('.json')) {
    return 'http';
  }

  try {
    const parsed = JSON.parse(content);

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

export function parsePostmanCollection(content: string): ParseResult {
  let raw: any;

  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error('Failed to parse Postman collection: invalid JSON');
  }

  const collection = new Collection(raw);
  const collectionItems = collection.items?.members ?? collection.items ?? [];
  const flatItems = flattenCollectionItems(collectionItems);

  const requests: ParsedRequest[] = [];
  const variables: FileVariable[] = [];

  let requestIndex = 0;

  for (const item of flatItems) {
    if (!item?.request) {
      continue;
    }

    requestIndex += 1;

    checkForScripts(item);

    const req = item.request;
    const method = String(req.method ?? 'GET').toUpperCase();

    if (!isSupportedMethod(method)) {
      warn(`Unsupported HTTP method "${method}" in request "${item.name ?? '(unnamed)'}" — skipped`);

      continue;
    }

    let name: string;

    if (item.name) {
      name = item._folderPrefix ? `${item._folderPrefix} / ${item.name}` : item.name;
    } else {
      name = `Request ${requestIndex}`;
    }

    let url: string;

    try {
      url = req.url?.toString?.() ?? '';
    } catch {
      url = '';
    }

    // Fallback: SDK may fail to reconstruct URL from raw-only objects
    if (!url) {
      try {
        url = req.url?.getRaw?.() ?? req.url?.raw ?? '';
      } catch {
        url = '';
      }
    }

    const sdkHeaders: Record<string, string> =
      req.headers?.toObject?.() ?? req.headers?.all?.() ?? {};

    const authHeaders = buildAuthHeaders(item);
    const convertedBody = convertBody(item);

    const headers: Record<string, string> = { ...sdkHeaders };

    const bodyMode = req.body?.mode;

    if ((bodyMode === 'urlencoded' || bodyMode === 'formdata') && convertedBody !== undefined) {
      ensureUrlEncodedContentType(headers);
    }

    for (const [key, value] of Object.entries(authHeaders)) {
      headers[key] = value;
    }

    // SDK's toObject() may include Content-Type from request body; override with our conversion
    if ((bodyMode === 'urlencoded' || bodyMode === 'formdata') && convertedBody !== undefined) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    requests.push({
      name,
      method,
      url,
      headers,
      body: convertedBody,
      lineNumber: requestIndex,
    });
  }

  const collectionVars = collection.variables?.members ?? [];

  for (const variable of collectionVars) {
    if (!variable?.key) {
      continue;
    }

    variables.push({
      name: variable.key,
      value: variable.value?.toString?.() ?? '',
    });
  }

  return { requests, variables };
}
