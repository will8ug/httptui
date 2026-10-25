import { describe, expect, it } from 'vitest';

import { panelState, pressKey } from '../helpers/dispatch';
import { makeKey } from '../helpers/keys';
import { createRequest } from '../helpers/requests';
import { createMockResponse } from '../helpers/responses';

describe('normal-mode vertical navigation', () => {
  it('j moves the selection down when the requests panel is focused', () => {
    const actions = pressKey(panelState(null, { focusedPanel: 'requests' }), 'j');

    expect(actions).toEqual([{ type: 'MOVE_SELECTION', direction: 'down' }]);
  });

  it('k moves the selection up when the requests panel is focused', () => {
    const actions = pressKey(panelState(null, { focusedPanel: 'requests' }), 'k');

    expect(actions).toEqual([{ type: 'MOVE_SELECTION', direction: 'up' }]);
  });

  it('down arrow moves the selection down when the requests panel is focused', () => {
    const actions = pressKey(panelState(null, { focusedPanel: 'requests' }), '', makeKey({ downArrow: true }));

    expect(actions).toEqual([{ type: 'MOVE_SELECTION', direction: 'down' }]);
  });

  it('up arrow moves the selection up when the requests panel is focused', () => {
    const actions = pressKey(panelState(null, { focusedPanel: 'requests' }), '', makeKey({ upArrow: true }));

    expect(actions).toEqual([{ type: 'MOVE_SELECTION', direction: 'up' }]);
  });

  it('j, k, and arrow keys scroll when the details panel is focused', () => {
    const state = panelState(null, { focusedPanel: 'details', requests: [createRequest()] });

    expect(pressKey(state, 'j')).toEqual([{ type: 'SCROLL', direction: 'down' }]);
    expect(pressKey(state, 'k')).toEqual([{ type: 'SCROLL', direction: 'up' }]);
    expect(pressKey(state, '', makeKey({ downArrow: true }))).toEqual([
      { type: 'SCROLL', direction: 'down' },
    ]);
    expect(pressKey(state, '', makeKey({ upArrow: true }))).toEqual([
      { type: 'SCROLL', direction: 'up' },
    ]);
  });

  it('j, k, and arrow keys scroll when the response panel is focused', () => {
    const state = panelState(null, {
      focusedPanel: 'response',
      response: createMockResponse({ body: 'line-1\nline-2\nline-3' }),
    });

    expect(pressKey(state, 'j')).toEqual([{ type: 'SCROLL', direction: 'down' }]);
    expect(pressKey(state, 'k')).toEqual([{ type: 'SCROLL', direction: 'up' }]);
    expect(pressKey(state, '', makeKey({ downArrow: true }))).toEqual([
      { type: 'SCROLL', direction: 'down' },
    ]);
    expect(pressKey(state, '', makeKey({ upArrow: true }))).toEqual([
      { type: 'SCROLL', direction: 'up' },
    ]);
  });
});

describe('normal-mode panel toggles', () => {
  it('Tab dispatches SWITCH_PANEL', () => {
    const actions = pressKey(panelState(null), '', makeKey({ tab: true }));

    expect(actions).toEqual([{ type: 'SWITCH_PANEL' }]);
  });

  it('d dispatches TOGGLE_REQUEST_DETAILS', () => {
    const actions = pressKey(panelState(null), 'd');

    expect(actions).toEqual([{ type: 'TOGGLE_REQUEST_DETAILS' }]);
  });
});
