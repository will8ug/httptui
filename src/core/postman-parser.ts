/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import pkg from 'postman-collection';

import type { FileVariable, FormDataParam, HttpMethod, ParseResult, ParsedRequest } from './types';

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

function convertBody(item: any): { body: string | undefined; formdataFields?: FormDataParam[] } {
  if (!item?.request?.body) {
    return { body: undefined };
  }

  const body = item.request.body;

  try {
    const mode = body.mode;

    if (mode === 'raw') {
      const normalizedContent = body.raw.replace(/\r\n|\r/g, '\n');

      return { body: normalizedContent && normalizedContent.length > 0 ? normalizedContent : undefined };
    }

    if (mode === 'urlencoded') {
      const params = body.urlencoded?.members ?? body.urlencoded ?? [];

      return { body: convertKeyValueParamsToUrlEncoded(Array.isArray(params) ? params : []) };
    }

    if (mode === 'formdata') {
      const params = body.formdata?.members ?? body.formdata ?? [];
      const paramArray = Array.isArray(params) ? params : [];
      const hasFiles = paramArray.some((p: any) => p.type === 'file');

      if (hasFiles) {
        warn(`Request "${item.name ?? '(unnamed)'}" has form-data with file uploads — not supported`);

        return { body: undefined };
      }

      const formdataFields: FormDataParam[] = paramArray
        .filter((p: any) => p.key)
        .map((p: any) => ({
          key: p.key as string,
          value: (p.value ?? '') as string,
          type: (p.type ?? 'text') as 'text' | 'file',
        }));

      return { body: undefined, formdataFields };
    }

    if (mode === 'graphql') {
      warn(`Request "${item.name ?? '(unnamed)'}" has GraphQL body — not supported`);

      return { body: undefined };
    }

    if (mode === 'file') {
      warn(`Request "${item.name ?? '(unnamed)'}" has binary file body — not supported`);

      return { body: undefined };
    }

    // unknown body mode — best effort: try raw
    if (body.raw && body.raw.length > 0) {
      const normalizedContent = body.raw.replace(/\r\n|\r/g, '\n');
      return { body: normalizedContent && normalizedContent.length > 0 ? normalizedContent : undefined };
    }
  } catch {
    // body parsing is best-effort
  }

  return { body: undefined };
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
    const { body: convertedBody, formdataFields } = convertBody(item);

    const headers: Record<string, string> = { ...sdkHeaders };

    const bodyMode = req.body?.mode;

    for (const key of Object.keys(authHeaders)) {
      headers[key] = authHeaders[key];
    }

    // SDK's toObject() may include Content-Type from request body; override with our conversion
    if (bodyMode === 'urlencoded' && convertedBody !== undefined) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    // Informational only — undici auto-generates the boundary at send time
    if (formdataFields && formdataFields.length > 0) {
      headers['Content-Type'] = 'multipart/form-data';
    }

    // Auto-generate Content-Type for raw body based on language hint
    const rawLanguage = req.body?.options?.raw?.language as string | undefined;
    const hasExplicitContentType = Object.keys(headers).some(
      (key) => key.toLowerCase() === 'content-type',
    );
    if (bodyMode === 'raw' && rawLanguage && !hasExplicitContentType) {
      const contentTypeMap: Record<string, string> = {
        json: 'application/json',
        xml: 'application/xml',
        text: 'text/plain',
        html: 'text/html',
      };
      const contentType = contentTypeMap[rawLanguage];
      if (contentType) {
        headers['Content-Type'] = contentType;
      }
    }

    requests.push({
      name,
      method,
      url,
      headers,
      body: convertedBody,
      formdataFields,
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
