import { Agent, FormData, request } from 'undici';

import type { ExecutorConfig, ErrorInfo, ResolvedRequest, ResponseChunk, ResponseData } from './types';

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

export function toErrorInfo(error: unknown): ErrorInfo {
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

export interface ResponseCallbacks {
  /**
   * Fires the moment response headers arrive, before the body is read, with a
   * headers-time snapshot: normalized status and headers, empty body/rawBody,
   * zero bodyBytes, and a durationMs placeholder the streaming status line
   * never renders (the duration figure is completion-only).
   */
  onHeaders?: (response: ResponseData) => void;
  /**
   * Fires in wire order after `onHeaders`, once per decoded body chunk, never
   * with an empty `raw`. A chunk ending in CR is held back until the next chunk
   * (or end of body) shows whether it is CRLF or a lone CR, so `display` is
   * always exactly normalized. Emission stops for good when the body ends or
   * the transfer throws — nothing fires after `executeRequest` settles.
   */
  onChunk?: (chunk: ResponseChunk) => void;
}

interface NormalizedChunk {
  raw: string;
  display: string;
}

/**
 * Turns decoded wire text into display text incrementally, holding a trailing
 * CR back until the next chunk shows whether it starts a CRLF pair. Produces
 * the same result as `text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')` over
 * the concatenation, whatever the chunk boundaries are.
 */
class LineEndingNormalizer {
  private pendingCarriageReturn = false;

  push(text: string): NormalizedChunk {
    let rest = text;
    let raw = '';
    let display = '';

    if (this.pendingCarriageReturn) {
      this.pendingCarriageReturn = false;
      raw = '\r';
      display = '\n';
      if (rest.startsWith('\n')) {
        raw += '\n';
        rest = rest.slice(1);
      }
    }

    if (rest.endsWith('\r')) {
      this.pendingCarriageReturn = true;
      rest = rest.slice(0, -1);
    }

    return {
      raw: raw + rest,
      display: display + rest.replace(/\r\n/g, '\n').replace(/\r/g, '\n'),
    };
  }

  flush(): NormalizedChunk {
    if (!this.pendingCarriageReturn) {
      return { raw: '', display: '' };
    }

    this.pendingCarriageReturn = false;

    return { raw: '\r', display: '\n' };
  }
}

export async function executeRequest(
  resolvedRequest: ResolvedRequest,
  config?: ExecutorConfig,
  certConfig?: CertConfig,
  signal?: AbortSignal,
  callbacks?: ResponseCallbacks,
): Promise<ResponseData | ErrorInfo> {
  try {
    new URL(resolvedRequest.url);
  } catch (error) {
    return toErrorInfo(error);
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
      signal,
      dispatcher,
      // ADR 0003: no body idle timeout, so a quiet stream survives past five
      // minutes and a hung body waits for the user's Esc instead of erroring.
      bodyTimeout: 0,
    });

    const statusCode = response.statusCode;
    const statusText = getStatusText(statusCode);
    const responseHeaders = normalizeHeaders(response.headers);

    callbacks?.onHeaders?.({
      statusCode,
      statusText,
      headers: responseHeaders,
      body: '',
      rawBody: '',
      timing: { durationMs: 0 },
      size: { bodyBytes: 0 },
    });

    const bodyChunks: AsyncIterable<Uint8Array> = response.body;
    const decoder = new TextDecoder();
    const lineEndings = new LineEndingNormalizer();
    const rawChunks: string[] = [];

    const emit = (chunk: NormalizedChunk): void => {
      if (chunk.raw === '') {
        return;
      }

      rawChunks.push(chunk.raw);
      callbacks?.onChunk?.({
        raw: chunk.raw,
        display: chunk.display,
        bytes: Buffer.byteLength(chunk.raw, 'utf-8'),
      });
    };

    const consume = (text: string): void => {
      if (text !== '') {
        emit(lineEndings.push(text));
      }
    };

    for await (const chunk of bodyChunks) {
      consume(decoder.decode(chunk, { stream: true }));
    }

    consume(decoder.decode());
    emit(lineEndings.flush());

    const rawBody = rawChunks.join('');
    const responseBody = rawBody.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const endTime = performance.now();

    return {
      statusCode,
      statusText,
      headers: responseHeaders,
      body: responseBody,
      rawBody,
      timing: {
        durationMs: endTime - startTime,
      },
      size: {
        bodyBytes: Buffer.byteLength(rawBody, 'utf-8'),
      },
    };
  } catch (error) {
    return toErrorInfo(error);
  }
}

export function isErrorInfo(result: ResponseData | ErrorInfo): result is ErrorInfo {
  return 'message' in result;
}
