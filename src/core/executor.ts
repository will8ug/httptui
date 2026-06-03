import { Agent, FormData, request } from 'undici';

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

function removeContentTypeHeader(headers: Record<string, string>): void {
  const contentTypeKey = Object.keys(headers).find((k) => k.toLowerCase() === 'content-type');

  if (contentTypeKey) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- key is found by case-insensitive lookup, not arbitrary
    delete headers[contentTypeKey];
  }
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

export interface CertConfig {
  cert?: Buffer;
  key?: Buffer;
  pfx?: Buffer;
  passphrase?: string;
  ca?: Buffer;
}

export async function executeRequest(
  resolvedRequest: ResolvedRequest,
  config?: ExecutorConfig,
  certConfig?: CertConfig,
): Promise<ResponseData | RequestError> {
  try {
    new URL(resolvedRequest.url);
  } catch (error) {
    return toRequestError(error);
  }

  const headers = { ...resolvedRequest.headers };

  let body: string | FormData | undefined;

  if (resolvedRequest.formdataFields && resolvedRequest.formdataFields.length > 0) {
    const formData = new FormData();

    for (const field of resolvedRequest.formdataFields) {
      formData.append(field.key, field.value);
    }

    body = formData;

    // Remove informational Content-Type — undici auto-generates the real one with boundary
    removeContentTypeHeader(headers);
  } else {
    body = resolvedRequest.body;

    if (
      body !== undefined &&
      !hasContentTypeHeader(headers) &&
      looksLikeJson(body)
    ) {
      headers['Content-Type'] = 'application/json';
    }
  }

  const startTime = performance.now();

  try {
    const connectOptions: Record<string, unknown> = {};

    if (config?.insecure) {
      connectOptions.rejectUnauthorized = false;
    }

    if (certConfig) {
      if (certConfig.cert !== undefined) connectOptions.cert = certConfig.cert;
      if (certConfig.key !== undefined) connectOptions.key = certConfig.key;
      if (certConfig.pfx !== undefined) connectOptions.pfx = certConfig.pfx;
      if (certConfig.passphrase !== undefined) connectOptions.passphrase = certConfig.passphrase;
      if (certConfig.ca !== undefined) connectOptions.ca = certConfig.ca;
    }

    const hasConnectOptions = Object.keys(connectOptions).length > 0;
    const dispatcher = hasConnectOptions
      ? new Agent({ connect: connectOptions })
      : undefined;

    const response = await request(resolvedRequest.url, {
      method: resolvedRequest.method,
      headers,
      body,
      signal: AbortSignal.timeout(30000),
      dispatcher,
    });

    const rawBody = await response.body.text();
    const responseBody = rawBody.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const endTime = performance.now();

    return {
      statusCode: response.statusCode,
      statusText: getStatusText(response.statusCode),
      headers: normalizeHeaders(response.headers),
      body: responseBody,
      timing: {
        durationMs: endTime - startTime,
      },
      size: {
        bodyBytes: Buffer.byteLength(responseBody, 'utf-8'),
      },
    };
  } catch (error) {
    return toRequestError(error);
  }
}

export function isRequestError(result: ResponseData | RequestError): result is RequestError {
  return 'message' in result;
}
