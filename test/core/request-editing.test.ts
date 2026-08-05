import { describe, expect, it } from 'vitest';

import type { AppState } from '../../src/core/types';
import { createRequest } from '../helpers/requests';
import { createInitialState, reducer } from '../helpers/state';

describe('ENTER_EDIT reducer', () => {
  it('sets mode to edit with editTarget body and seeds buffer from existing body', () => {
    const request = createRequest({ body: '{"name":"Alice"}' });
    const state = createInitialState({ requests: [request], selectedIndex: 0 });

    const result = reducer(state, { type: 'ENTER_EDIT', target: 'body', buffer: '{"name":"Alice"}' });

    expect(result.mode).toBe('edit');
    expect(result.editTarget).toBe('body');
    expect(result.editBuffer).toBe('{"name":"Alice"}');
    expect(result.editCursor).toBe('{"name":"Alice"}'.length);
  });

  it('seeds empty buffer and cursor at 0 when body is undefined', () => {
    const request = createRequest({ body: undefined });
    const state = createInitialState({ requests: [request], selectedIndex: 0 });

    const result = reducer(state, { type: 'ENTER_EDIT', target: 'body', buffer: '' });

    expect(result.editBuffer).toBe('');
    expect(result.editCursor).toBe(0);
  });

  it('resets editScrollOffset and editHorizontalOffset to 0', () => {
    const state = createInitialState({
      editScrollOffset: 5,
      editHorizontalOffset: 10,
    });

    const result = reducer(state, { type: 'ENTER_EDIT', target: 'body', buffer: 'hello' });

    expect(result.editScrollOffset).toBe(0);
    expect(result.editHorizontalOffset).toBe(0);
  });
});

describe('EDIT_KEY reducer', () => {
  it('scrolls viewport down when cursor moves below visible window', () => {
    let current = createInitialState({
      mode: 'edit',
      editBuffer: 'line0\nline1\nline2\nline3\nline4\nline5',
      editCursor: 0,
      editScrollOffset: 0,
    });

    for (let i = 0; i < 3; i++) {
      current = reducer(current, {
        type: 'EDIT_KEY',
        op: 'down',
        visibleHeight: 3,
        visibleWidth: 40,
      });
    }

    expect(current.editCursor).toBe(18);
    expect(current.editScrollOffset).toBe(1);
  });

  it('scrolls viewport up when cursor moves above visible window', () => {
    let current = createInitialState({
      mode: 'edit',
      editBuffer: 'line0\nline1\nline2\nline3\nline4\nline5',
      editCursor: 24,
      editScrollOffset: 2,
    });

    for (let i = 0; i < 3; i++) {
      current = reducer(current, {
        type: 'EDIT_KEY',
        op: 'up',
        visibleHeight: 3,
        visibleWidth: 40,
      });
    }

    expect(current.editCursor).toBe(6);
    expect(current.editScrollOffset).toBe(1);

    current = reducer(current, {
      type: 'EDIT_KEY',
      op: 'up',
      visibleHeight: 3,
      visibleWidth: 40,
    });

    expect(current.editCursor).toBe(0);
    expect(current.editScrollOffset).toBe(0);
  });

  it('adjusts horizontal offset when cursor moves past visible width on a long line', () => {
    const longLine = 'a'.repeat(60);
    let current = createInitialState({
      mode: 'edit',
      editBuffer: longLine,
      editCursor: 0,
      editHorizontalOffset: 0,
    });

    for (let i = 0; i < 25; i++) {
      current = reducer(current, {
        type: 'EDIT_KEY',
        op: 'right',
        visibleHeight: 10,
        visibleWidth: 20,
      });
    }

    expect(current.editCursor).toBe(25);
    expect(current.editHorizontalOffset).toBe(6);
  });
});

describe('COMMIT_EDIT reducer', () => {
  it('stores the edited body and returns to normal mode', () => {
    const request = createRequest({ body: '{"name":"Alice"}' });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      editBuffer: '{"name":"Bob"}',
      editCursor: 14,
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.mode).toBe('normal');
    expect(result.requests[0].body).toBe('{"name":"Bob"}');
    expect(result.transientMessage).toBe('Body updated');
  });

  it('does not mutate the original request object', () => {
    const request = createRequest({ body: 'original' });
    const originalRef = request;
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      editBuffer: 'modified',
      editCursor: 8,
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(originalRef.body).toBe('original');
    expect(result.requests[0].body).toBe('modified');
    expect(result.requests[0]).not.toBe(originalRef);
  });

  it('normalizes empty buffer to undefined', () => {
    const request = createRequest({ body: 'some content' });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      editBuffer: '',
      editCursor: 0,
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.requests[0].body).toBeUndefined();
  });

  it('does not set isDirty when committed value is unchanged', () => {
    const request = createRequest({ body: 'unchanged' });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0, isDirty: false }),
      mode: 'edit',
      editBuffer: 'unchanged',
      editCursor: 9,
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.isDirty).toBe(false);
  });

  it('does not set a transient message when committed value is unchanged', () => {
    const request = createRequest({ body: 'unchanged' });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      editBuffer: 'unchanged',
      editCursor: 9,
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.transientMessage).toBeNull();
    expect(result.mode).toBe('normal');
  });

  it('sets isDirty when committed value differs from original body', () => {
    const request = createRequest({ body: 'original' });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0, isDirty: false }),
      mode: 'edit',
      editBuffer: 'changed',
      editCursor: 7,
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.isDirty).toBe(true);
  });

  it('returns state unchanged when no request at selectedIndex', () => {
    const state: AppState = {
      ...createInitialState({ requests: [], selectedIndex: 0 }),
      mode: 'edit',
      editBuffer: 'hello',
      editCursor: 5,
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result).toBe(state);
  });

  it('clears edit fields after commit', () => {
    const request = createRequest({ body: 'test' });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      editBuffer: 'new value',
      editCursor: 9,
      editScrollOffset: 3,
      editHorizontalOffset: 5,
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.editBuffer).toBe('');
    expect(result.editCursor).toBe(0);
    expect(result.editScrollOffset).toBe(0);
    expect(result.editHorizontalOffset).toBe(0);
  });

  it('clears transientError when set', () => {
    const request = createRequest({ body: 'test' });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      transientError: 'Body edit failed',
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.transientError).toBeNull();
  });
});

describe('CANCEL_EDIT reducer', () => {
  it('returns to normal mode without touching requests', () => {
    const request = createRequest({ body: 'original' });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      editBuffer: 'modified',
      editCursor: 8,
    };

    const result = reducer(state, { type: 'CANCEL_EDIT' });

    expect(result.mode).toBe('normal');
    expect(result.requests[0].body).toBe('original');
    expect(result.editBuffer).toBe('');
    expect(result.editCursor).toBe(0);
  });
});
