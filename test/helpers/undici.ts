export interface MockUndiciResponse {
  statusCode: number;
  headers: Record<string, string | string[]>;
  body: AsyncIterable<Buffer>;
}

export function createMockUndiciBody(chunks: Buffer[]): AsyncIterable<Buffer> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        yield chunk;
      }
    },
  };
}

export function createHeldUndiciBody(bodyText: Promise<string>): AsyncIterable<Buffer> {
  return {
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(await bodyText, 'utf-8');
    },
  };
}

export function createMockUndiciResponse(overrides: {
  statusCode?: number;
  headers?: Record<string, string | string[]>;
  body?: string;
  chunks?: Buffer[];
} = {}): MockUndiciResponse {
  return {
    statusCode: overrides.statusCode ?? 200,
    headers: overrides.headers ?? {},
    body: createMockUndiciBody(overrides.chunks ?? [Buffer.from(overrides.body ?? '', 'utf-8')]),
  };
}
