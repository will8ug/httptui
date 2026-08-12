import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

import React, { useEffect, useReducer } from 'react';
import { useApp, useInput, useStdout } from 'ink';

import { FileLoadOverlay } from './components/FileLoadOverlay';
import { HelpOverlay } from './components/HelpOverlay';
import { SaveOverlay } from './components/SaveOverlay';
import { EditOverlay } from './components/EditOverlay';
import { ConfirmDiscardOverlay } from './components/ConfirmDiscardOverlay';
import { ConfirmInPlaceSaveOverlay } from './components/ConfirmInPlaceSaveOverlay';
import { Layout } from './components/Layout';
import { RequestList } from './components/RequestList';
import { RequestDetailsView } from './components/RequestDetailsView';
import { ResponseView } from './components/ResponseView';
import { StatusBar } from './components/StatusBar';
import { EnvSelectOverlay } from './components/EnvSelectOverlay';
import { executeRequest, isErrorInfo, toErrorInfo } from './core/executor';
import type { CertConfig } from './core/executor';
import { formatResponseBody } from './core/formatter';
import { headersToText } from './core/headers';
import { computeVerticalMaxOffset, createInitialState, reducer } from './core/reducer';
import { computeResponseLayout } from './core/response-layout';
import type { AppProps, AppState, ResponseData } from './core/types';
import { EDIT_TAB_ORDER } from './core/types';
import { serializeHttpFile } from './core/http-serializer';
import { buildInPlaceContent } from './core/in-place-save';
import { detectFormat, parseAnyFormat } from './core/format-detector';
import { parseEnvironmentFile } from './core/env-parser';
import { resolveVariables } from './core/variables';
import { matchCertificate, loadCertFiles } from './core/certificates';
import { loadConfig } from './core/config';
import { DEFAULT_TERMINAL_COLUMNS, DEFAULT_TERMINAL_ROWS, getDetailPanelHeight, getEditorContentWidth, getEditorVisibleHeight, getFullscreenContentWidth, getFullscreenRequestContentWidth, getFullscreenVisibleHeight, getResponseContentWidth } from './utils/layout';
import { TRANSIENT_CLEAR_MS } from './utils/timing';
import { hasUnsavedChanges, resolveRequestDetails } from './utils/request';
import { getResponseTotalLines } from './utils/scroll';

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

function getBodyVisualStart(state: AppState, columns: number): number[] | null {
  if (!state.response) {
    return null;
  }
  const formattedBody = formatResponseBody(state.response.body, state.rawMode);
  const layout = computeResponseLayout({
    response: state.response,
    verbose: state.verbose,
    rawMode: state.rawMode,
    wrapMode: state.wrapMode,
    contentWidth: getResponseContentWidth(columns),
    formattedBody,
  });
  return layout.bodyVisualStart;
}

export function App(props: AppProps): React.ReactElement {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [state, dispatch] = useReducer(reducer, props, createInitialState);

  const rows = stdout.rows || DEFAULT_TERMINAL_ROWS;
  const columns = stdout.columns || DEFAULT_TERMINAL_COLUMNS;
  const selectedRequest = state.requests[state.selectedIndex];
  const detailPanelMaxContent = 10;
  let detailPanelHeight = 0;
  let detailsTotalLines = 0;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for out-of-bounds access
  if (state.showRequestDetails && selectedRequest) {
    const resolved = resolveRequestDetails(selectedRequest, state.variables);
    detailsTotalLines = resolved.totalContentLines;
    detailPanelHeight = getDetailPanelHeight(detailsTotalLines, detailPanelMaxContent);
  }
  const responseAvailableHeight = rows - 1 - detailPanelHeight;
  const fullscreenAvailableHeight = rows - 1;
  const fullscreenContentWidth = getFullscreenContentWidth(columns);
  const fullscreenRequestContentWidth = getFullscreenRequestContentWidth(columns);
  const fullscreenVisibleHeight = getFullscreenVisibleHeight(fullscreenAvailableHeight);
  const editorContentWidth = getEditorContentWidth(columns);
  const editorVisibleHeight = getEditorVisibleHeight(rows);
  const effectiveResponseHeight = state.maximizedPanel === 'response' ? fullscreenAvailableHeight : responseAvailableHeight;
  const effectiveDetailMaxContent = state.maximizedPanel === 'details' ? fullscreenVisibleHeight : detailPanelMaxContent;

  useEffect(() => {
    if (state.transientMessage === null && state.transientError === null) {
      return;
    }
    const timer = setTimeout(() => { dispatch({ type: 'CLEAR_TRANSIENT_MESSAGE' }); }, TRANSIENT_CLEAR_MS);
    return () => { clearTimeout(timer); };
  }, [state.transientMessage, state.transientError]);

  const sendSelectedRequest = async (): Promise<void> => {
    if (state.isLoading) {
      return;
    }

    const request = state.requests[state.selectedIndex];

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for out-of-bounds access
    if (!request) {
      return;
    }

    dispatch({ type: 'SEND_REQUEST' });

    try {
      const resolvedRequest = resolveVariables(request, state.variables, dirname(state.filePath));

      let certConfig: CertConfig | undefined;
      if (state.certificates) {
        const matchedEntry = matchCertificate(resolvedRequest.url, state.certificates);
        if (matchedEntry) {
          const hostname = new URL(resolvedRequest.url).hostname;
          certConfig = loadCertFiles(matchedEntry, '', hostname);
        }
      }

      const result = await executeRequest(resolvedRequest, props.executorConfig, certConfig);

      if (isErrorInfo(result)) {
        dispatch({ type: 'REQUEST_ERROR', error: result });
        return;
      }

      dispatch({ type: 'RECEIVE_RESPONSE', response: result });
    } catch (error) {
      dispatch({ type: 'REQUEST_ERROR', error: toErrorInfo(error) });
    }
  };

  useInput((input, key) => {
    if (state.showHelp) {
      if (key.escape || input === '?') {
        dispatch({ type: 'CLOSE_HELP' });
      }

      return;
    }

    if (state.mode === 'fileLoad') {
      if (key.escape) {
        dispatch({ type: 'CANCEL_FILE_LOAD' });
        return;
      }

      if (key.return) {
        const inputPath = state.fileLoadInput.trim();
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
            ...props.executorConfig,
            certificates: newConfig?.certificates,
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

      if (key.backspace) {
        dispatch({ type: 'UPDATE_FILE_LOAD_INPUT', value: state.fileLoadInput.slice(0, -1) });
        return;
      }

      if (input && !key.ctrl && !key.meta) {
        dispatch({ type: 'UPDATE_FILE_LOAD_INPUT', value: state.fileLoadInput + input });
      }

      return;
    }

    if (state.mode === 'search') {
      if (key.escape) {
        dispatch({ type: 'CANCEL_SEARCH' });
        return;
      }

      if (key.return) {
        const maxOffset = computeVerticalMaxOffset(state, columns, effectiveResponseHeight, effectiveDetailMaxContent);
        let firstMatchVisualIndex: number | undefined;
        if (state.response && state.searchQuery) {
          const matches = findMatchIndices(state.response, state.rawMode, state.searchQuery);
          if (matches.length > 0) {
            const bodyVisualStart = getBodyVisualStart(state, columns);
            if (bodyVisualStart) {
              firstMatchVisualIndex = bodyVisualStart[matches[0]];
            }
          }
        }
        dispatch({ type: 'CONFIRM_SEARCH', firstMatchVisualIndex, maxOffset });
        return;
      }

      if (key.backspace) {
        dispatch({ type: 'UPDATE_SEARCH_INPUT', value: state.searchQuery.slice(0, -1) });
        return;
      }

      if (input && !key.ctrl && !key.meta) {
        dispatch({ type: 'UPDATE_SEARCH_INPUT', value: state.searchQuery + input });
      }

      return;
    }

    if (state.mode === 'envSelect') {
      if (key.escape) {
        dispatch({ type: 'CANCEL_ENV_SELECT' });
        return;
      }

      if (key.return) {
        const option = state.availableEnvironments[state.envSelectIndex];
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

      return;
    }

    if (state.mode === 'saveLoad') {
      if (key.escape) {
        dispatch({ type: 'CANCEL_SAVE' });
        return;
      }

      if (key.return) {
        const inputPath = state.saveInput.trim();
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

      if (key.backspace) {
        dispatch({ type: 'UPDATE_SAVE_INPUT', value: state.saveInput.slice(0, -1) });
        return;
      }

      if (input && !key.ctrl && !key.meta) {
        dispatch({ type: 'UPDATE_SAVE_INPUT', value: state.saveInput + input });
      }

      return;
    }

    if (state.mode === 'edit') {
      if (key.escape) {
        dispatch({ type: 'CANCEL_EDIT' });
        return;
      }

      if (key.ctrl && input === 's') {
        dispatch({ type: 'COMMIT_EDIT' });
        return;
      }

      if (key.home || (key.ctrl && input === 'a')) {
        dispatch({ type: 'EDIT_KEY', op: 'lineStart', visibleHeight: editorVisibleHeight, visibleWidth: editorContentWidth });
        return;
      }

      if (key.end || (key.ctrl && input === 'e')) {
        dispatch({ type: 'EDIT_KEY', op: 'lineEnd', visibleHeight: editorVisibleHeight, visibleWidth: editorContentWidth });
        return;
      }

      if (key.return) {
        dispatch({ type: 'EDIT_KEY', op: 'insert', insert: '\n', visibleHeight: editorVisibleHeight, visibleWidth: editorContentWidth });
        return;
      }

      if (key.backspace) {
        dispatch({ type: 'EDIT_KEY', op: 'deleteBackward', visibleHeight: editorVisibleHeight, visibleWidth: editorContentWidth });
        return;
      }

      if (key.delete) {
        dispatch({ type: 'EDIT_KEY', op: 'deleteForward', visibleHeight: editorVisibleHeight, visibleWidth: editorContentWidth });
        return;
      }

      if (key.leftArrow) {
        dispatch({ type: 'EDIT_KEY', op: 'left', visibleHeight: editorVisibleHeight, visibleWidth: editorContentWidth });
        return;
      }

      if (key.rightArrow) {
        dispatch({ type: 'EDIT_KEY', op: 'right', visibleHeight: editorVisibleHeight, visibleWidth: editorContentWidth });
        return;
      }

      if (key.upArrow) {
        dispatch({ type: 'EDIT_KEY', op: 'up', visibleHeight: editorVisibleHeight, visibleWidth: editorContentWidth });
        return;
      }

      if (key.downArrow) {
        dispatch({ type: 'EDIT_KEY', op: 'down', visibleHeight: editorVisibleHeight, visibleWidth: editorContentWidth });
        return;
      }

      if (key.tab && key.shift) {
        const nextTarget = EDIT_TAB_ORDER[(EDIT_TAB_ORDER.indexOf(state.editTarget) + 1) % EDIT_TAB_ORDER.length];
        dispatch({ type: 'SWITCH_EDIT_TAB', target: nextTarget, visibleHeight: editorVisibleHeight, visibleWidth: editorContentWidth });
        return;
      }

      if (input && !key.ctrl && !key.meta) {
        dispatch({ type: 'EDIT_KEY', op: 'insert', insert: input, visibleHeight: editorVisibleHeight, visibleWidth: editorContentWidth });
      }

      return;
    }

    if (state.mode === 'confirmDiscard') {
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
              dispatch({ type: 'RELOAD_ERROR', error: toErrorInfo(error) });
            }
            break;
          case 'fileLoad':
            dispatch({ type: 'ENTER_FILE_LOAD' });
            break;
          case 'quit':
            exit();
            break;
        }
        return;
      }

      if (input === 'n' || key.escape) {
        dispatch({ type: 'CANCEL_DISCARD' });
      }

      return;
    }

    if (state.mode === 'confirmInPlaceSave') {
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

      return;
    }

    if (key.escape && state.maximizedPanel !== null) {
      dispatch({ type: 'TOGGLE_FULLSCREEN' });
      return;
    }

    if (key.escape && (state.searchMatches.length > 0 || state.lastSearchQuery)) {
      dispatch({ type: 'CANCEL_SEARCH' });
      return;
    }

    if (key.ctrl && input === 'c') {
      exit();
      return;
    }

    if (input === 'q') {
      if (hasUnsavedChanges(state.requests)) {
        dispatch({ type: 'REQUEST_DISCARD_CONFIRM', action: 'quit' });
      } else {
        exit();
      }
      return;
    }

    if (input === '?') {
      dispatch({ type: 'TOGGLE_HELP' });
      return;
    }

    if (key.tab && state.maximizedPanel === null) {
      dispatch({ type: 'SWITCH_PANEL' });
      return;
    }

    if (input === 'v') {
      dispatch({ type: 'TOGGLE_VERBOSE' });
      return;
    }

    if (input === 'w') {
      dispatch({ type: 'TOGGLE_WRAP' });
      return;
    }

    if (input === 'r') {
      dispatch({ type: 'TOGGLE_RAW' });
      return;
    }

    if (input === 'd' && state.maximizedPanel !== 'details') {
      dispatch({ type: 'TOGGLE_REQUEST_DETAILS' });
      return;
    }

    if (input === 'f') {
      dispatch({ type: 'TOGGLE_FULLSCREEN' });
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

    if (key.ctrl && input === 's') {
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

    if (input === 'S') {
      dispatch({ type: 'ENTER_SAVE' });
      return;
    }

    if (input === 'e') {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for out-of-bounds access
      if (!selectedRequest) {
        return;
      }
      dispatch({ type: 'ENTER_EDIT', buffers: { url: selectedRequest.url, body: selectedRequest.body ?? '', headers: headersToText(selectedRequest.headers) }, visibleHeight: editorVisibleHeight, visibleWidth: editorContentWidth });
      return;
    }

    if (input === '/') {
      dispatch({ type: 'ENTER_SEARCH' });
      return;
    }

    if (input === 'n' && state.searchMatches.length > 0) {
      const maxOffset = computeVerticalMaxOffset(state, columns, effectiveResponseHeight, effectiveDetailMaxContent);
      const bodyVisualStart = getBodyVisualStart(state, columns);
      const nextIndex = (state.currentMatchIndex + 1) % state.searchMatches.length;
      const targetRawIndex = state.searchMatches[nextIndex];
      const targetVisualIndex = bodyVisualStart ? bodyVisualStart[targetRawIndex] : targetRawIndex;
      dispatch({ type: 'NEXT_MATCH', targetVisualIndex, maxOffset });
      return;
    }

    if (input === 'N' && state.searchMatches.length > 0) {
      const maxOffset = computeVerticalMaxOffset(state, columns, effectiveResponseHeight, effectiveDetailMaxContent);
      const bodyVisualStart = getBodyVisualStart(state, columns);
      const prevIndex = (state.currentMatchIndex - 1 + state.searchMatches.length) % state.searchMatches.length;
      const targetRawIndex = state.searchMatches[prevIndex];
      const targetVisualIndex = bodyVisualStart ? bodyVisualStart[targetRawIndex] : targetRawIndex;
      dispatch({ type: 'PREV_MATCH', targetVisualIndex, maxOffset });
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
        dispatch({ type: 'RELOAD_ERROR', error: toErrorInfo(error) });
      }

      return;
    }

    if (key.return) {
      void sendSelectedRequest();
      return;
    }

    if (input === 'g') {
      dispatch({ type: 'JUMP_VERTICAL', direction: 'start', rows });
      return;
    }

    if (input === 'G') {
      const maxOffset = computeVerticalMaxOffset(state, columns, effectiveResponseHeight, effectiveDetailMaxContent);
      dispatch({ type: 'JUMP_VERTICAL', direction: 'end', maxOffset, rows });
      return;
    }

    if (input === '0') {
      dispatch({ type: 'JUMP_HORIZONTAL', direction: 'start', columns });
      return;
    }

    if (input === '$') {
      dispatch({ type: 'JUMP_HORIZONTAL', direction: 'end', columns });
      return;
    }

    const isUp = input === 'k' || key.upArrow;
    const isDown = input === 'j' || key.downArrow;
    const isLeft = input === 'h' || key.leftArrow;
    const isRight = input === 'l' || key.rightArrow;

    if (isLeft || isRight) {
      dispatch({ type: 'SCROLL_HORIZONTAL', direction: isLeft ? 'left' : 'right', columns });
      return;
    }

    if (!isUp && !isDown) {
      return;
    }

    if (state.focusedPanel === 'requests') {
      dispatch({ type: 'MOVE_SELECTION', direction: isUp ? 'up' : 'down', rows });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for out-of-bounds access
    if (state.focusedPanel === 'details' && selectedRequest) {
      const maxOffset = computeVerticalMaxOffset(state, columns, effectiveResponseHeight, effectiveDetailMaxContent);
      dispatch({ type: 'SCROLL', direction: isUp ? 'up' : 'down', maxOffset });
      return;
    }

    if (state.focusedPanel === 'response' && state.response) {
      const maxOffset = computeVerticalMaxOffset(state, columns, effectiveResponseHeight, effectiveDetailMaxContent);
      dispatch({ type: 'SCROLL', direction: isUp ? 'up' : 'down', maxOffset });
      return;
    }

    dispatch({ type: 'SCROLL', direction: isUp ? 'up' : 'down' });
  });

return (
    <Layout
      left={
        <RequestList
          requests={state.requests}
          selectedIndex={state.selectedIndex}
          focused={state.focusedPanel === 'requests' || state.maximizedPanel === 'requests'}
          scrollOffset={state.requestScrollOffset}
          horizontalOffset={state.requestHorizontalOffset}
          // Recomputed by SWITCH_ENV/RELOAD_FILE/LOAD_FILE via mergeVariables — free env reactivity.
          variables={state.variables}
          baseDir={dirname(state.filePath)}
          contentWidthOverride={state.maximizedPanel === 'requests' ? fullscreenRequestContentWidth : undefined}
          visibleHeightOverride={state.maximizedPanel === 'requests' ? fullscreenVisibleHeight : undefined}
        />
      }
      right={
        <ResponseView
          response={state.response}
          error={state.requestError}
          isLoading={state.isLoading}
          verbose={state.verbose}
          focused={state.focusedPanel === 'response' || state.maximizedPanel === 'response'}
          scrollOffset={state.responseScrollOffset}
          horizontalOffset={state.responseHorizontalOffset}
          wrapMode={state.wrapMode}
          rawMode={state.rawMode}
          availableHeight={state.maximizedPanel === 'response' ? effectiveResponseHeight : responseAvailableHeight}
          searchMatches={state.searchMatches}
          currentMatchIndex={state.currentMatchIndex}
          isSearchMode={state.mode === 'search'}
          lastSearchQuery={state.lastSearchQuery}
          searchQuery={state.searchQuery}
          contentWidthOverride={state.maximizedPanel === 'response' ? fullscreenContentWidth : undefined}
        />
      }
      bottom={
        <StatusBar
          filePath={state.filePath}
          requestCount={state.requests.length}
          selectedIndex={state.selectedIndex}
          insecure={state.insecure}
          transientMessage={state.transientMessage}
          transientError={state.transientError}
          focusedPanel={state.focusedPanel}
          detailsScrollOffset={state.detailsScrollOffset}
          detailsTotalLines={detailsTotalLines}
          responseScrollOffset={state.responseScrollOffset}
          responseTotalLines={state.response ? getResponseTotalLines({
            response: state.response,
            verbose: state.verbose,
            rawMode: state.rawMode,
            wrapMode: state.wrapMode,
            columns,
          }) : 0}
          hasResponse={!!state.response}
          envName={state.activeEnvName}
          isDirty={hasUnsavedChanges(state.requests)}
        />
      }
      overlay={
        state.showHelp ? <HelpOverlay visible={state.showHelp} /> :
        state.mode === 'fileLoad' ? <FileLoadOverlay value={state.fileLoadInput} error={state.fileLoadError} /> :
        state.mode === 'saveLoad' ? <SaveOverlay value={state.saveInput} error={state.saveError} /> :
        state.mode === 'envSelect' ? <EnvSelectOverlay options={state.availableEnvironments} selectedIndex={state.envSelectIndex} scrollOffset={state.envSelectScrollOffset} activeEnvName={state.activeEnvName} error={state.envSelectError} /> :
        state.mode === 'edit' ? <EditOverlay title="Edit Request" tabs={EDIT_TAB_ORDER} activeTab={state.editTarget} buffer={state.editBuffers[state.editTarget].text} cursor={state.editBuffers[state.editTarget].cursor} scrollOffset={state.editScrollOffset} horizontalOffset={state.editHorizontalOffset} visibleHeight={editorVisibleHeight} contentWidth={editorContentWidth} /> :
        state.mode === 'confirmDiscard' && state.pendingDiscardAction !== null ? <ConfirmDiscardOverlay pendingAction={state.pendingDiscardAction} /> :
        state.mode === 'confirmInPlaceSave' ? <ConfirmInPlaceSaveOverlay fileName={basename(state.filePath)} markedCount={state.requests.filter(r => r.isDirty).length} /> :
        undefined
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for out-of-bounds access
      detailPanel={state.showRequestDetails && selectedRequest ? (
        <RequestDetailsView
          request={selectedRequest}
          variables={state.variables}
          maxHeight={state.maximizedPanel === 'details' ? effectiveDetailMaxContent : detailPanelMaxContent}
          focused={state.focusedPanel === 'details' || state.maximizedPanel === 'details'}
          scrollOffset={state.detailsScrollOffset}
          horizontalOffset={state.detailsHorizontalOffset}
          contentWidthOverride={state.maximizedPanel === 'details' ? fullscreenContentWidth : undefined}
        />
      ) : undefined}
      maximizedPanel={state.maximizedPanel}
    />
  );
}