import type { FileVariable, HttpMethod, ParseResult, ParsedRequest } from './types';

type ParserState = 'IDLE' | 'HEADERS' | 'BODY';

const SUPPORTED_METHODS: ReadonlySet<HttpMethod> = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]);

interface RequestBuilder {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  headerNames: Map<string, string>;
  bodyLines: string[];
  lineNumber: number;
  explicitName: string | undefined;
}

function isSeparatorLine(line: string): boolean {
  return /^#{3,}/.test(line);
}

function getSeparatorName(line: string): string | undefined {
  const match = line.match(/^#{3,}(.*)$/);

  if (!match) {
    return undefined;
  }

  const name = match[1].trim();
  return name === '' ? undefined : name;
}

function isCommentLine(line: string): boolean {
  return (line.startsWith('#') && !isSeparatorLine(line)) || line.startsWith('//');
}

function parseVariableLine(line: string): FileVariable | undefined {
  const match = line.match(/^@([A-Za-z0-9_]+)\s*=\s*(.*)$/);

  if (!match) {
    return undefined;
  }

  return {
    name: match[1],
    value: match[2].trim(),
  };
}

function parseMethod(value: string): HttpMethod | undefined {
  const normalized = value.toUpperCase();

  if (SUPPORTED_METHODS.has(normalized as HttpMethod)) {
    return normalized as HttpMethod;
  }

  return undefined;
}

function parseRequestLine(line: string): Pick<RequestBuilder, 'method' | 'url'> | undefined {
  const match = line.match(/^([A-Za-z]+)\s+((?:\{\{[^}]*}}|\S)+)(?:\s+HTTP\/\S+)?$/);

  if (!match) {
    return undefined;
  }

  const method = parseMethod(match[1]);

  if (!method) {
    return undefined;
  }

  return {
    method,
    url: match[2],
  };
}

function addHeader(builder: RequestBuilder, line: string): void {
  const separatorIndex = line.indexOf(':');

  if (separatorIndex === -1) {
    return;
  }

  const name = line.slice(0, separatorIndex).trim();

  if (name === '') {
    return;
  }

  const value = line.slice(separatorIndex + 1).trim();
  const normalizedName = name.toLowerCase();
  const previousName = builder.headerNames.get(normalizedName);

  if (previousName && previousName !== name) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- header normalization requires removing old key
    delete builder.headers[previousName];
  }

  builder.headerNames.set(normalizedName, name);
  builder.headers[name] = value;
}

function buildBody(bodyLines: string[]): string | undefined {
  let start = 0;
  let end = bodyLines.length;

  while (start < end && bodyLines[start].trim() === '') {
    start += 1;
  }

  while (end > start && bodyLines[end - 1].trim() === '') {
    end -= 1;
  }

  if (start === end) {
    return undefined;
  }

  return bodyLines.slice(start, end).join('\n');
}

function finalizeRequest(
  requests: ParsedRequest[],
  builder: RequestBuilder | undefined,
  requestCount: number,
): number {
  if (!builder) {
    return requestCount;
  }

  const nextCount = requestCount + 1;

  requests.push({
    name: builder.explicitName ?? `Request ${nextCount}`,
    method: builder.method,
    url: builder.url,
    headers: builder.headers,
    body: buildBody(builder.bodyLines),
    lineNumber: builder.lineNumber,
  });

  return nextCount;
}

export function parseHttpFile(content: string): ParseResult {
  const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedContent.split('\n');
  const requests: ParsedRequest[] = [];
  const variables: FileVariable[] = [];

  let state: ParserState = 'IDLE';
  let currentRequest: RequestBuilder | undefined;
  let pendingRequestName: string | undefined;
  let requestCount = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (state === 'BODY') {
      if (isSeparatorLine(trimmed)) {
        requestCount = finalizeRequest(requests, currentRequest, requestCount);
        currentRequest = undefined;
        state = 'IDLE';
        pendingRequestName = getSeparatorName(trimmed);
        continue;
      }

      if (currentRequest) {
        currentRequest.bodyLines.push(line);
      }

      continue;
    }

    if (trimmed === '') {
      if (state === 'HEADERS') {
        state = 'BODY';
      }

      continue;
    }

    if (isSeparatorLine(trimmed)) {
      requestCount = finalizeRequest(requests, currentRequest, requestCount);
      currentRequest = undefined;
      state = 'IDLE';
      pendingRequestName = getSeparatorName(trimmed);
      continue;
    }

    if (isCommentLine(trimmed)) {
      continue;
    }

    if (state === 'IDLE') {
      const variable = parseVariableLine(trimmed);

      if (variable) {
        variables.push(variable);
        continue;
      }

      const requestLine = parseRequestLine(trimmed);

      if (!requestLine) {
        continue;
      }

      currentRequest = {
        method: requestLine.method,
        url: requestLine.url,
        headers: {},
        headerNames: new Map<string, string>(),
        bodyLines: [],
        lineNumber: index + 1,
        explicitName: pendingRequestName,
      };
      pendingRequestName = undefined;
      state = 'HEADERS';
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- parser state machine check
    if (state === 'HEADERS' && currentRequest) {
      addHeader(currentRequest, line);
    }
  }

  finalizeRequest(requests, currentRequest, requestCount);

  return {
    requests,
    variables,
  };
}
