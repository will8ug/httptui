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

export interface StagedUndiciBody {
  body: AsyncIterable<Buffer>;
  push(chunk: string | Buffer): void;
  end(): void;
}

/**
 * A body whose chunks the test stages externally, so frames can be asserted
 * while the transfer is still open.
 */
export function createStagedUndiciBody(): StagedUndiciBody {
  const queued: Buffer[] = [];
  const waiters: Array<() => void> = [];
  let ended = false;

  const releaseWaiters = (): void => {
    while (waiters.length > 0) {
      waiters.shift()?.();
    }
  };

  return {
    body: {
      async *[Symbol.asyncIterator]() {
        while (true) {
          if (queued.length > 0) {
            yield queued.shift() as Buffer;
            continue;
          }
          if (ended) {
            return;
          }
          await new Promise<void>((resolve) => {
            waiters.push(resolve);
          });
        }
      },
    },
    push(chunk: string | Buffer): void {
      queued.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf-8') : chunk);
      releaseWaiters();
    },
    end(): void {
      ended = true;
      releaseWaiters();
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
