import { CHUNK_COALESCE_WINDOW_MS } from './timing';

/**
 * Coalesces bursty text pieces into a steady flush cadence: the first piece
 * opens a window that flushes on expiry, carrying everything accumulated
 * since the previous flush, so a piece becomes visible within one window no
 * matter how fast pieces arrive. complete() and abort() are terminal — the
 * instance is inert afterwards and never leaves a pending timer. Owns
 * windowing only; it has no knowledge of what the pieces are.
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
