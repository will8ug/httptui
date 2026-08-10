import { describe, expect, it } from 'vitest';

import type { AppState } from '../../src/core/types';
import { createRequest } from '../helpers/requests';
import { createInitialState, createEditState, reducer } from '../helpers/state';

describe('ENTER_EDIT reducer', () => {
  it('seeds both buffers with the URL tab active and cursors at end', () => {
    const request = createRequest({ url: 'https://{{host}}/users', body: '{"name":"Alice"}' });
    const state = createInitialState({ requests: [request], selectedIndex: 0 });

    const result = reducer(state, { type: 'ENTER_EDIT', buffers: { url: 'https://{{host}}/users', body: '{"name":"Alice"}' }, visibleHeight: 10, visibleWidth: 40 });

    expect(result.mode).toBe('edit');
    expect(result.editTarget).toBe('url');
    expect(result.editBuffers.url.text).toBe('https://{{host}}/users');
    expect(result.editBuffers.url.cursor).toBe('https://{{host}}/users'.length);
    expect(result.editBuffers.body.text).toBe('{"name":"Alice"}');
    expect(result.editBuffers.body.cursor).toBe('{"name":"Alice"}'.length);
  });

  it('seeds the body buffer as empty with cursor at 0 when body is undefined', () => {
    const request = createRequest({ body: undefined });
    const state = createInitialState({ requests: [request], selectedIndex: 0 });

    const result = reducer(state, { type: 'ENTER_EDIT', buffers: { url: request.url, body: '' }, visibleHeight: 10, visibleWidth: 40 });

    expect(result.editBuffers.body.text).toBe('');
    expect(result.editBuffers.body.cursor).toBe(0);
  });

  it('clamps scroll offsets from 0 against the URL cursor', () => {
    const state = createInitialState({
      editScrollOffset: 5,
      editHorizontalOffset: 10,
    });

    const result = reducer(state, { type: 'ENTER_EDIT', buffers: { url: 'hello', body: '' }, visibleHeight: 10, visibleWidth: 40 });

    expect(result.editScrollOffset).toBe(0);
    expect(result.editHorizontalOffset).toBe(0);
  });
});

describe('EDIT_KEY reducer', () => {
  it('applies the op to the active target buffer only', () => {
    const state = createEditState({
      editTarget: 'url',
      editBuffers: {
        url: { text: 'abc', cursor: 3 },
        body: { text: 'xyz', cursor: 3 },
      },
    });

    const result = reducer(state, { type: 'EDIT_KEY', op: 'insert', insert: 'd', visibleHeight: 10, visibleWidth: 40 });

    expect(result.editBuffers.url.text).toBe('abcd');
    expect(result.editBuffers.body.text).toBe('xyz');
  });

  it('applies the op to the body buffer when body is active', () => {
    const state = createEditState({
      editTarget: 'body',
      editBuffers: {
        url: { text: 'abc', cursor: 3 },
        body: { text: 'xyz', cursor: 3 },
      },
    });

    const result = reducer(state, { type: 'EDIT_KEY', op: 'insert', insert: 'w', visibleHeight: 10, visibleWidth: 40 });

    expect(result.editBuffers.body.text).toBe('xyzw');
    expect(result.editBuffers.url.text).toBe('abc');
  });

  it('strips newlines from insert when the URL tab is active (Enter is a no-op)', () => {
    const state = createEditState({
      editTarget: 'url',
      editBuffers: {
        url: { text: 'https://a.com', cursor: 12 },
        body: { text: '', cursor: 0 },
      },
    });

    const result = reducer(state, { type: 'EDIT_KEY', op: 'insert', insert: '\n', visibleHeight: 10, visibleWidth: 40 });

    expect(result.editBuffers.url.text).toBe('https://a.com');
    expect(result.editBuffers.url.cursor).toBe(12);
  });

  it('strips newlines from multi-character paste when the URL tab is active', () => {
    const state = createEditState({
      editTarget: 'url',
      editBuffers: {
        url: { text: '', cursor: 0 },
        body: { text: '', cursor: 0 },
      },
    });

    const result = reducer(state, { type: 'EDIT_KEY', op: 'insert', insert: 'https://a.com\n/x', visibleHeight: 10, visibleWidth: 40 });

    expect(result.editBuffers.url.text).toBe('https://a.com/x');
    expect(result.editBuffers.url.cursor).toBe('https://a.com/x'.length);
  });

  it('inserts a newline in the body tab', () => {
    const state = createEditState({
      editTarget: 'body',
      editBuffers: {
        url: { text: 'abc', cursor: 0 },
        body: { text: 'abcd', cursor: 2 },
      },
    });

    const result = reducer(state, { type: 'EDIT_KEY', op: 'insert', insert: '\n', visibleHeight: 10, visibleWidth: 40 });

    expect(result.editBuffers.body.text).toBe('ab\ncd');
    expect(result.editBuffers.body.cursor).toBe(3);
  });

  it('scrolls viewport down when cursor moves below visible window', () => {
    let current = createEditState({
      editTarget: 'body',
      editBuffers: {
        url: { text: '', cursor: 0 },
        body: { text: 'line0\nline1\nline2\nline3\nline4\nline5', cursor: 0 },
      },
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

    expect(current.editBuffers.body.cursor).toBe(18);
    expect(current.editScrollOffset).toBe(1);
  });

  it('scrolls viewport up when cursor moves above visible window', () => {
    let current = createEditState({
      editTarget: 'body',
      editBuffers: {
        url: { text: '', cursor: 0 },
        body: { text: 'line0\nline1\nline2\nline3\nline4\nline5', cursor: 24 },
      },
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

    expect(current.editBuffers.body.cursor).toBe(6);
    expect(current.editScrollOffset).toBe(1);

    current = reducer(current, {
      type: 'EDIT_KEY',
      op: 'up',
      visibleHeight: 3,
      visibleWidth: 40,
    });

    expect(current.editBuffers.body.cursor).toBe(0);
    expect(current.editScrollOffset).toBe(0);
  });

  it('adjusts horizontal offset when cursor moves past visible width on a long line', () => {
    const longLine = 'a'.repeat(60);
    let current = createEditState({
      editTarget: 'body',
      editBuffers: {
        url: { text: '', cursor: 0 },
        body: { text: longLine, cursor: 0 },
      },
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

    expect(current.editBuffers.body.cursor).toBe(25);
    expect(current.editHorizontalOffset).toBe(6);
  });
});

describe('SWITCH_EDIT_TAB reducer', () => {
  it('switches from url to body and preserves both buffers and cursors', () => {
    const state = createEditState({
      editTarget: 'url',
      editBuffers: {
        url: { text: 'https://a.com', cursor: 5 },
        body: { text: '{"k":"v"}', cursor: 7 },
      },
      editScrollOffset: 3,
      editHorizontalOffset: 2,
    });

    const result = reducer(state, { type: 'SWITCH_EDIT_TAB', target: 'body', visibleHeight: 10, visibleWidth: 40 });

    expect(result.editTarget).toBe('body');
    expect(result.editBuffers.url.text).toBe('https://a.com');
    expect(result.editBuffers.url.cursor).toBe(5);
    expect(result.editBuffers.body.text).toBe('{"k":"v"}');
    expect(result.editBuffers.body.cursor).toBe(7);
  });

  it('re-clamps scroll offsets from 0 against the restored buffer cursor', () => {
    const state = createEditState({
      editTarget: 'url',
      editBuffers: {
        url: { text: 'short', cursor: 5 },
        body: { text: 'line0\nline1\nline2\nline3', cursor: 18 },
      },
      editScrollOffset: 0,
      editHorizontalOffset: 0,
    });

    const result = reducer(state, { type: 'SWITCH_EDIT_TAB', target: 'body', visibleHeight: 2, visibleWidth: 40 });

    expect(result.editScrollOffset).toBe(2);
  });

  it('switches from body back to url', () => {
    const state = createEditState({
      editTarget: 'body',
      editBuffers: {
        url: { text: 'https://a.com', cursor: 5 },
        body: { text: 'hello', cursor: 5 },
      },
    });

    const result = reducer(state, { type: 'SWITCH_EDIT_TAB', target: 'url', visibleHeight: 10, visibleWidth: 40 });

    expect(result.editTarget).toBe('url');
  });

  it('is a no-op when the target is already active', () => {
    const state = createEditState({
      editTarget: 'url',
      editBuffers: {
        url: { text: 'abc', cursor: 0 },
        body: { text: 'xyz', cursor: 0 },
      },
    });

    const result = reducer(state, { type: 'SWITCH_EDIT_TAB', target: 'url', visibleHeight: 10, visibleWidth: 40 });

    expect(result).toBe(state);
  });

  it('refuses switching to body on a form-data request and sets the transient message', () => {
    const request = createRequest({ formdataFields: [{ key: 'k', value: 'v', type: 'text' }] });
    const state = createEditState({
      requests: [request],
      selectedIndex: 0,
      editTarget: 'url',
      editBuffers: {
        url: { text: 'https://a.com', cursor: 12 },
        body: { text: '', cursor: 0 },
      },
    });

    const result = reducer(state, { type: 'SWITCH_EDIT_TAB', target: 'body', visibleHeight: 10, visibleWidth: 40 });

    expect(result.editTarget).toBe('url');
    expect(result.editBuffers).toBe(state.editBuffers);
    expect(result.transientMessage).toBe('form-data request body is not supported to edit for now');
  });
});

describe('COMMIT_EDIT reducer', () => {
  it('stores both edited url and body and returns to normal mode', () => {
    const request = createRequest({ url: 'https://old.com', body: '{"name":"Alice"}' });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      editBuffers: {
        url: { text: 'https://new.com', cursor: 15 },
        body: { text: '{"name":"Bob"}', cursor: 14 },
      },
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.mode).toBe('normal');
    expect(result.requests[0].url).toBe('https://new.com');
    expect(result.requests[0].body).toBe('{"name":"Bob"}');
    expect(result.transientMessage).toBe('Request updated');
  });

  it('does not mutate the original request object', () => {
    const request = createRequest({ url: 'https://old.com', body: 'original' });
    const originalRef = request;
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      editBuffers: {
        url: { text: 'https://new.com', cursor: 15 },
        body: { text: 'modified', cursor: 8 },
      },
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(originalRef.body).toBe('original');
    expect(originalRef.url).toBe('https://old.com');
    expect(result.requests[0].body).toBe('modified');
    expect(result.requests[0].url).toBe('https://new.com');
    expect(result.requests[0]).not.toBe(originalRef);
  });

  it('normalizes empty body buffer to undefined', () => {
    const request = createRequest({ body: 'some content' });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      editBuffers: {
        url: { text: request.url, cursor: request.url.length },
        body: { text: '', cursor: 0 },
      },
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.requests[0].body).toBeUndefined();
  });

  it('commits the url verbatim with no normalization', () => {
    const request = createRequest({ url: 'https://old.com' });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      editBuffers: {
        url: { text: '', cursor: 0 },
        body: { text: request.body ?? '', cursor: 0 },
      },
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.requests[0].url).toBe('');
  });

  it('detects a change in url only', () => {
    const request = createRequest({ url: 'https://old.com', body: 'same' });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      editBuffers: {
        url: { text: 'https://new.com', cursor: 15 },
        body: { text: 'same', cursor: 4 },
      },
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.requests[0].isDirty).toBe(true);
    expect(result.transientMessage).toBe('Request updated');
  });

  it('detects a change in body only', () => {
    const request = createRequest({ url: 'https://same.com', body: 'old' });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      editBuffers: {
        url: { text: 'https://same.com', cursor: 15 },
        body: { text: 'new', cursor: 3 },
      },
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.requests[0].isDirty).toBe(true);
    expect(result.transientMessage).toBe('Request updated');
  });

  it('does not set isDirty or transient message when both values are unchanged', () => {
    const request = createRequest({ url: 'https://same.com', body: 'unchanged' });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      editBuffers: {
        url: { text: 'https://same.com', cursor: 15 },
        body: { text: 'unchanged', cursor: 9 },
      },
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.requests[0].isDirty).toBe(false);
    expect(result.transientMessage).toBeNull();
    expect(result.mode).toBe('normal');
  });

  it('marks only the selected request dirty when a value changes', () => {
    const request0 = createRequest({ url: 'https://old.com', body: 'original' });
    const request1 = createRequest({ url: 'https://other.com', body: 'other' });
    const state: AppState = {
      ...createInitialState({ requests: [request0, request1], selectedIndex: 0 }),
      mode: 'edit',
      editBuffers: {
        url: { text: 'https://new.com', cursor: 15 },
        body: { text: 'changed', cursor: 7 },
      },
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.requests[0].isDirty).toBe(true);
    expect(result.requests[1].isDirty).toBe(false);
  });

  it('preserves an existing isDirty marker when the commit is unchanged', () => {
    const request = createRequest({ url: 'https://same.com', body: 'original', isDirty: true });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      editBuffers: {
        url: { text: 'https://same.com', cursor: 15 },
        body: { text: 'original', cursor: 8 },
      },
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.requests[0].isDirty).toBe(true);
  });

  it('returns state unchanged when no request at selectedIndex', () => {
    const state: AppState = {
      ...createInitialState({ requests: [], selectedIndex: 0 }),
      mode: 'edit',
      editBuffers: {
        url: { text: 'hello', cursor: 5 },
        body: { text: '', cursor: 0 },
      },
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result).toBe(state);
  });

  it('clears edit fields after commit', () => {
    const request = createRequest({ url: 'https://test.com', body: 'test' });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      editBuffers: {
        url: { text: 'https://new.com', cursor: 15 },
        body: { text: 'new value', cursor: 9 },
      },
      editScrollOffset: 3,
      editHorizontalOffset: 5,
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.editBuffers.url.text).toBe('');
    expect(result.editBuffers.url.cursor).toBe(0);
    expect(result.editBuffers.body.text).toBe('');
    expect(result.editBuffers.body.cursor).toBe(0);
    expect(result.editTarget).toBe('url');
    expect(result.editScrollOffset).toBe(0);
    expect(result.editHorizontalOffset).toBe(0);
  });

  it('clears transientError when set', () => {
    const request = createRequest({ url: 'https://test.com', body: 'test' });
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
    const request = createRequest({ url: 'https://original.com', body: 'original' });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      editBuffers: {
        url: { text: 'https://modified.com', cursor: 20 },
        body: { text: 'modified', cursor: 8 },
      },
    };

    const result = reducer(state, { type: 'CANCEL_EDIT' });

    expect(result.mode).toBe('normal');
    expect(result.requests[0].url).toBe('https://original.com');
    expect(result.requests[0].body).toBe('original');
  });

  it('discards both buffers and resets editTarget to url', () => {
    const state: AppState = {
      ...createInitialState({ selectedIndex: 0 }),
      mode: 'edit',
      editTarget: 'body',
      editBuffers: {
        url: { text: 'https://modified.com', cursor: 20 },
        body: { text: 'modified', cursor: 8 },
      },
      editScrollOffset: 3,
      editHorizontalOffset: 5,
    };

    const result = reducer(state, { type: 'CANCEL_EDIT' });

    expect(result.editBuffers.url.text).toBe('');
    expect(result.editBuffers.url.cursor).toBe(0);
    expect(result.editBuffers.body.text).toBe('');
    expect(result.editBuffers.body.cursor).toBe(0);
    expect(result.editTarget).toBe('url');
    expect(result.editScrollOffset).toBe(0);
    expect(result.editHorizontalOffset).toBe(0);
  });

  it('leaves marker unset on cancelled edit', () => {
    const request = createRequest({ body: 'original' });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      editBuffers: {
        url: { text: request.url, cursor: request.url.length },
        body: { text: 'modified', cursor: 8 },
      },
    };

    const result = reducer(state, { type: 'CANCEL_EDIT' });

    expect(result.requests[0].isDirty).toBe(false);
  });
});