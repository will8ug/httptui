import type { Key } from 'ink';

import { responseVisible } from '../core/reducer';
import type { Action, AppState } from '../core/types';

export type KeyGate = 'response-visible';

export interface KeyTableEntry {
  readonly action: Action;
  readonly gate?: KeyGate;
}

/**
 * Static key-to-intent bindings for the single dispatch handler serving both
 * split-view and fullscreen modes.
 * Deliberately separate from the SHORTCUTS display registry (core/shortcuts.ts).
 * Computed keys (n/N, vertical routing) and side-effecting keys (exit, abort,
 * clipboard, editor handoff, execution, file system) stay imperative in the
 * handler and never enter this table.
 */
export const KEY_TABLE: Readonly<Record<string, KeyTableEntry>> = {
  g: { action: { type: 'JUMP_VERTICAL', direction: 'start' } },
  G: { action: { type: 'JUMP_VERTICAL', direction: 'end' } },
  '0': { action: { type: 'JUMP_HORIZONTAL', direction: 'start' } },
  $: { action: { type: 'JUMP_HORIZONTAL', direction: 'end' } },
  left: { action: { type: 'SCROLL_HORIZONTAL', direction: 'left' } },
  right: { action: { type: 'SCROLL_HORIZONTAL', direction: 'right' } },
  '?': { action: { type: 'TOGGLE_HELP' } },
  f: { action: { type: 'TOGGLE_FULLSCREEN' } },
  v: { action: { type: 'TOGGLE_VERBOSE' }, gate: 'response-visible' },
  w: { action: { type: 'TOGGLE_WRAP' }, gate: 'response-visible' },
  r: { action: { type: 'TOGGLE_RAW' }, gate: 'response-visible' },
  '/': { action: { type: 'ENTER_SEARCH' }, gate: 'response-visible' },
};

export type SyntheticKeyName = 'up' | 'down' | 'left' | 'right';

/**
 * Collapses an Ink key event to its single lookup name: arrows and their vim
 * letters share one synthetic name (h/← → 'left', l/→ → 'right', k/↑ → 'up',
 * j/↓ → 'down'); any other single character is its own name. Multi-character
 * input (pasted text) normalizes to '' so it matches nothing.
 */
export function normalizeKeyName(input: string, key: Key): string {
  if (key.leftArrow || input === 'h') {
    return 'left' satisfies SyntheticKeyName;
  }
  if (key.rightArrow || input === 'l') {
    return 'right' satisfies SyntheticKeyName;
  }
  if (key.upArrow || input === 'k') {
    return 'up' satisfies SyntheticKeyName;
  }
  if (key.downArrow || input === 'j') {
    return 'down' satisfies SyntheticKeyName;
  }
  return input.length === 1 ? input : '';
}

/**
 * Returns null when the key is unbound or its gate rejects the current state.
 * hasOwn guards the lookup: normalized names can be arbitrary characters, and
 * prototype-chain keys ('constructor', '__proto__') must never resolve to an
 * entry.
 */
export function resolveKeyAction(keyName: string, state: AppState): Action | null {
  if (!Object.hasOwn(KEY_TABLE, keyName)) {
    return null;
  }
  const entry = KEY_TABLE[keyName];
  if (entry.gate === 'response-visible' && !responseVisible(state)) {
    return null;
  }
  return entry.action;
}
