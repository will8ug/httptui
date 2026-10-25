import { describe, expect, it } from 'vitest';

import type { AppState } from '../../../src/core/types';
import { INITIAL_EDIT } from '../../../src/core/reducers/helpers';
import { createRequest } from '../../helpers/requests';
import { createInitialState, createEditState, reducer } from '../../helpers/state';

describe('ENTER_EDIT reducer', () => {
  it('seeds all buffers with the URL tab active and cursors at end', () => {
    const request = createRequest({ url: 'https://{{host}}/users', body: '{"name":"Alice"}' });
    const state = createInitialState({ requests: [request], selectedIndex: 0 });

    const result = reducer(state, { type: 'ENTER_EDIT', buffers: { url: 'https://{{host}}/users', body: '{"name":"Alice"}', headers: '' } });

    expect(result.mode).toBe('edit');
    expect(result.edit.target).toBe('url');
    expect(result.edit.buffers.url.text).toBe('https://{{host}}/users');
    expect(result.edit.buffers.url.cursor).toBe('https://{{host}}/users'.length);
    expect(result.edit.buffers.body.text).toBe('{"name":"Alice"}');
    expect(result.edit.buffers.body.cursor).toBe('{"name":"Alice"}'.length);
    expect(result.edit.buffers.headers.text).toBe('');
    expect(result.edit.buffers.headers.cursor).toBe(0);
  });

  it('seeds the headers buffer from the action buffers with the cursor at end', () => {
    const headersText = 'Accept: application/json\nAuthorization: Bearer {{token}}';
    const request = createRequest({ headers: { Accept: 'application/json', Authorization: 'Bearer {{token}}' } });
    const state = createInitialState({ requests: [request], selectedIndex: 0 });

    const result = reducer(state, { type: 'ENTER_EDIT', buffers: { url: request.url, body: '', headers: headersText } });

    expect(result.edit.buffers.headers.text).toBe(headersText);
    expect(result.edit.buffers.headers.cursor).toBe(headersText.length);
  });

  it('seeds the body buffer as empty with cursor at 0 when body is undefined', () => {
    const request = createRequest({ body: undefined });
    const state = createInitialState({ requests: [request], selectedIndex: 0 });

    const result = reducer(state, { type: 'ENTER_EDIT', buffers: { url: request.url, body: '', headers: '' } });

    expect(result.edit.buffers.body.text).toBe('');
    expect(result.edit.buffers.body.cursor).toBe(0);
  });

  it('clamps scroll offsets from 0 against the URL cursor', () => {
    const state = createInitialState({
      edit: { ...INITIAL_EDIT, scrollOffset: 5, horizontalOffset: 10 },
    });

    const result = reducer(state, { type: 'ENTER_EDIT', buffers: { url: 'hello', body: '', headers: '' } });

    expect(result.edit.scrollOffset).toBe(0);
    expect(result.edit.horizontalOffset).toBe(0);
  });
});

describe('EDIT_KEY reducer', () => {
  it('applies the op to the active target buffer only', () => {
    const state = createEditState({
      edit: {
        ...INITIAL_EDIT,
        target: 'url',
        buffers: {
          url: { text: 'abc', cursor: 3 },
          body: { text: 'xyz', cursor: 3 },
          headers: { text: '', cursor: 0 },
        },
      },
    });

    const result = reducer(state, { type: 'EDIT_KEY', op: 'insert', insert: 'd' });

    expect(result.edit.buffers.url.text).toBe('abcd');
    expect(result.edit.buffers.body.text).toBe('xyz');
  });

  it('applies the op to the body buffer when body is active', () => {
    const state = createEditState({
      edit: {
        ...INITIAL_EDIT,
        target: 'body',
        buffers: {
          url: { text: 'abc', cursor: 3 },
          body: { text: 'xyz', cursor: 3 },
          headers: { text: '', cursor: 0 },
        },
      },
    });

    const result = reducer(state, { type: 'EDIT_KEY', op: 'insert', insert: 'w' });

    expect(result.edit.buffers.body.text).toBe('xyzw');
    expect(result.edit.buffers.url.text).toBe('abc');
  });

  it('strips newlines from insert when the URL tab is active (Enter is a no-op)', () => {
    const state = createEditState({
      edit: {
        ...INITIAL_EDIT,
        target: 'url',
        buffers: {
          url: { text: 'https://a.com', cursor: 12 },
          body: { text: '', cursor: 0 },
          headers: { text: '', cursor: 0 },
        },
      },
    });

    const result = reducer(state, { type: 'EDIT_KEY', op: 'insert', insert: '\n' });

    expect(result.edit.buffers.url.text).toBe('https://a.com');
    expect(result.edit.buffers.url.cursor).toBe(12);
  });

  it('strips newlines from multi-character paste when the URL tab is active', () => {
    const state = createEditState({
      edit: {
        ...INITIAL_EDIT,
        target: 'url',
        buffers: {
          url: { text: '', cursor: 0 },
          body: { text: '', cursor: 0 },
          headers: { text: '', cursor: 0 },
        },
      },
    });

    const result = reducer(state, { type: 'EDIT_KEY', op: 'insert', insert: 'https://a.com\n/x' });

    expect(result.edit.buffers.url.text).toBe('https://a.com/x');
    expect(result.edit.buffers.url.cursor).toBe('https://a.com/x'.length);
  });

  it('inserts a newline in the body tab', () => {
    const state = createEditState({
      edit: {
        ...INITIAL_EDIT,
        target: 'body',
        buffers: {
          url: { text: 'abc', cursor: 0 },
          body: { text: 'abcd', cursor: 2 },
          headers: { text: '', cursor: 0 },
        },
      },
    });

    const result = reducer(state, { type: 'EDIT_KEY', op: 'insert', insert: '\n' });

    expect(result.edit.buffers.body.text).toBe('ab\ncd');
    expect(result.edit.buffers.body.cursor).toBe(3);
  });

  it('scrolls viewport down when cursor moves below visible window', () => {
    let current = createEditState({
      edit: {
        ...INITIAL_EDIT,
        target: 'body',
        buffers: {
          url: { text: '', cursor: 0 },
          body: { text: 'line0\nline1\nline2\nline3\nline4\nline5', cursor: 0 },
          headers: { text: '', cursor: 0 },
        },
      },
      // Editor box height at 12 rows floors at 10; minus 7 chrome rows the
      // derived visible height is 3.
      geometry: { rows: 12, columns: 80 },
    });

    for (let i = 0; i < 3; i++) {
      current = reducer(current, {
        type: 'EDIT_KEY',
        op: 'down',
      });
    }

    expect(current.edit.buffers.body.cursor).toBe(18);
    expect(current.edit.scrollOffset).toBe(1);
  });

  it('scrolls viewport up when cursor moves above visible window', () => {
    let current = createEditState({
      edit: {
        ...INITIAL_EDIT,
        target: 'body',
        buffers: {
          url: { text: '', cursor: 0 },
          body: { text: 'line0\nline1\nline2\nline3\nline4\nline5', cursor: 24 },
          headers: { text: '', cursor: 0 },
        },
        scrollOffset: 2,
      },
      geometry: { rows: 12, columns: 80 },
    });

    for (let i = 0; i < 3; i++) {
      current = reducer(current, {
        type: 'EDIT_KEY',
        op: 'up',
      });
    }

    expect(current.edit.buffers.body.cursor).toBe(6);
    expect(current.edit.scrollOffset).toBe(1);

    current = reducer(current, {
      type: 'EDIT_KEY',
      op: 'up',
    });

    expect(current.edit.buffers.body.cursor).toBe(0);
    expect(current.edit.scrollOffset).toBe(0);
  });

  it('adjusts horizontal offset when cursor moves past visible width on a long line', () => {
    const longLine = 'a'.repeat(60);
    let current = createEditState({
      edit: {
        ...INITIAL_EDIT,
        target: 'body',
        buffers: {
          url: { text: '', cursor: 0 },
          body: { text: longLine, cursor: 0 },
          headers: { text: '', cursor: 0 },
        },
      },
      // At 50 columns the editor box floors at 48 wide; minus 4 chrome the
      // derived visible width is 44.
      geometry: { rows: 24, columns: 50 },
    });

    for (let i = 0; i < 50; i++) {
      current = reducer(current, {
        type: 'EDIT_KEY',
        op: 'right',
      });
    }

    // Cursor column 50 in a 44-cell window: offset = 50 - 44 + 1 = 7.
    expect(current.edit.buffers.body.cursor).toBe(50);
    expect(current.edit.horizontalOffset).toBe(7);
  });
});

describe('SWITCH_EDIT_TAB reducer', () => {
  it('switches from url to body and preserves both buffers and cursors', () => {
    const state = createEditState({
      edit: {
        ...INITIAL_EDIT,
        target: 'url',
        buffers: {
          url: { text: 'https://a.com', cursor: 5 },
          body: { text: '{"k":"v"}', cursor: 7 },
          headers: { text: '', cursor: 0 },
        },
        scrollOffset: 3,
        horizontalOffset: 2,
      },
    });

    const result = reducer(state, { type: 'SWITCH_EDIT_TAB', target: 'body' });

    expect(result.edit.target).toBe('body');
    expect(result.edit.buffers.url.text).toBe('https://a.com');
    expect(result.edit.buffers.url.cursor).toBe(5);
    expect(result.edit.buffers.body.text).toBe('{"k":"v"}');
    expect(result.edit.buffers.body.cursor).toBe(7);
  });

  it('re-clamps scroll offsets from 0 against the restored buffer cursor', () => {
    const state = createEditState({
      edit: {
        ...INITIAL_EDIT,
        target: 'url',
        buffers: {
          url: { text: 'short', cursor: 5 },
          body: { text: 'line0\nline1\nline2\nline3\nline4', cursor: 24 },
          headers: { text: '', cursor: 0 },
        },
      },
      // Derived visible height at 12 rows is 3.
      // Cursor line 4 → offset = 4 - 3 + 1 = 2.
      geometry: { rows: 12, columns: 80 },
    });

    const result = reducer(state, { type: 'SWITCH_EDIT_TAB', target: 'body' });

    expect(result.edit.scrollOffset).toBe(2);
  });

  it('switches from body back to url', () => {
    const state = createEditState({
      edit: {
        ...INITIAL_EDIT,
        target: 'body',
        buffers: {
          url: { text: 'https://a.com', cursor: 5 },
          body: { text: 'hello', cursor: 5 },
          headers: { text: '', cursor: 0 },
        },
      },
    });

    const result = reducer(state, { type: 'SWITCH_EDIT_TAB', target: 'url' });

    expect(result.edit.target).toBe('url');
  });

  it('switches from url to headers and preserves the headers buffer and cursor', () => {
    const state = createEditState({
      edit: {
        ...INITIAL_EDIT,
        target: 'url',
        buffers: {
          url: { text: 'https://a.com', cursor: 5 },
          body: { text: 'hello', cursor: 5 },
          headers: { text: 'Accept: application/json', cursor: 10 },
        },
      },
    });

    const result = reducer(state, { type: 'SWITCH_EDIT_TAB', target: 'headers' });

    expect(result.edit.target).toBe('headers');
    expect(result.edit.buffers.headers.text).toBe('Accept: application/json');
    expect(result.edit.buffers.headers.cursor).toBe(10);
  });

  it('switches from headers to body', () => {
    const state = createEditState({
      edit: {
        ...INITIAL_EDIT,
        target: 'headers',
        buffers: {
          url: { text: 'https://a.com', cursor: 5 },
          body: { text: 'hello', cursor: 5 },
          headers: { text: 'Accept: a', cursor: 9 },
        },
      },
    });

    const result = reducer(state, { type: 'SWITCH_EDIT_TAB', target: 'body' });

    expect(result.edit.target).toBe('body');
  });

  it('cycles url to headers to body and wraps back to url', () => {
    let current = createEditState({
      edit: {
        ...INITIAL_EDIT,
        target: 'url',
        buffers: {
          url: { text: 'https://a.com', cursor: 5 },
          body: { text: 'hello', cursor: 5 },
          headers: { text: 'Accept: a', cursor: 9 },
        },
      },
    });

    current = reducer(current, { type: 'SWITCH_EDIT_TAB', target: 'headers' });
    expect(current.edit.target).toBe('headers');

    current = reducer(current, { type: 'SWITCH_EDIT_TAB', target: 'body' });
    expect(current.edit.target).toBe('body');

    current = reducer(current, { type: 'SWITCH_EDIT_TAB', target: 'url' });
    expect(current.edit.target).toBe('url');
  });

  it('is a no-op when the target is already active', () => {
    const state = createEditState({
      edit: {
        ...INITIAL_EDIT,
        target: 'url',
        buffers: {
          url: { text: 'abc', cursor: 0 },
          body: { text: 'xyz', cursor: 0 },
          headers: { text: '', cursor: 0 },
        },
      },
    });

    const result = reducer(state, { type: 'SWITCH_EDIT_TAB', target: 'url' });

    expect(result).toBe(state);
  });

  it('refuses switching to body on a form-data request and sets the transient message', () => {
    const request = createRequest({ formdataFields: [{ key: 'k', value: 'v', type: 'text' }] });
    const state = createEditState({
      requests: [request],
      selectedIndex: 0,
      edit: {
        ...INITIAL_EDIT,
        target: 'url',
        buffers: {
          url: { text: 'https://a.com', cursor: 12 },
          body: { text: '', cursor: 0 },
          headers: { text: '', cursor: 0 },
        },
      },
    });

    const result = reducer(state, { type: 'SWITCH_EDIT_TAB', target: 'body' });

    expect(result.edit.target).toBe('url');
    expect(result.edit.buffers).toBe(state.edit.buffers);
    expect(result.transientMessage).toBe('form-data request body is not supported to edit for now');
  });
});

describe('COMMIT_EDIT reducer', () => {
  it('stores both edited url and body and returns to normal mode', () => {
    const request = createRequest({ url: 'https://old.com', body: '{"name":"Alice"}' });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      edit: {
        ...INITIAL_EDIT,
        buffers: {
          url: { text: 'https://new.com', cursor: 15 },
          body: { text: '{"name":"Bob"}', cursor: 14 },
          headers: { text: '', cursor: 0 },
        },
      },
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.mode).toBe('normal');
    expect(result.requests[0].url).toBe('https://new.com');
    expect(result.requests[0].body).toBe('{"name":"Bob"}');
    expect(result.transientMessage).toBe('Request updated');
  });

  it('stores parsed headers on the request and returns to normal mode', () => {
    const request = createRequest({ headers: { Accept: 'application/json' } });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      edit: {
        ...INITIAL_EDIT,
        buffers: {
          url: { text: request.url, cursor: request.url.length },
          body: { text: '', cursor: 0 },
          headers: { text: 'Content-Type: application/json\nAccept: text/html', cursor: 'Content-Type: application/json\nAccept: text/html'.length },
        },
      },
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.mode).toBe('normal');
    expect(result.requests[0].headers).toEqual({ 'Content-Type': 'application/json', Accept: 'text/html' });
  });

  it('commits an empty headers buffer as an empty record', () => {
    const request = createRequest({ headers: { Accept: 'application/json' } });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      edit: {
        ...INITIAL_EDIT,
        buffers: {
          url: { text: request.url, cursor: request.url.length },
          body: { text: '', cursor: 0 },
          headers: { text: '', cursor: 0 },
        },
      },
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.requests[0].headers).toEqual({});
  });

  it('rejects the commit when a header line is malformed', () => {
    const request = createRequest({ url: 'https://old.com', body: 'original' });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      edit: {
        ...INITIAL_EDIT,
        buffers: {
          url: { text: 'https://new.com', cursor: 15 },
          body: { text: 'changed', cursor: 7 },
          headers: { text: 'Accept: application/json\nbrokenheader', cursor: 0 },
        },
      },
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.mode).toBe('edit');
    expect(result.requests[0].url).toBe('https://old.com');
    expect(result.requests[0].body).toBe('original');
    expect(result.requests[0].headers).toEqual({});
    expect(result.edit.buffers).toBe(state.edit.buffers);
    expect(result.transientError).toBe('Cannot save: header line 2 is missing a ":"');
  });

  it('does not mutate the original request object', () => {
    const request = createRequest({ url: 'https://old.com', body: 'original' });
    const originalRef = request;
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      edit: {
        ...INITIAL_EDIT,
        buffers: {
          url: { text: 'https://new.com', cursor: 15 },
          body: { text: 'modified', cursor: 8 },
          headers: { text: '', cursor: 0 },
        },
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
      edit: {
        ...INITIAL_EDIT,
        buffers: {
          url: { text: request.url, cursor: request.url.length },
          body: { text: '', cursor: 0 },
          headers: { text: '', cursor: 0 },
        },
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
      edit: {
        ...INITIAL_EDIT,
        buffers: {
          url: { text: '', cursor: 0 },
          body: { text: request.body ?? '', cursor: 0 },
          headers: { text: '', cursor: 0 },
        },
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
      edit: {
        ...INITIAL_EDIT,
        buffers: {
          url: { text: 'https://new.com', cursor: 15 },
          body: { text: 'same', cursor: 4 },
          headers: { text: '', cursor: 0 },
        },
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
      edit: {
        ...INITIAL_EDIT,
        buffers: {
          url: { text: 'https://same.com', cursor: 15 },
          body: { text: 'new', cursor: 3 },
          headers: { text: '', cursor: 0 },
        },
      },
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.requests[0].isDirty).toBe(true);
    expect(result.transientMessage).toBe('Request updated');
  });

  it('detects a change in headers only', () => {
    const request = createRequest({ url: 'https://same.com', body: 'same', headers: { Accept: 'a' } });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      edit: {
        ...INITIAL_EDIT,
        buffers: {
          url: { text: 'https://same.com', cursor: 15 },
          body: { text: 'same', cursor: 4 },
          headers: { text: 'Accept: b', cursor: 9 },
        },
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
      edit: {
        ...INITIAL_EDIT,
        buffers: {
          url: { text: 'https://same.com', cursor: 15 },
          body: { text: 'unchanged', cursor: 9 },
          headers: { text: '', cursor: 0 },
        },
      },
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.requests[0].isDirty).toBe(false);
    expect(result.transientMessage).toBeNull();
    expect(result.mode).toBe('normal');
  });

  it('does not mark the request changed when header lines are only reordered', () => {
    const request = createRequest({ headers: { Accept: 'a', 'X-B': 'b' } });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      edit: {
        ...INITIAL_EDIT,
        buffers: {
          url: { text: request.url, cursor: request.url.length },
          body: { text: '', cursor: 0 },
          headers: { text: 'X-B: b\nAccept: a', cursor: 'X-B: b\nAccept: a'.length },
        },
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
      edit: {
        ...INITIAL_EDIT,
        buffers: {
          url: { text: 'https://new.com', cursor: 15 },
          body: { text: 'changed', cursor: 7 },
          headers: { text: '', cursor: 0 },
        },
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
      edit: {
        ...INITIAL_EDIT,
        buffers: {
          url: { text: 'https://same.com', cursor: 15 },
          body: { text: 'original', cursor: 8 },
          headers: { text: '', cursor: 0 },
        },
      },
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.requests[0].isDirty).toBe(true);
  });

  it('returns state unchanged when no request at selectedIndex', () => {
    const state: AppState = {
      ...createInitialState({ requests: [], selectedIndex: 0 }),
      mode: 'edit',
      edit: {
        ...INITIAL_EDIT,
        buffers: {
          url: { text: 'hello', cursor: 5 },
          body: { text: '', cursor: 0 },
          headers: { text: '', cursor: 0 },
        },
      },
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result).toBe(state);
  });

  it('clears the edit cluster after commit', () => {
    const request = createRequest({ url: 'https://test.com', body: 'test' });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      edit: {
        ...INITIAL_EDIT,
        buffers: {
          url: { text: 'https://new.com', cursor: 15 },
          body: { text: 'new value', cursor: 9 },
          headers: { text: '', cursor: 0 },
        },
        scrollOffset: 3,
        horizontalOffset: 5,
      },
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.edit.buffers.url.text).toBe('');
    expect(result.edit.buffers.url.cursor).toBe(0);
    expect(result.edit.buffers.body.text).toBe('');
    expect(result.edit.buffers.body.cursor).toBe(0);
    expect(result.edit.buffers.headers.text).toBe('');
    expect(result.edit.buffers.headers.cursor).toBe(0);
    expect(result.edit.target).toBe('url');
    expect(result.edit.scrollOffset).toBe(0);
    expect(result.edit.horizontalOffset).toBe(0);
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
      edit: {
        ...INITIAL_EDIT,
        buffers: {
          url: { text: 'https://modified.com', cursor: 20 },
          body: { text: 'modified', cursor: 8 },
          headers: { text: '', cursor: 0 },
        },
      },
    };

    const result = reducer(state, { type: 'CANCEL_EDIT' });

    expect(result.mode).toBe('normal');
    expect(result.requests[0].url).toBe('https://original.com');
    expect(result.requests[0].body).toBe('original');
  });

  it('discards all buffers and resets the edit target to url', () => {
    const state: AppState = {
      ...createInitialState({ selectedIndex: 0 }),
      mode: 'edit',
      edit: {
        ...INITIAL_EDIT,
        target: 'body',
        buffers: {
          url: { text: 'https://modified.com', cursor: 20 },
          body: { text: 'modified', cursor: 8 },
          headers: { text: 'Accept: a', cursor: 9 },
        },
        scrollOffset: 3,
        horizontalOffset: 5,
      },
    };

    const result = reducer(state, { type: 'CANCEL_EDIT' });

    expect(result.edit.buffers.url.text).toBe('');
    expect(result.edit.buffers.url.cursor).toBe(0);
    expect(result.edit.buffers.body.text).toBe('');
    expect(result.edit.buffers.body.cursor).toBe(0);
    expect(result.edit.buffers.headers.text).toBe('');
    expect(result.edit.buffers.headers.cursor).toBe(0);
    expect(result.edit.target).toBe('url');
    expect(result.edit.scrollOffset).toBe(0);
    expect(result.edit.horizontalOffset).toBe(0);
  });

  it('leaves marker unset on cancelled edit', () => {
    const request = createRequest({ body: 'original' });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0 }),
      mode: 'edit',
      edit: {
        ...INITIAL_EDIT,
        buffers: {
          url: { text: request.url, cursor: request.url.length },
          body: { text: 'modified', cursor: 8 },
          headers: { text: '', cursor: 0 },
        },
      },
    };

    const result = reducer(state, { type: 'CANCEL_EDIT' });

    expect(result.requests[0].isDirty).toBe(false);
  });
});

describe('edit dormancy invariant', () => {
  // Characterization pin: the exit and commit resets already enforce dormancy.
  // scrollOffset and horizontalOffset derive from the active buffer's cursor
  // clamping; the whole-object reset drops them with the buffers.
  it('cluster deep-equals INITIAL_EDIT after every exit/commit action', () => {
    const dirty: AppState = {
      ...createInitialState({ requests: [createRequest()], selectedIndex: 0 }),
      mode: 'edit',
      edit: {
        target: 'body',
        buffers: {
          url: { text: 'https://stale.com', cursor: 10 },
          body: { text: 'stale body', cursor: 5 },
          headers: { text: 'Accept: stale', cursor: 7 },
        },
        scrollOffset: 3,
        horizontalOffset: 5,
        escapeArmedAt: 1_700_000_000_000,
      },
    };

    const afterCancel = reducer(dirty, { type: 'CANCEL_EDIT' });
    expect(afterCancel.mode).toBe('normal');
    expect(afterCancel.edit).toEqual(INITIAL_EDIT);

    const afterCommit = reducer(dirty, { type: 'COMMIT_EDIT' });
    expect(afterCommit.mode).toBe('normal');
    expect(afterCommit.edit).toEqual(INITIAL_EDIT);
  });
});
