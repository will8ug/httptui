import { Agent, request } from 'undici';

import type { ExecutorConfig, RequestError, ResolvedRequest, ResponseData } from './types';

const STATUS_TEXTS: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

function looksLikeJson(body: string): boolean {
  const trimmedBody = body.trimStart();
  return trimmedBody.startsWith('{') || trimmedBody.startsWith('[');
}

function hasContentTypeHeader(headers: Record<string, string>): boolean {
  return Object.keys(headers).some((headerName) => headerName.toLowerCase() === 'content-type');
}

function normalizeHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  return Object.entries(headers).reduce<Record<string, string>>((normalizedHeaders, [key, value]) => {
    if (value !== undefined) {
      normalizedHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
    }

    return normalizedHeaders;
  }, {});
}

const TLS_ERROR_CODES = new Set([
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'CERT_HAS_EXPIRED',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);

function getTlsHint(code: string): string | undefined {
  if (!TLS_ERROR_CODES.has(code)) {
    return undefined;
  }

  return 'Hint: Try running with --insecure flag, or set NODE_EXTRA_CA_CERTS=/path/to/ca.pem';
}

function toRequestError(error: unknown): RequestError {
  if (error instanceof Error) {
    const errorWithCode = error as Error & { code?: string };
    const hint = errorWithCode.code ? getTlsHint(errorWithCode.code) : undefined;

    return {
      message: hint ? `${error.message}\n${hint}` : error.message,
      code: errorWithCode.code,
    };
  }

  return {
    message: String(error),
  };
}

function getStatusText(statusCode: number): string {
  return STATUS_TEXTS[statusCode] ?? '';
}

export async function executeRequest(
  resolvedRequest: ResolvedRequest,
  config?: ExecutorConfig,
): Promise<ResponseData | RequestError> {
  try {
    new URL(resolvedRequest.url);
  } catch (error) {
    return toRequestError(error);
  }

  const headers = { ...resolvedRequest.headers };

  if (
    resolvedRequest.body !== undefined &&
    !hasContentTypeHeader(headers) &&
    looksLikeJson(resolvedRequest.body)
  ) {
    headers['Content-Type'] = 'application/json';
  }

  const startTime = performance.now();

  try {
    const dispatcher = config?.insecure
      ? new Agent({ connect: { rejectUnauthorized: false } })
      : undefined;

    const response = await request(resolvedRequest.url, {
      method: resolvedRequest.method,
      headers,
      body: resolvedRequest.body,
      signal: AbortSignal.timeout(30000),
      dispatcher,
    });

    const body = await response.body.text();
    const endTime = performance.now();

    return {
      statusCode: response.statusCode,
      statusText: getStatusText(response.statusCode),
      headers: normalizeHeaders(response.headers),
      body,
      timing: {
        durationMs: endTime - startTime,
      },
      size: {
        bodyBytes: Buffer.byteLength(body, 'utf-8'),
      },
    };
  } catch (error) {
    return toRequestError(error);
  }
}

export function isRequestError(result: ResponseData | RequestError): result is RequestError {
  return 'message' in result;
}
