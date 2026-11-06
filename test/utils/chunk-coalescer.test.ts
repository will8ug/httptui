import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChunkCoalescer } from '../../src/utils/chunk-coalescer.js';
import { CHUNK_COALESCE_WINDOW_MS } from '../../src/utils/timing.js';

describe('ChunkCoalescer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('flushes pieces accumulated within one window as a single combined flush', () => {
    const flushed: string[] = [];
    const coalescer = new ChunkCoalescer((text) => flushed.push(text));

    coalescer.push('Hel');
    coalescer.push('lo, ');
    vi.advanceTimersByTime(CHUNK_COALESCE_WINDOW_MS - 1);
    coalescer.push('world');
    vi.advanceTimersByTime(1);

    expect(flushed).toEqual(['Hello, world']);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('accumulates only pieces arriving since the previous flush', () => {
    const flushed: string[] = [];
    const coalescer = new ChunkCoalescer((text) => flushed.push(text));

    coalescer.push('first');
    vi.advanceTimersByTime(CHUNK_COALESCE_WINDOW_MS);
    coalescer.push('second');
    coalescer.push('third');
    vi.advanceTimersByTime(CHUNK_COALESCE_WINDOW_MS);

    expect(flushed).toEqual(['first', 'secondthird']);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('flushes at most once per window under a continuous burst', () => {
    const flushed: string[] = [];
    const flushTimes: number[] = [];
    const coalescer = new ChunkCoalescer((text) => {
      flushed.push(text);
      flushTimes.push(Date.now());
    });

    const pieces: string[] = [];
    for (let t = 0; t < 1000; t += 10) {
      const piece = `token${t};`;
      pieces.push(piece);
      coalescer.push(piece);
      vi.advanceTimersByTime(10);
    }

    expect(flushed.length).toBe(Math.floor(1000 / CHUNK_COALESCE_WINDOW_MS));
    for (let i = 1; i < flushTimes.length; i++) {
      expect(flushTimes[i] - flushTimes[i - 1]).toBeGreaterThanOrEqual(CHUNK_COALESCE_WINDOW_MS);
    }

    coalescer.complete();
    expect(flushed.join('')).toBe(pieces.join(''));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('flushes accumulated content immediately on completion', () => {
    const flushed: string[] = [];
    const coalescer = new ChunkCoalescer((text) => flushed.push(text));

    coalescer.push('partial ');
    vi.advanceTimersByTime(CHUNK_COALESCE_WINDOW_MS / 2);
    coalescer.push('tail');
    coalescer.complete();

    expect(flushed).toEqual(['partial tail']);

    vi.advanceTimersByTime(CHUNK_COALESCE_WINDOW_MS * 10);
    expect(flushed).toEqual(['partial tail']);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not flush on completion with nothing accumulated', () => {
    const onFlush = vi.fn();

    const fresh = new ChunkCoalescer(onFlush);
    fresh.complete();
    expect(onFlush).not.toHaveBeenCalled();

    const drained = new ChunkCoalescer(onFlush);
    drained.push('all');
    vi.advanceTimersByTime(CHUNK_COALESCE_WINDOW_MS);
    drained.complete();

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith('all');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('is inert after completion', () => {
    const onFlush = vi.fn();
    const coalescer = new ChunkCoalescer(onFlush);

    coalescer.complete();
    coalescer.push('late');
    coalescer.complete();
    vi.advanceTimersByTime(CHUNK_COALESCE_WINDOW_MS * 10);

    expect(onFlush).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('discards unflushed pieces on abort without emitting', () => {
    const onFlush = vi.fn();
    const coalescer = new ChunkCoalescer(onFlush);

    coalescer.push('displayed');
    vi.advanceTimersByTime(CHUNK_COALESCE_WINDOW_MS);
    coalescer.push('never ');
    coalescer.push('shown');
    coalescer.abort();
    vi.advanceTimersByTime(CHUNK_COALESCE_WINDOW_MS * 10);

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith('displayed');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('is inert after abort', () => {
    const onFlush = vi.fn();
    const coalescer = new ChunkCoalescer(onFlush);

    coalescer.abort();
    coalescer.push('late');
    coalescer.complete();
    coalescer.abort();
    vi.advanceTimersByTime(CHUNK_COALESCE_WINDOW_MS * 10);

    expect(onFlush).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ignores empty pieces', () => {
    const onFlush = vi.fn();

    const nothingPushed = new ChunkCoalescer(onFlush);
    nothingPushed.push('');
    expect(vi.getTimerCount()).toBe(0);
    nothingPushed.complete();
    expect(onFlush).not.toHaveBeenCalled();

    const mixed = new ChunkCoalescer(onFlush);
    mixed.push('content');
    mixed.push('');
    vi.advanceTimersByTime(CHUNK_COALESCE_WINDOW_MS);

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith('content');
    expect(vi.getTimerCount()).toBe(0);
  });
});
