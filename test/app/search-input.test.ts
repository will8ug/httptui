import { describe, expect, it, vi } from 'vitest';
import type { Key } from 'ink';

import { createInitialState } from '../helpers/state';
import { createMockResponse } from '../helpers/responses';
import { handleNormalInput, handleSearchInput } from '../../src/app/input-handlers';
import { formatResponseBody } from '../../src/core/formatter';
import { computeResponseLayout } from '../../src/core/response-layout';
import type { Action, AppState } from '../../src/core/types';
import { getPanelContentWidth } from '../../src/utils/layout';
import { makeKey } from '../helpers/keys';

describe('match offsets in a maximized response panel (wrap mode)', () => {
  const COLUMNS = 80;
  const WRAPPED_LINE = 'x'.repeat(120);
  const BODY = `${WRAPPED_LINE}\nfirst needle\nsecond needle`;
  const wrapResponse = createMockResponse({ body: BODY, size: { bodyBytes: BODY.length } });

  function searchState(overrides: Partial<AppState> = {}): AppState {
    return createInitialState({
      response: wrapResponse,
      maximizedPanel: 'response',
      focusedPanel: 'response',
      wrapMode: 'wrap',
      rawMode: true,
      verbose: false,
      searchMatches: [1, 2],
      currentMatchIndex: 0,
      lastSearchQuery: 'needle',
      ...overrides,
    });
  }

  function bodyVisualStartAt(state: AppState, maximizedPanel: AppState['maximizedPanel']): number[] {
    const response = state.response;
    if (!response) {
      throw new Error('expected a state with a response');
    }
    const layout = computeResponseLayout({
      response,
      verbose: state.verbose,
      rawMode: state.rawMode,
      wrapMode: state.wrapMode,
      contentWidth: getPanelContentWidth({ panel: 'response', maximizedPanel, columns: COLUMNS }),
      formattedBody: formatResponseBody(response.body, state.rawMode),
    });
    return layout.bodyVisualStart;
  }

  function pressNormalKey(state: AppState, input: string, key: Key = makeKey()): Action[] {
    const dispatched: Action[] = [];
    handleNormalInput({
      state,
      selectedRequest: undefined,
      columns: COLUMNS,
      rows: 24,
      effectiveResponseHeight: 10,
      effectiveDetailMaxContent: 40,
      editorVisibleHeight: 10,
      editorContentWidth: 40,
      exit: () => {},
      suspend: vi.fn(),
      executorConfig: { insecure: false },
      clipboardRunner: undefined,
      clipboardReadRunner: undefined,
      abortControllerRef: { current: null },
      input,
      key,
      dispatch: (action) => dispatched.push(action),
    });
    return dispatched;
  }

  function pressSearchKey(state: AppState, input: string, key: Key = makeKey()): Action[] {
    const dispatched: Action[] = [];
    handleSearchInput({
      state,
      columns: COLUMNS,
      effectiveResponseHeight: 10,
      effectiveDetailMaxContent: 40,
      input,
      key,
      dispatch: (action) => dispatched.push(action),
    });
    return dispatched;
  }

  it('n and N dispatch match offsets computed at the fullscreen width while maximized', () => {
    const state = searchState();
    const fullscreen = bodyVisualStartAt(state, 'response');
    const split = bodyVisualStartAt(state, null);

    expect(fullscreen[1] - fullscreen[0]).toBe(2);
    expect(split[1] - split[0]).toBe(3);
    expect(fullscreen[1]).toBeLessThan(split[1]);

    const nextActions = pressNormalKey(state, 'n');
    expect(nextActions).toHaveLength(1);
    expect(nextActions[0]).toMatchObject({ type: 'NEXT_MATCH', targetVisualIndex: fullscreen[2] });

    const prevActions = pressNormalKey(searchState({ currentMatchIndex: 1 }), 'N');
    expect(prevActions).toHaveLength(1);
    expect(prevActions[0]).toMatchObject({ type: 'PREV_MATCH', targetVisualIndex: fullscreen[1] });
  });

  it('search Enter dispatches CONFIRM_SEARCH at the fullscreen width while maximized and at the split width otherwise', () => {
    const maximized = searchState({ mode: 'search', searchQuery: 'needle' });
    const maximizedActions = pressSearchKey(maximized, '', makeKey({ return: true }));
    expect(maximizedActions).toHaveLength(1);
    expect(maximizedActions[0]).toMatchObject({
      type: 'CONFIRM_SEARCH',
      firstMatchVisualIndex: bodyVisualStartAt(maximized, 'response')[1],
    });

    const splitState = searchState({ mode: 'search', searchQuery: 'needle', maximizedPanel: null });
    const splitActions = pressSearchKey(splitState, '', makeKey({ return: true }));
    expect(splitActions).toHaveLength(1);
    expect(splitActions[0]).toMatchObject({
      type: 'CONFIRM_SEARCH',
      firstMatchVisualIndex: bodyVisualStartAt(splitState, null)[1],
    });
    expect(bodyVisualStartAt(splitState, null)[1]).toBeGreaterThan(bodyVisualStartAt(maximized, 'response')[1]);
  });
});
