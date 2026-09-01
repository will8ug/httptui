import { describe, expect, it } from 'vitest';

import { getFullscreenVisibleHeight } from '../../src/utils/layout';
import { computeLayoutMetrics } from '../../src/utils/layout-metrics';
import { resolveRequestDetails } from '../../src/utils/request';
import { createRequest } from '../helpers/requests';
import { createInitialState } from '../helpers/state';

const ROWS = 40;
const COLUMNS = 100;

describe('computeLayoutMetrics', () => {
  it('reports a hidden detail panel and full response height when not shown', () => {
    const metrics = computeLayoutMetrics(
      createInitialState({ showRequestDetails: false, maximizedPanel: null }),
      undefined,
      ROWS,
      COLUMNS,
    );

    expect(metrics.detailsTotalLines).toBe(0);
    expect(metrics.responseAvailableHeight).toBe(ROWS - 1);
    expect(metrics.effectiveResponseHeight).toBe(ROWS - 1);
    expect(metrics.effectiveDetailMaxContent).toBe(10);
  });

  it('treats a missing selected request as a hidden detail panel', () => {
    const metrics = computeLayoutMetrics(
      createInitialState({ showRequestDetails: true, maximizedPanel: null }),
      undefined,
      ROWS,
      COLUMNS,
    );

    expect(metrics.detailsTotalLines).toBe(0);
    expect(metrics.responseAvailableHeight).toBe(ROWS - 1);
  });

  it('reserves content plus border rows for a shown detail panel', () => {
    const request = createRequest();
    const state = createInitialState({ showRequestDetails: true, maximizedPanel: null });
    const totalLines = resolveRequestDetails(request, state.variables).totalContentLines;

    const metrics = computeLayoutMetrics(state, request, ROWS, COLUMNS);

    expect(metrics.detailsTotalLines).toBe(totalLines);
    expect(metrics.responseAvailableHeight).toBe(ROWS - 1 - totalLines - 2);
    expect(metrics.effectiveResponseHeight).toBe(metrics.responseAvailableHeight);
  });

  it('caps the detail panel at 10 content lines plus border rows', () => {
    const request = createRequest({ body: Array.from({ length: 20 }, () => 'x').join('\n') });
    const state = createInitialState({ showRequestDetails: true, maximizedPanel: null });
    const totalLines = resolveRequestDetails(request, state.variables).totalContentLines;

    expect(totalLines).toBeGreaterThan(10);

    const metrics = computeLayoutMetrics(state, request, ROWS, COLUMNS);

    expect(metrics.detailsTotalLines).toBe(totalLines);
    expect(metrics.responseAvailableHeight).toBe(ROWS - 1 - 10 - 2);
  });

  it('gives the response panel fullscreen height when maximized', () => {
    const request = createRequest();
    const metrics = computeLayoutMetrics(
      createInitialState({ showRequestDetails: true, maximizedPanel: 'response' }),
      request,
      ROWS,
      COLUMNS,
    );

    expect(metrics.detailsTotalLines).toBeGreaterThan(0);
    expect(metrics.effectiveResponseHeight).toBe(ROWS - 1);
  });

  it('gives the detail panel fullscreen visible height when maximized', () => {
    const metrics = computeLayoutMetrics(
      createInitialState({ showRequestDetails: true, maximizedPanel: 'details' }),
      createRequest(),
      ROWS,
      COLUMNS,
    );

    expect(metrics.effectiveDetailMaxContent).toBe(getFullscreenVisibleHeight(ROWS - 1));
  });
});
