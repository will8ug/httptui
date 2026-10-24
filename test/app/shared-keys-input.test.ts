import { describe, expect, it } from 'vitest';
import type { Key } from 'ink';

import type { Action, AppState } from '../../src/core/types';
import { panelState, populatedPanelState, runNormalInput, type Panel } from '../helpers/dispatch';
import { makeKey } from '../helpers/keys';
import { createRequest } from '../helpers/requests';

interface SharedKey {
  label: string;
  input: string;
  key?: Key;
  action: Action;
}

const UNGATED_KEYS: readonly SharedKey[] = [
  { label: 'g', input: 'g', action: { type: 'JUMP_VERTICAL', direction: 'start' } },
  { label: 'G', input: 'G', action: { type: 'JUMP_VERTICAL', direction: 'end' } },
  { label: '0', input: '0', action: { type: 'JUMP_HORIZONTAL', direction: 'start' } },
  { label: '$', input: '$', action: { type: 'JUMP_HORIZONTAL', direction: 'end' } },
  { label: 'h', input: 'h', action: { type: 'SCROLL_HORIZONTAL', direction: 'left' } },
  { label: 'left arrow', input: '', key: makeKey({ leftArrow: true }), action: { type: 'SCROLL_HORIZONTAL', direction: 'left' } },
  { label: 'l', input: 'l', action: { type: 'SCROLL_HORIZONTAL', direction: 'right' } },
  { label: 'right arrow', input: '', key: makeKey({ rightArrow: true }), action: { type: 'SCROLL_HORIZONTAL', direction: 'right' } },
  { label: '?', input: '?', action: { type: 'TOGGLE_HELP' } },
  { label: 'f', input: 'f', action: { type: 'TOGGLE_FULLSCREEN' } },
];

const GATED_KEYS: readonly SharedKey[] = [
  { label: 'v', input: 'v', action: { type: 'TOGGLE_VERBOSE' } },
  { label: 'w', input: 'w', action: { type: 'TOGGLE_WRAP' } },
  { label: 'r', input: 'r', action: { type: 'TOGGLE_RAW' } },
  { label: '/', input: '/', action: { type: 'ENTER_SEARCH' } },
];

const ALL_PANELS: readonly Panel[] = [null, 'requests', 'response', 'details'];
const RESPONSE_VISIBLE_PANELS: readonly Panel[] = [null, 'response'];
const RESPONSE_HIDDEN_PANELS: readonly Panel[] = ['requests', 'details'];

interface DispatchRow {
  name: string;
  panel: Panel;
  input: string;
  key: Key;
  expected: Action[];
}

function panelName(panel: Panel): string {
  return panel === null ? 'split view' : `${panel}-maximized`;
}

function buildRows(
  keys: readonly SharedKey[],
  panels: readonly Panel[],
  expectedOf: (sharedKey: SharedKey) => Action[],
): DispatchRow[] {
  return keys.flatMap((sharedKey) =>
    panels.map((panel) => ({
      name: `${sharedKey.label} while ${panelName(panel)}`,
      panel,
      input: sharedKey.input,
      key: sharedKey.key ?? makeKey(),
      expected: expectedOf(sharedKey),
    })),
  );
}

function expectDispatch(state: AppState, row: DispatchRow): void {
  const result = runNormalInput(state, row.input, row.key);

  expect(result.actions).toEqual(row.expected);
  expect(result.exit).not.toHaveBeenCalled();
  expect(result.suspend).not.toHaveBeenCalled();
  expect(result.clipboardRunner).not.toHaveBeenCalled();
  expect(result.clipboardReadRunner).not.toHaveBeenCalled();
}

describe('ungated unified keys dispatch identically in every mode', () => {
  it.each(buildRows(UNGATED_KEYS, ALL_PANELS, (sharedKey) => [sharedKey.action]))('$name', (row) => {
    expectDispatch(populatedPanelState(row.panel), row);
  });
});

describe('response-gated unified keys dispatch while the response is visible', () => {
  it.each(buildRows(GATED_KEYS, RESPONSE_VISIBLE_PANELS, (sharedKey) => [sharedKey.action]))('$name', (row) => {
    expectDispatch(populatedPanelState(row.panel), row);
  });
});

describe('response-gated unified keys are no-ops while the response is hidden', () => {
  it.each(buildRows(GATED_KEYS, RESPONSE_HIDDEN_PANELS, () => []))('$name', (row) => {
    expectDispatch(populatedPanelState(row.panel), row);
  });
});

describe('response-gated unified keys dispatch with a null response wherever the panel is visible', () => {
  it.each(buildRows(GATED_KEYS, RESPONSE_VISIBLE_PANELS, (sharedKey) => [sharedKey.action]))('$name', (row) => {
    expectDispatch(panelState(row.panel, { requests: [createRequest()], response: null }), row);
  });
});
