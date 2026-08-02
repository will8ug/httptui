import { describe, expect, it } from 'vitest';

import type { AppState } from '../../src/core/types';
import { createRequest } from '../helpers/requests';
import { createInitialState, reducer } from '../helpers/state';

describe('isDirty flag', () => {
  it('is set by COMMIT_EDIT when body changes', () => {
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

  it('is not set by COMMIT_EDIT when body is unchanged', () => {
    const request = createRequest({ body: 'same' });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0, isDirty: false }),
      mode: 'edit',
      editBuffer: 'same',
      editCursor: 4,
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.isDirty).toBe(false);
  });

  it('remains set by COMMIT_EDIT when already dirty even if value is unchanged', () => {
    const request = createRequest({ body: 'original' });
    const state: AppState = {
      ...createInitialState({ requests: [request], selectedIndex: 0, isDirty: true }),
      mode: 'edit',
      editBuffer: 'original',
      editCursor: 8,
    };

    const result = reducer(state, { type: 'COMMIT_EDIT' });

    expect(result.isDirty).toBe(true);
  });

  it('is cleared by SAVE_FILE', () => {
    const state = createInitialState({ isDirty: true });

    const result = reducer(state, { type: 'SAVE_FILE', message: 'Saved' });

    expect(result.isDirty).toBe(false);
  });

  it('is cleared by RELOAD_FILE', () => {
    const state = createInitialState({ isDirty: true });

    const result = reducer(state, {
      type: 'RELOAD_FILE',
      requests: [createRequest()],
      variables: [],
    });

    expect(result.isDirty).toBe(false);
  });

  it('is cleared by LOAD_FILE', () => {
    const state = createInitialState({ isDirty: true });

    const result = reducer(state, {
      type: 'LOAD_FILE',
      requests: [createRequest()],
      variables: [],
      filePath: 'new.http',
    });

    expect(result.isDirty).toBe(false);
  });

  it('is cleared by CONFIRM_DISCARD', () => {
    const state = createInitialState({
      isDirty: true,
      mode: 'confirmDiscard',
      pendingDiscardAction: 'quit',
    });

    const result = reducer(state, { type: 'CONFIRM_DISCARD' });

    expect(result.isDirty).toBe(false);
    expect(result.mode).toBe('normal');
    expect(result.pendingDiscardAction).toBeNull();
  });

  it('is preserved by CANCEL_DISCARD', () => {
    const state = createInitialState({
      isDirty: true,
      mode: 'confirmDiscard',
      pendingDiscardAction: 'reload',
    });

    const result = reducer(state, { type: 'CANCEL_DISCARD' });

    expect(result.isDirty).toBe(true);
    expect(result.mode).toBe('normal');
    expect(result.pendingDiscardAction).toBeNull();
  });
});

describe('pendingDiscardAction', () => {
  it('is set by REQUEST_DISCARD_CONFIRM for reload', () => {
    const state = createInitialState({ isDirty: true });

    const result = reducer(state, { type: 'REQUEST_DISCARD_CONFIRM', action: 'reload' });

    expect(result.mode).toBe('confirmDiscard');
    expect(result.pendingDiscardAction).toBe('reload');
  });

  it('is set by REQUEST_DISCARD_CONFIRM for fileLoad', () => {
    const state = createInitialState({ isDirty: true });

    const result = reducer(state, { type: 'REQUEST_DISCARD_CONFIRM', action: 'fileLoad' });

    expect(result.mode).toBe('confirmDiscard');
    expect(result.pendingDiscardAction).toBe('fileLoad');
  });

  it('is set by REQUEST_DISCARD_CONFIRM for quit', () => {
    const state = createInitialState({ isDirty: true });

    const result = reducer(state, { type: 'REQUEST_DISCARD_CONFIRM', action: 'quit' });

    expect(result.mode).toBe('confirmDiscard');
    expect(result.pendingDiscardAction).toBe('quit');
  });

  it('is cleared by CONFIRM_DISCARD', () => {
    const state = createInitialState({
      mode: 'confirmDiscard',
      pendingDiscardAction: 'quit',
      isDirty: true,
    });

    const result = reducer(state, { type: 'CONFIRM_DISCARD' });

    expect(result.pendingDiscardAction).toBeNull();
    expect(result.mode).toBe('normal');
  });

  it('is cleared by CANCEL_DISCARD', () => {
    const state = createInitialState({
      mode: 'confirmDiscard',
      pendingDiscardAction: 'fileLoad',
      isDirty: true,
    });

    const result = reducer(state, { type: 'CANCEL_DISCARD' });

    expect(result.pendingDiscardAction).toBeNull();
    expect(result.mode).toBe('normal');
  });
});
