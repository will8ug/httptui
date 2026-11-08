import { CHUNK_COALESCE_WINDOW_MS } from './timing';

/**
 * Batches bursty pieces into timed flushes; a piece becomes visible within
 * one window. complete() synchronously flushes the tail, abort() discards it;
 * both are terminal and leave no pending timer.
 */
export class ChunkCoalescer {
  private readonly onFlush: (accumulated: string) => void;
  private pending = '';
  private timer: ReturnType<typeof setTimeout> | undefined;
  private settled = false;

  constructor(onFlush: (accumulated: string) => void) {
    this.onFlush = onFlush;
  }

  push(piece: string): void {
    if (this.settled || piece === '') return;
    this.pending += piece;
    this.timer ??= setTimeout(() => {
      this.deliver();
    }, CHUNK_COALESCE_WINDOW_MS);
  }

  complete(): void {
    if (this.settled) return;
    this.settled = true;
    this.clearTimer();
    if (this.pending !== '') this.deliver();
  }

  abort(): void {
    if (this.settled) return;
    this.settled = true;
    this.clearTimer();
    this.pending = '';
  }

  private deliver(): void {
    this.clearTimer();
    const accumulated = this.pending;
    this.pending = '';
    this.onFlush(accumulated);
  }

  private clearTimer(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }
}
