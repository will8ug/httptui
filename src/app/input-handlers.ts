import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

import type { Dispatch } from 'react';
import type { Key, SuspendTerminal } from 'ink';

import { deleteBackward, deleteForward, insertText, moveLeft, moveLineEnd, moveLineStart, moveRight } from '../core/editor';
import type { EditorBuffer } from '../core/editor';
import { toErrorInfo } from '../core/executor';
import { formatResponseBody } from '../core/formatter';
import { headersToText } from '../core/headers';
import { isSearchActive, responseViewportFromState, responseVisible } from '../core/reducer';
import { serializeHttpFile } from '../core/http-serializer';
import { buildInPlaceContent } from '../core/in-place-save';
import { detectFormat, parseAnyFormat } from '../core/format-detector';
import { parseEnvironmentFile } from '../core/env-parser';
import { loadConfig } from '../core/config';
import { completePath } from '../utils/path-completion';
import type { PathEntry } from '../utils/path-completion';
import { EDIT_CANCEL_WINDOW_MS } from '../utils/timing';
import { hasUnsavedChanges } from '../utils/request';
import type { Action, AppState, ExecutorConfig, ParsedRequest, ResponseData } from '../core/types';
import type { ClipboardRunner } from '../core/clipboard';
import { EDIT_TAB_ORDER } from '../core/types';
import { copySelectedAsCurl, pasteFromClipboard, performEditorHandoff, sendSelectedRequest } from './commands';
import { normalizeKeyName, resolveKeyAction } from './key-table';

function findMatchIndices(response: ResponseData, rawMode: boolean, query: string): number[] {
  const formattedBody = formatResponseBody(response.body, rawMode);
  const bodyLines = formattedBody.split('\n');
  const queryLower = query.toLowerCase();
  const matches: number[] = [];
  for (let i = 0; i < bodyLines.length; i += 1) {
    if (bodyLines[i].toLowerCase().includes(queryLower)) {
      matches.push(i);
    }
  }
  return matches;
}

function getBodyVisualStart(state: AppState): number[] | null {
  return responseViewportFromState(state)?.bodyVisualStart ?? null;
}

function buildMatchNavigationAction(
  state: AppState,
  direction: 'next' | 'prev',
): Extract<Action, { type: 'NEXT_MATCH' | 'PREV_MATCH' }> {
  const bodyVisualStart = getBodyVisualStart(state);
  const matchCount = state.searchMatches.length;
  const targetIndex = direction === 'next'
    ? (state.currentMatchIndex + 1) % matchCount
    : (state.currentMatchIndex - 1 + matchCount) % matchCount;
  const targetRawIndex = state.searchMatches[targetIndex];
  const targetVisualIndex = bodyVisualStart ? bodyVisualStart[targetRawIndex] : targetRawIndex;
  return direction === 'next'
    ? { type: 'NEXT_MATCH', targetVisualIndex }
    : { type: 'PREV_MATCH', targetVisualIndex };
}

function applyLineEdit(
  buffer: EditorBuffer,
  input: string,
  key: Key,
  moveCursor: (cursor: number) => void,
  updateInput: (value: string, cursor: number) => void,
): boolean {
  if (key.home || (key.ctrl && input === 'a')) {
    moveCursor(moveLineStart(buffer).cursor);
    return true;
  }
  if (key.end || (key.ctrl && input === 'e')) {
    moveCursor(moveLineEnd(buffer).cursor);
    return true;
  }
  if (key.backspace) {
    const moved = deleteBackward(buffer);
    updateInput(moved.text, moved.cursor);
    return true;
  }
  if (key.delete) {
    const moved = deleteForward(buffer);
    updateInput(moved.text, moved.cursor);
    return true;
  }
  if (key.leftArrow) {
    moveCursor(moveLeft(buffer).cursor);
    return true;
  }
  if (key.rightArrow) {
    moveCursor(moveRight(buffer).cursor);
    return true;
  }
  if (input && !key.ctrl && !key.meta) {
    const moved = insertText(buffer, input);
    updateInput(moved.text, moved.cursor);
    return true;
  }
  return false;
}

export function handleHelpInput({ input, key, dispatch }: {
  input: string;
  key: Key;
  dispatch: Dispatch<Action>;
}): void {
  if (key.escape || input === '?') {
    dispatch({ type: 'CLOSE_HELP' });
  }
}

export function handleFileLoadInput({ state, input, key, executorConfig, dispatch }: {
  state: AppState;
  input: string;
  key: Key;
  executorConfig: ExecutorConfig;
  dispatch: Dispatch<Action>;
}): void {
  if (key.escape) {
    dispatch({ type: 'CANCEL_FILE_LOAD' });
    return;
  }

  if (key.return) {
    const inputPath = state.fileLoad.input.trim();
    if (!inputPath) {
      dispatch({ type: 'SET_FILE_LOAD_ERROR', error: 'Please enter a file path' });
      return;
    }

    const resolvedPath = resolve(inputPath);

    if (!existsSync(resolvedPath)) {
      dispatch({ type: 'SET_FILE_LOAD_ERROR', error: `File not found: ${inputPath}` });
      return;
    }

    try {
      const content = readFileSync(resolvedPath, 'utf8');
      const parseResult = parseAnyFormat(resolvedPath, content);

      if (parseResult.requests.length === 0) {
        dispatch({ type: 'SET_FILE_LOAD_ERROR', error: `No requests found in ${inputPath}` });
        return;
      }

      const newConfig = loadConfig(dirname(resolvedPath));
      const newExecutorConfig = {
        ...executorConfig,
        certificates: newConfig?.certificates,
        editor: newConfig?.editor,
      };

      dispatch({
        type: 'LOAD_FILE',
        requests: parseResult.requests,
        variables: parseResult.variables,
        filePath: resolvedPath,
        executorConfig: newExecutorConfig,
      });
    } catch (error) {
      dispatch({ type: 'SET_FILE_LOAD_ERROR', error: toErrorInfo(error).message });
    }

    return;
  }

  if (key.tab) {
    const listDir = (dir: string): PathEntry[] => {
      try {
        return readdirSync(resolve(dir), { withFileTypes: true }).map((entry) => ({
          name: entry.name,
          isDirectory: entry.isDirectory(),
        }));
      } catch {
        return [];
      }
    };

    const completed = completePath({ text: state.fileLoad.input, cursor: state.fileLoad.cursor }, listDir);

    if (completed.text !== state.fileLoad.input) {
      dispatch({ type: 'UPDATE_FILE_LOAD_INPUT', value: completed.text, cursor: completed.cursor });
    }

    dispatch({ type: 'SET_FILE_LOAD_COMPLETIONS', completions: completed.candidates });
    return;
  }

  applyLineEdit(
    { text: state.fileLoad.input, cursor: state.fileLoad.cursor },
    input,
    key,
    (cursor) => {
      dispatch({ type: 'MOVE_FILE_LOAD_CURSOR', cursor });
    },
    (value, cursor) => {
      dispatch({ type: 'UPDATE_FILE_LOAD_INPUT', value, cursor });
    },
  );
}

export function handleSearchInput({ state, input, key, dispatch }: {
  state: AppState;
  input: string;
  key: Key;
  dispatch: Dispatch<Action>;
}): void {
  if (key.escape) {
    dispatch({ type: 'CANCEL_SEARCH' });
    return;
  }

  if (key.return) {
    let firstMatchVisualIndex: number | undefined;
    if (state.response && state.searchQuery) {
      const matches = findMatchIndices(state.response, state.rawMode, state.searchQuery);
      if (matches.length > 0) {
        const bodyVisualStart = getBodyVisualStart(state);
        if (bodyVisualStart) {
          firstMatchVisualIndex = bodyVisualStart[matches[0]];
        }
      }
    }
    dispatch({ type: 'CONFIRM_SEARCH', firstMatchVisualIndex });
    return;
  }

  if (key.backspace) {
    dispatch({ type: 'UPDATE_SEARCH_INPUT', value: state.searchQuery.slice(0, -1) });
    return;
  }

  if (input && !key.ctrl && !key.meta) {
    dispatch({ type: 'UPDATE_SEARCH_INPUT', value: state.searchQuery + input });
  }
}

export function handleEnvSelectInput({ state, input, key, dispatch }: {
  state: AppState;
  input: string;
  key: Key;
  dispatch: Dispatch<Action>;
}): void {
  if (key.escape) {
    dispatch({ type: 'CANCEL_ENV_SELECT' });
    return;
  }

  if (key.return) {
    const option = state.availableEnvironments[state.envSelect.selectedIndex];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for out-of-bounds env option access
    if (!option) {
      return;
    }
    if (option.file === null) {
      dispatch({ type: 'SWITCH_ENV', environmentVariables: [], envName: null });
    } else {
      try {
        const content = readFileSync(option.file, 'utf8');
        const parsed = parseEnvironmentFile(content);
        dispatch({
          type: 'SWITCH_ENV',
          environmentVariables: parsed.variables,
          envName: option.name === '(none)' ? null : option.name,
        });
      } catch (error) {
        dispatch({
          type: 'SET_ENV_SELECT_ERROR',
          error: error instanceof Error ? error.message : 'Failed to load environment',
        });
      }
    }
    return;
  }

  const isEnvUp = input === 'k' || key.upArrow;
  const isEnvDown = input === 'j' || key.downArrow;
  if (isEnvUp || isEnvDown) {
    dispatch({ type: 'MOVE_ENV_SELECTION', direction: isEnvUp ? 'up' : 'down' });
    return;
  }

  if (input === 'g') {
    dispatch({ type: 'JUMP_ENV_SELECTION', target: 'top' });
    return;
  }
  if (input === 'G') {
    dispatch({ type: 'JUMP_ENV_SELECTION', target: 'bottom' });
    return;
  }
}

export function handleSaveInput({ state, input, key, dispatch }: {
  state: AppState;
  input: string;
  key: Key;
  dispatch: Dispatch<Action>;
}): void {
  if (key.escape) {
    dispatch({ type: 'CANCEL_SAVE' });
    return;
  }

  if (key.return) {
    const inputPath = state.saveLoad.input.trim();
    if (!inputPath) {
      dispatch({ type: 'SET_SAVE_ERROR', error: 'Please enter a file path' });
      return;
    }

    // Resolve path: absolute as-is, relative to loaded file's directory
    const baseDir = dirname(state.filePath);
    const targetPath = resolve(baseDir, inputPath);

    if (existsSync(targetPath)) {
      dispatch({ type: 'SET_SAVE_ERROR', error: `File exists: ${basename(targetPath)}` });
      return;
    }

    try {
      const content = serializeHttpFile(state.requests, state.fileVariables);

      writeFileSync(targetPath, content, 'utf8');
      const fileName = targetPath.split('/').pop() ?? targetPath;
      dispatch({ type: 'SAVE_FILE', message: `Saved ${state.requests.length} requests to ${fileName}`, filePath: targetPath });
    } catch (error) {
      dispatch({ type: 'SET_SAVE_ERROR', error: toErrorInfo(error).message });
    }

    return;
  }

  applyLineEdit(
    { text: state.saveLoad.input, cursor: state.saveLoad.cursor },
    input,
    key,
    (cursor) => {
      dispatch({ type: 'MOVE_SAVE_CURSOR', cursor });
    },
    (value, cursor) => {
      dispatch({ type: 'UPDATE_SAVE_INPUT', value, cursor });
    },
  );
}

export function handleResponseSaveInput({ state, input, key, dispatch }: {
  state: AppState;
  input: string;
  key: Key;
  dispatch: Dispatch<Action>;
}): void {
  if (!state.response) {
    return;
  }

  if (key.escape) {
    dispatch({ type: 'CANCEL_RESPONSE_SAVE' });
    return;
  }

  if (key.return) {
    const inputPath = state.responseSave.input.trim();
    if (!inputPath) {
      dispatch({ type: 'SET_RESPONSE_SAVE_ERROR', error: 'Please enter a file path' });
      return;
    }

    const baseDir = dirname(state.filePath);
    const targetPath = resolve(baseDir, inputPath);

    if (existsSync(targetPath)) {
      dispatch({ type: 'SET_RESPONSE_SAVE_ERROR', error: `File exists: ${basename(targetPath)}` });
      return;
    }

    try {
      writeFileSync(targetPath, state.response.rawBody, 'utf8');
      dispatch({ type: 'SAVE_RESPONSE_FILE', message: `Saved response to ${basename(targetPath)}` });
    } catch (error) {
      dispatch({ type: 'SET_RESPONSE_SAVE_ERROR', error: toErrorInfo(error).message });
    }

    return;
  }

  applyLineEdit(
    { text: state.responseSave.input, cursor: state.responseSave.cursor },
    input,
    key,
    (cursor) => {
      dispatch({ type: 'MOVE_RESPONSE_SAVE_CURSOR', cursor });
    },
    (value, cursor) => {
      dispatch({ type: 'UPDATE_RESPONSE_SAVE_INPUT', value, cursor });
    },
  );
}

export function handleEditInput({ state, selectedRequest, input, key, dispatch }: {
  state: AppState;
  selectedRequest: ParsedRequest | undefined;
  input: string;
  key: Key;
  dispatch: Dispatch<Action>;
}): void {
  if (key.escape) {
    if (!selectedRequest) {
      dispatch({ type: 'CANCEL_EDIT' });
      return;
    }

    const isEditorDirty =
      state.edit.buffers.url.text !== selectedRequest.url ||
      state.edit.buffers.body.text !== (selectedRequest.body ?? '') ||
      state.edit.buffers.headers.text !== headersToText(selectedRequest.headers);

    if (!isEditorDirty) {
      dispatch({ type: 'CANCEL_EDIT' });
      return;
    }

    if (
      state.edit.escapeArmedAt !== null &&
      Date.now() - state.edit.escapeArmedAt <= EDIT_CANCEL_WINDOW_MS
    ) {
      dispatch({ type: 'CANCEL_EDIT' });
    } else {
      dispatch({ type: 'ARM_EDIT_CANCEL', now: Date.now() });
    }
    return;
  }

  if (key.ctrl && input === 's') {
    dispatch({ type: 'COMMIT_EDIT' });
    return;
  }

  if (key.home || (key.ctrl && input === 'a')) {
    dispatch({ type: 'EDIT_KEY', op: 'lineStart' });
    return;
  }

  if (key.end || (key.ctrl && input === 'e')) {
    dispatch({ type: 'EDIT_KEY', op: 'lineEnd' });
    return;
  }

  if (key.return) {
    dispatch({ type: 'EDIT_KEY', op: 'insert', insert: '\n' });
    return;
  }

  if (key.backspace) {
    dispatch({ type: 'EDIT_KEY', op: 'deleteBackward' });
    return;
  }

  if (key.delete) {
    dispatch({ type: 'EDIT_KEY', op: 'deleteForward' });
    return;
  }

  if (key.leftArrow) {
    dispatch({ type: 'EDIT_KEY', op: 'left' });
    return;
  }

  if (key.rightArrow) {
    dispatch({ type: 'EDIT_KEY', op: 'right' });
    return;
  }

  if (key.upArrow) {
    dispatch({ type: 'EDIT_KEY', op: 'up' });
    return;
  }

  if (key.downArrow) {
    dispatch({ type: 'EDIT_KEY', op: 'down' });
    return;
  }

  if (key.tab && key.shift) {
    const nextTarget = EDIT_TAB_ORDER[(EDIT_TAB_ORDER.indexOf(state.edit.target) + 1) % EDIT_TAB_ORDER.length];
    dispatch({ type: 'SWITCH_EDIT_TAB', target: nextTarget });
    return;
  }

  if (input && !key.ctrl && !key.meta) {
    dispatch({ type: 'EDIT_KEY', op: 'insert', insert: input });
  }
}

export function handleConfirmDiscardInput({ state, exit, suspend, input, key, dispatch }: {
  state: AppState;
  exit: () => void;
  suspend: SuspendTerminal;
  input: string;
  key: Key;
  dispatch: Dispatch<Action>;
}): void {
  if (input === 'y') {
    const pendingAction = state.pendingDiscardAction;
    dispatch({ type: 'CONFIRM_DISCARD' });
    switch (pendingAction) {
      case 'reload':
        try {
          const content = readFileSync(state.filePath, 'utf8');
          const parseResult = parseAnyFormat(state.filePath, content);
          dispatch({ type: 'RELOAD_FILE', requests: parseResult.requests, variables: parseResult.variables });
        } catch (error) {
          dispatch({ type: 'SET_TRANSIENT_ERROR', error: toErrorInfo(error).message });
        }
        break;
      case 'fileLoad':
        dispatch({ type: 'ENTER_FILE_LOAD' });
        break;
      case 'quit':
        exit();
        break;
      case 'editorHandoff':
        void performEditorHandoff({ filePath: state.filePath, editor: state.editor, suspend, dispatch });
        break;
    }
    return;
  }

  if (input === 'n' || key.escape) {
    dispatch({ type: 'CANCEL_DISCARD' });
  }
}

export function handleConfirmInPlaceSaveInput({ state, input, key, dispatch }: {
  state: AppState;
  input: string;
  key: Key;
  dispatch: Dispatch<Action>;
}): void {
  if (input === 'y') {
    dispatch({ type: 'CONFIRM_IN_PLACE_SAVE' });

    try {
      const rawContent = readFileSync(state.filePath, 'utf8');
      const result = buildInPlaceContent(rawContent, state.requests);

      if (!result.ok) {
        dispatch({ type: 'SET_TRANSIENT_MESSAGE', message: result.error });
        return;
      }

      if (result.editedCount === 0) {
        dispatch({ type: 'SET_TRANSIENT_MESSAGE', message: 'No changes to save' });
        return;
      }

      writeFileSync(state.filePath, result.content, 'utf8');
      dispatch({ type: 'SAVE_FILE', message: `Saved ${result.editedCount} request(s) to ${basename(state.filePath)}`, filePath: state.filePath });
    } catch (error) {
      dispatch({ type: 'SET_TRANSIENT_MESSAGE', message: toErrorInfo(error).message });
    }

    return;
  }

  if (input === 'n' || key.escape) {
    dispatch({ type: 'CANCEL_IN_PLACE_SAVE' });
  }
}

export function handleNormalInput({
  state,
  selectedRequest,
  exit,
  suspend,
  executorConfig,
  clipboardRunner,
  clipboardReadRunner,
  abortControllerRef,
  input,
  key,
  dispatch,
}: {
  state: AppState;
  selectedRequest: ParsedRequest | undefined;
  exit: () => void;
  suspend: SuspendTerminal;
  executorConfig: ExecutorConfig;
  clipboardRunner: ClipboardRunner | undefined;
  clipboardReadRunner: ClipboardRunner | undefined;
  abortControllerRef: { current: AbortController | null };
  input: string;
  key: Key;
  dispatch: Dispatch<Action>;
}): void {
  const isFullscreen = state.maximizedPanel !== null;

  if (key.escape && state.isLoading) {
    abortControllerRef.current?.abort();
    dispatch({ type: 'REQUEST_CANCEL', warning: 'Request canceled' });
    return;
  }

  if (key.escape) {
    // Back up one level at a time: an active search is dismissed first in
    // every panel state; exiting fullscreen remains only once none is left.
    if (isSearchActive(state)) {
      dispatch({ type: 'CANCEL_SEARCH' });
      return;
    }
    if (isFullscreen) {
      dispatch({ type: 'TOGGLE_FULLSCREEN' });
    }
    return;
  }

  if (key.ctrl && input === 'c') {
    exit();
    return;
  }

  // Ctrl+S and Ctrl+G are normal-mode intercepts ahead of the key-table
  // lookup: bare 'g' resolves to a jump, which fullscreen keeps on Ctrl+G
  // (pinned by test).
  if (!isFullscreen && key.ctrl && input === 's') {
    if (!hasUnsavedChanges(state.requests)) {
      dispatch({ type: 'SET_TRANSIENT_MESSAGE', message: 'No changes to save' });
      return;
    }

    try {
      const content = readFileSync(state.filePath, 'utf8');
      if (detectFormat(state.filePath, content) !== 'http') {
        dispatch({ type: 'SET_TRANSIENT_MESSAGE', message: 'In-place save is only available for .http files; press S to save as a new file' });
        return;
      }
    } catch (error) {
      dispatch({ type: 'SET_TRANSIENT_MESSAGE', message: toErrorInfo(error).message });
      return;
    }

    dispatch({ type: 'ENTER_IN_PLACE_SAVE_CONFIRM' });
    return;
  }

  if (!isFullscreen && key.ctrl && input === 'g') {
    try {
      const content = readFileSync(state.filePath, 'utf8');
      if (detectFormat(state.filePath, content) !== 'http') {
        dispatch({ type: 'SET_TRANSIENT_MESSAGE', message: 'External editor is only available for .http files' });
        return;
      }
    } catch (error) {
      dispatch({ type: 'SET_TRANSIENT_MESSAGE', message: toErrorInfo(error).message });
      return;
    }

    if (hasUnsavedChanges(state.requests)) {
      dispatch({ type: 'REQUEST_DISCARD_CONFIRM', action: 'editorHandoff' });
      return;
    }

    void performEditorHandoff({ filePath: state.filePath, editor: state.editor, suspend, dispatch });
    return;
  }

  const keyName = normalizeKeyName(input, key);

  const tableAction = resolveKeyAction(keyName, state);
  if (tableAction) {
    dispatch(tableAction);
    return;
  }

  if (input === 'q') {
    if (isSearchActive(state)) {
      dispatch({ type: 'CANCEL_SEARCH' });
      return;
    }

    // q never quits from fullscreen; Escape backs up a level there.
    if (!isFullscreen) {
      if (hasUnsavedChanges(state.requests)) {
        dispatch({ type: 'REQUEST_DISCARD_CONFIRM', action: 'quit' });
      } else {
        exit();
      }
    }
    return;
  }

  if (!isFullscreen) {
    if (key.tab) {
      dispatch({ type: 'SWITCH_PANEL' });
      return;
    }

    if (input === 'd') {
      dispatch({ type: 'TOGGLE_REQUEST_DETAILS' });
      return;
    }

    if (input === 'o') {
      if (hasUnsavedChanges(state.requests)) {
        dispatch({ type: 'REQUEST_DISCARD_CONFIRM', action: 'fileLoad' });
      } else {
        dispatch({ type: 'ENTER_FILE_LOAD' });
      }
      return;
    }

    if (input === 'E') {
      if (state.availableEnvironments.length > 1) {
        dispatch({ type: 'ENTER_ENV_SELECT' });
      } else {
        dispatch({ type: 'SET_TRANSIENT_MESSAGE', message: 'No environments configured' });
      }
      return;
    }

    if (input === 'S') {
      dispatch({ type: 'ENTER_SAVE' });
      return;
    }

    if (input === 's') {
      if (state.response === null) {
        dispatch({ type: 'SET_TRANSIENT_MESSAGE', message: 'No response to save' });
        return;
      }
      if (state.response.rawBody === '') {
        dispatch({ type: 'SET_TRANSIENT_MESSAGE', message: 'No response body to save' });
        return;
      }
      dispatch({ type: 'ENTER_RESPONSE_SAVE' });
      return;
    }

    if (input === 'y') {
      void copySelectedAsCurl({
        request: selectedRequest,
        variables: state.variables,
        baseDir: dirname(state.filePath),
        certificates: state.certificates,
        insecure: state.insecure,
        clipboardRunner,
        dispatch,
      });
      return;
    }

    if (input === 'p') {
      void pasteFromClipboard({ clipboardReadRunner, dispatch });
      return;
    }

    if (input === 'e') {
      if (!selectedRequest) {
        return;
      }
      dispatch({ type: 'ENTER_EDIT', buffers: { url: selectedRequest.url, body: selectedRequest.body ?? '', headers: headersToText(selectedRequest.headers) } });
      return;
    }

    if (input === 'R') {
      if (hasUnsavedChanges(state.requests)) {
        dispatch({ type: 'REQUEST_DISCARD_CONFIRM', action: 'reload' });
        return;
      }
      try {
        const content = readFileSync(state.filePath, 'utf8');
        const parseResult = parseAnyFormat(state.filePath, content);
        dispatch({ type: 'RELOAD_FILE', requests: parseResult.requests, variables: parseResult.variables });
      } catch (error) {
        dispatch({ type: 'SET_TRANSIENT_ERROR', error: toErrorInfo(error).message });
      }

      return;
    }

    if (key.return) {
      void sendSelectedRequest({ state, executorConfig, abortControllerRef, dispatch });
      return;
    }
  }

  if (responseVisible(state)) {
    if (input === 'n' && state.searchMatches.length > 0) {
      dispatch(buildMatchNavigationAction(state, 'next'));
      return;
    }

    if (input === 'N' && state.searchMatches.length > 0) {
      dispatch(buildMatchNavigationAction(state, 'prev'));
      return;
    }
  }

  if (keyName === 'up' || keyName === 'down') {
    // Safe to read focusedPanel while maximized: maximizedPanel, when set,
    // always equals focusedPanel (see the invariant in core/types.ts).
    if (state.focusedPanel === 'requests') {
      dispatch({ type: 'MOVE_SELECTION', direction: keyName });
    } else {
      dispatch({ type: 'SCROLL', direction: keyName });
    }
  }
}
