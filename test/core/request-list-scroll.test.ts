import { describe, expect, it } from 'vitest';

import { getVisibleRequestOffset, reducer } from '../../src/core/reducer';
import type { AppState, ParsedRequest } from '../../src/core/types';
import { createRequest } from '../helpers/requests';
import { createInitialState } from '../helpers/state';

function makeRequests(count: number): ParsedRequest[] {
  return Array.from({ length: count }, (_, i) =>
    createRequest({
      name: `Request ${i + 1}`,
      method: 'GET',
      url: `https://api.example.com/resource/${i + 1}`,
      lineNumber: i + 1,
    }),
  );
}

const reduce = (state: AppState, action: Parameters<typeof reducer>[1]): AppState => reducer(state, action);

describe('getVisibleRequestOffset', () => {
  it('does not scroll when all items fit in the visible window', () => {
    const result = getVisibleRequestOffset(12, 0, 19);
    expect(result).toBe(0);
  });

  it('scrolls down when the selected index exceeds the visible window', () => {
    const result = getVisibleRequestOffset(20, 0, 19);
    expect(result).toBe(2);
  });

  it('scrolls up when the selected index is above the current offset', () => {
    const result = getVisibleRequestOffset(3, 5, 19);
    expect(result).toBe(3);
  });

  it('keeps current offset when the selected index is already visible', () => {
    const result = getVisibleRequestOffset(10, 5, 19);
    expect(result).toBe(5);
  });
});

describe('request list scrolling reducer behavior', () => {
  it('does not scroll prematurely with 13 requests on a 24-row terminal (visible height 19)', () => {
    const state = createInitialState({
      requests: makeRequests(13),
      selectedIndex: 0,
    });

    const result = reduce(state, { type: 'MOVE_SELECTION', direction: 'down', rows: 24 });
    expect(result.selectedIndex).toBe(1);
    expect(result.requestScrollOffset).toBe(0);
  });

  it('keeps the 13th request visible without scrolling on a 24-row terminal', () => {
    const state = createInitialState({
      requests: makeRequests(13),
      selectedIndex: 0,
    });

    let current = state;
    for (let i = 0; i < 12; i++) {
      current = reduce(current, { type: 'MOVE_SELECTION', direction: 'down', rows: 24 });
    }

    expect(current.selectedIndex).toBe(12);
    expect(current.requestScrollOffset).toBe(0);
  });

  it('scrolls correctly when requests exceed visible height', () => {
    const state = createInitialState({
      requests: makeRequests(25),
      selectedIndex: 0,
    });

    let current = state;
    for (let i = 0; i < 19; i++) {
      current = reduce(current, { type: 'MOVE_SELECTION', direction: 'down', rows: 24 });
    }

    const expectedScrollOffset = 1;
    expect(current.selectedIndex).toBe(19);
    expect(current.requestScrollOffset).toBe(expectedScrollOffset);
  });

  it('JUMP_VERTICAL end keeps last request visible on a 24-row terminal', () => {
    const state = createInitialState({
      requests: makeRequests(25),
      selectedIndex: 0,
      focusedPanel: 'requests',
    });

    const result = reduce(state, { type: 'JUMP_VERTICAL', direction: 'end', rows: 24 });
    const expectedScrollOffset = 6;

    expect(result.selectedIndex).toBe(24);
    expect(result.requestScrollOffset).toBe(expectedScrollOffset);
  });

  it('JUMP_VERTICAL start resets scroll offset to 0', () => {
    const state = createInitialState({
      requests: makeRequests(25),
      selectedIndex: 24,
      requestScrollOffset: 6,
      focusedPanel: 'requests',
    });

    const result = reduce(state, { type: 'JUMP_VERTICAL', direction: 'start', rows: 24 });

    expect(result.selectedIndex).toBe(0);
    expect(result.requestScrollOffset).toBe(0);
  });

  it('defaults to DEFAULT_TERMINAL_ROWS when rows is not provided', () => {
    const state = createInitialState({
      requests: makeRequests(25),
      selectedIndex: 0,
    });

    let current = state;
    for (let i = 0; i < 19; i++) {
      current = reduce(current, { type: 'MOVE_SELECTION', direction: 'down' });
    }

    const expectedScrollOffset = 1;
    expect(current.selectedIndex).toBe(19);
    expect(current.requestScrollOffset).toBe(expectedScrollOffset);
  });

  it('respects smaller terminals by scrolling earlier', () => {
    const state = createInitialState({
      requests: makeRequests(15),
      selectedIndex: 0,
    });

    let current = state;
    for (let i = 0; i < 10; i++) {
      current = reduce(current, { type: 'MOVE_SELECTION', direction: 'down', rows: 15 });
    }

    const expectedScrollOffset = 1;
    expect(current.selectedIndex).toBe(10);
    expect(current.requestScrollOffset).toBe(expectedScrollOffset);
  });
});
