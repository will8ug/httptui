import { describe, expect, it } from 'vitest';

import { createInitialState, reducer } from '../../helpers/state';
import { createMockResponse } from '../../helpers/responses';

/*
 * Worked examples (nowrap, verbose off, no details panel): a body of N plain
 * lines renders status(1) + separator(1) + N = N+2 visual lines, and the
 * viewport shows rows - 1(status bar) - 3(panel chrome) of them, so
 * maxVerticalOffset = N + 2 - visible height.
 */

const EIGHT_LINE_BODY =
  'alpha\nbravo\ncharlie\ndelta\necho\nfoxtrot\ngolf\nhotel';
const TWENTY_EIGHT_LINE_BODY = Array.from(
  { length: 28 },
  (_, i) => `line-${i + 1}`,
).join('\n');

describe('SET_GEOMETRY reducer', () => {
  it('uses the default terminal dimensions until the first dispatch lands', () => {
    const state = createInitialState();

    expect(state.geometry).toEqual({ rows: 24, columns: 80 });
  });

  it('stores the reported rows and columns on the first dispatch', () => {
    const state = createInitialState();

    const result = reducer(state, { type: 'SET_GEOMETRY', rows: 30, columns: 100 });

    expect(result.geometry).toEqual({ rows: 30, columns: 100 });
  });

  it('clamps an over-scrolled response offset to the new max when rows shrink', () => {
    // 8 body lines render 10 visual lines; at rows=10 the viewport shows 6,
    // so maxVerticalOffset = 10 - 6 = 4 and the stale offset 7 clamps to 4.
    const state = createInitialState({
      response: createMockResponse({ body: EIGHT_LINE_BODY }),
      responseScrollOffset: 7,
      detailsScrollOffset: 9,
      requestScrollOffset: 3,
    });

    const result = reducer(state, { type: 'SET_GEOMETRY', rows: 10, columns: 60 });

    expect(result.responseScrollOffset).toBe(4);
    expect(result.geometry).toEqual({ rows: 10, columns: 60 });
    expect(result.detailsScrollOffset).toBe(9);
    expect(result.requestScrollOffset).toBe(3);
  });

  it('keeps a response offset that fits the grown terminal', () => {
    // 28 body lines render 30 visual lines; at rows=24 the viewport shows 20,
    // so maxVerticalOffset = 10 and the valid offset 5 stays untouched.
    const state = createInitialState({
      response: createMockResponse({ body: TWENTY_EIGHT_LINE_BODY }),
      geometry: { rows: 12, columns: 80 },
      responseScrollOffset: 5,
    });

    const result = reducer(state, { type: 'SET_GEOMETRY', rows: 24, columns: 80 });

    expect(result.responseScrollOffset).toBe(5);
    expect(result.geometry).toEqual({ rows: 24, columns: 80 });
  });

  it('clamps a response offset that exceeds the smaller max of a taller terminal', () => {
    // Offset 22 is the bottom of a 30-visual-line body at rows=12 (viewport 8,
    // max 22); growing to rows=24 shows 20 lines, so the max drops to 10.
    const state = createInitialState({
      response: createMockResponse({ body: TWENTY_EIGHT_LINE_BODY }),
      geometry: { rows: 12, columns: 80 },
      responseScrollOffset: 22,
    });

    const result = reducer(state, { type: 'SET_GEOMETRY', rows: 24, columns: 80 });

    expect(result.responseScrollOffset).toBe(10);
  });

  it('reserves the search bar row when re-clamping during search mode', () => {
    // At rows=10 the viewport shows 6 lines, but the visible search bar claims
    // one of them: maxVerticalOffset = 10 - 5 = 5, not the normal-mode 4.
    const state = createInitialState({
      response: createMockResponse({ body: EIGHT_LINE_BODY }),
      responseScrollOffset: 7,
      mode: 'search',
    });

    const result = reducer(state, { type: 'SET_GEOMETRY', rows: 10, columns: 80 });

    expect(result.responseScrollOffset).toBe(5);
  });

  it('leaves the response offset at 0 when no response is loaded', () => {
    const state = createInitialState();

    const result = reducer(state, { type: 'SET_GEOMETRY', rows: 10, columns: 40 });

    expect(result.responseScrollOffset).toBe(0);
    expect(result.geometry).toEqual({ rows: 10, columns: 40 });
  });
});
