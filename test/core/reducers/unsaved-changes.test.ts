import { describe, expect, it } from 'vitest';

import { hasUnsavedChanges } from '../../../src/utils/request';
import { INITIAL_CONFIRM, INITIAL_EDIT } from '../../../src/core/reducers/helpers';
import { createRequest } from '../../helpers/requests';
import { createInitialState, createEditState, reducer } from '../../helpers/state';

describe('per-request dirty markers', () => {
  it('is set by COMMIT_EDIT when body changes', () => {
    const request = createRequest({ url: 'https://same.com', body: 'original' });
    const state = createEditState({
      requests: [request],
      selectedIndex: 0,
      edit: {
        ...INITIAL_EDIT,
        buffers: {
          url: { text: 'https://same.com', cursor: 15 },
          body: { text: 'changed', cursor: 7 },
          headers: { text: '', cursor: 0 },
        },
      },
    });

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.requests[0].isDirty).toBe(true);
    expect(hasUnsavedChanges(result.requests)).toBe(true);
  });

  it('is not set by COMMIT_EDIT when body is unchanged', () => {
    const request = createRequest({ url: 'https://same.com', body: 'same' });
    const state = createEditState({
      requests: [request],
      selectedIndex: 0,
      edit: {
        ...INITIAL_EDIT,
        buffers: {
          url: { text: 'https://same.com', cursor: 15 },
          body: { text: 'same', cursor: 4 },
          headers: { text: '', cursor: 0 },
        },
      },
    });

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.requests[0].isDirty).toBe(false);
    expect(hasUnsavedChanges(result.requests)).toBe(false);
  });

  it('remains set by COMMIT_EDIT when already dirty even if value is unchanged', () => {
    const request = createRequest({ url: 'https://same.com', body: 'original', isDirty: true });
    const state = createEditState({
      requests: [request],
      selectedIndex: 0,
      edit: {
        ...INITIAL_EDIT,
        buffers: {
          url: { text: 'https://same.com', cursor: 15 },
          body: { text: 'original', cursor: 8 },
          headers: { text: '', cursor: 0 },
        },
      },
    });

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.requests[0].isDirty).toBe(true);
    expect(hasUnsavedChanges(result.requests)).toBe(true);
  });

  it('marks only the selected request dirty; other requests stay clean', () => {
    const first = createRequest({ url: 'https://same.com', body: 'original' });
    const second = createRequest({ url: 'https://other.com', body: 'other' });
    const state = createEditState({
      requests: [first, second],
      selectedIndex: 0,
      edit: {
        ...INITIAL_EDIT,
        buffers: {
          url: { text: 'https://same.com', cursor: 15 },
          body: { text: 'changed', cursor: 7 },
          headers: { text: '', cursor: 0 },
        },
      },
    });

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.requests[0].isDirty).toBe(true);
    expect(result.requests[1].isDirty).toBe(false);
    expect(hasUnsavedChanges(result.requests)).toBe(true);
  });

  it('keeps the marker set when a body is reverted to its load-time value', () => {
    const request = createRequest({ url: 'https://same.com', body: 'original' });
    const state = createEditState({
      requests: [request],
      selectedIndex: 0,
      edit: {
        ...INITIAL_EDIT,
        buffers: {
          url: { text: 'https://same.com', cursor: 15 },
          body: { text: 'changed', cursor: 7 },
          headers: { text: '', cursor: 0 },
        },
      },
    });

    const first = reducer(state, { type: 'COMMIT_EDIT' });
    expect(first.requests[0].isDirty).toBe(true);
    expect(hasUnsavedChanges(first.requests)).toBe(true);

    const second = reducer(
      { ...first, mode: 'edit', edit: { ...INITIAL_EDIT, buffers: { url: { text: 'https://same.com', cursor: 15 }, body: { text: 'original', cursor: 8 }, headers: { text: '', cursor: 0 } } } },
      { type: 'COMMIT_EDIT' },
    );

    expect(second.requests[0].isDirty).toBe(true);
    expect(hasUnsavedChanges(second.requests)).toBe(true);
  });

  it('is cleared by SAVE_FILE', () => {
    const dirty = createRequest({ isDirty: true });
    const state = createInitialState({ requests: [dirty], selectedIndex: 0 });

    const result = reducer(state, { type: 'SAVE_FILE', message: 'Saved', filePath: 'test.http' });

    expect(result.requests[0].isDirty).toBe(false);
    expect(hasUnsavedChanges(result.requests)).toBe(false);
  });

  it('SAVE_FILE clears every request marker', () => {
    const first = createRequest({ isDirty: true });
    const second = createRequest({ isDirty: true });
    const state = createInitialState({ requests: [first, second], selectedIndex: 0 });

    const result = reducer(state, { type: 'SAVE_FILE', message: 'Saved', filePath: 'test.http' });

    expect(result.requests[0].isDirty).toBe(false);
    expect(result.requests[1].isDirty).toBe(false);
    expect(hasUnsavedChanges(result.requests)).toBe(false);
  });

  it('is cleared by RELOAD_FILE', () => {
    const dirty = createRequest({ isDirty: true });
    const state = createInitialState({ requests: [dirty], selectedIndex: 0 });

    const result = reducer(state, {
      type: 'RELOAD_FILE',
      requests: [createRequest()],
      variables: [],
      format: 'http',
      warningCount: 0,
    });

    expect(result.requests[0].isDirty).toBe(false);
    expect(hasUnsavedChanges(result.requests)).toBe(false);
  });

  it('is cleared by LOAD_FILE', () => {
    const dirty = createRequest({ isDirty: true });
    const state = createInitialState({ requests: [dirty], selectedIndex: 0 });

    const result = reducer(state, {
      type: 'LOAD_FILE',
      requests: [createRequest()],
      variables: [],
      filePath: 'new.http',
      format: 'http',
      warningCount: 0,
    });

    expect(result.requests[0].isDirty).toBe(false);
    expect(hasUnsavedChanges(result.requests)).toBe(false);
  });

  it('is preserved by CONFIRM_DISCARD', () => {
    const dirty = createRequest({ isDirty: true });
    const state = createInitialState({
      requests: [dirty],
      selectedIndex: 0,
      mode: 'confirmDiscard',
      confirm: { ...INITIAL_CONFIRM, pendingDiscardAction: 'quit' },
    });

    const result = reducer(state, { type: 'CONFIRM_DISCARD' });

    expect(result.requests[0].isDirty).toBe(true);
    expect(hasUnsavedChanges(result.requests)).toBe(true);
    expect(result.mode).toBe('normal');
    expect(result.confirm.pendingDiscardAction).toBeNull();
  });

  it('is preserved by CANCEL_DISCARD', () => {
    const dirty = createRequest({ isDirty: true });
    const state = createInitialState({
      requests: [dirty],
      selectedIndex: 0,
      mode: 'confirmDiscard',
      confirm: { ...INITIAL_CONFIRM, pendingDiscardAction: 'reload' },
    });

    const result = reducer(state, { type: 'CANCEL_DISCARD' });

    expect(result.requests[0].isDirty).toBe(true);
    expect(hasUnsavedChanges(result.requests)).toBe(true);
    expect(result.mode).toBe('normal');
    expect(result.confirm.pendingDiscardAction).toBeNull();
  });

  it('file-level flag is set when any request is marked', () => {
    const state = createInitialState({
      requests: [createRequest({ isDirty: false }), createRequest({ isDirty: true })],
      selectedIndex: 0,
    });

    expect(hasUnsavedChanges(state.requests)).toBe(true);
  });

  it('file-level flag is unset when no request is marked', () => {
    const state = createInitialState({
      requests: [createRequest({ isDirty: false }), createRequest({ isDirty: false })],
      selectedIndex: 0,
    });

    expect(hasUnsavedChanges(state.requests)).toBe(false);
  });
});

describe('pendingDiscardAction', () => {
  it('is set by REQUEST_DISCARD_CONFIRM for reload', () => {
    const state = createInitialState({
      requests: [createRequest({ isDirty: true })],
      selectedIndex: 0,
    });

    const result = reducer(state, { type: 'REQUEST_DISCARD_CONFIRM', action: 'reload' });

    expect(result.mode).toBe('confirmDiscard');
    expect(result.confirm.pendingDiscardAction).toBe('reload');
  });

  it('is set by REQUEST_DISCARD_CONFIRM for fileLoad', () => {
    const state = createInitialState({
      requests: [createRequest({ isDirty: true })],
      selectedIndex: 0,
    });

    const result = reducer(state, { type: 'REQUEST_DISCARD_CONFIRM', action: 'fileLoad' });

    expect(result.mode).toBe('confirmDiscard');
    expect(result.confirm.pendingDiscardAction).toBe('fileLoad');
  });

  it('is set by REQUEST_DISCARD_CONFIRM for quit', () => {
    const state = createInitialState({
      requests: [createRequest({ isDirty: true })],
      selectedIndex: 0,
    });

    const result = reducer(state, { type: 'REQUEST_DISCARD_CONFIRM', action: 'quit' });

    expect(result.mode).toBe('confirmDiscard');
    expect(result.confirm.pendingDiscardAction).toBe('quit');
  });

  it('is cleared by CONFIRM_DISCARD', () => {
    const state = createInitialState({
      requests: [createRequest({ isDirty: true })],
      selectedIndex: 0,
      mode: 'confirmDiscard',
      confirm: { ...INITIAL_CONFIRM, pendingDiscardAction: 'quit' },
    });

    const result = reducer(state, { type: 'CONFIRM_DISCARD' });

    expect(result.confirm.pendingDiscardAction).toBeNull();
    expect(result.mode).toBe('normal');
  });

  it('is cleared by CANCEL_DISCARD', () => {
    const state = createInitialState({
      requests: [createRequest({ isDirty: true })],
      selectedIndex: 0,
      mode: 'confirmDiscard',
      confirm: { ...INITIAL_CONFIRM, pendingDiscardAction: 'fileLoad' },
    });

    const result = reducer(state, { type: 'CANCEL_DISCARD' });

    expect(result.confirm.pendingDiscardAction).toBeNull();
    expect(result.mode).toBe('normal');
  });
});

describe('confirm dormancy invariant', () => {
  // Characterization pin: the exit resets already enforce dormancy. All four confirm exits share the reset.
  it('cluster deep-equals INITIAL_CONFIRM after every exit action', () => {
    const dirty = createInitialState({
      requests: [createRequest({ isDirty: true })],
      selectedIndex: 0,
      mode: 'confirmDiscard',
      confirm: { ...INITIAL_CONFIRM, pendingDiscardAction: 'quit' },
    });

    const afterConfirm = reducer(dirty, { type: 'CONFIRM_DISCARD' });
    expect(afterConfirm.mode).toBe('normal');
    expect(afterConfirm.confirm).toEqual(INITIAL_CONFIRM);

    const afterCancel = reducer(dirty, { type: 'CANCEL_DISCARD' });
    expect(afterCancel.mode).toBe('normal');
    expect(afterCancel.confirm).toEqual(INITIAL_CONFIRM);

    const afterInPlaceConfirm = reducer(dirty, { type: 'CONFIRM_IN_PLACE_SAVE' });
    expect(afterInPlaceConfirm.mode).toBe('normal');
    expect(afterInPlaceConfirm.confirm).toEqual(INITIAL_CONFIRM);

    const afterInPlaceCancel = reducer(dirty, { type: 'CANCEL_IN_PLACE_SAVE' });
    expect(afterInPlaceCancel.mode).toBe('normal');
    expect(afterInPlaceCancel.confirm).toEqual(INITIAL_CONFIRM);
  });
});
