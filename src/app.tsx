import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import React, { useReducer } from 'react';
import { useApp, useInput, useStdout } from 'ink';

import { FileLoadOverlay } from './components/FileLoadOverlay';
import { HelpOverlay } from './components/HelpOverlay';
import { Layout } from './components/Layout';
import { RequestList } from './components/RequestList';
import { RequestDetailsView } from './components/RequestDetailsView';
import { ResponseView } from './components/ResponseView';
import { StatusBar } from './components/StatusBar';
import { executeRequest, isRequestError } from './core/executor';
import { computeVerticalMaxOffset, createInitialState, reducer } from './core/reducer';
import type { Action, AppProps, RequestError } from './core/types';
import { parseHttpFile } from './core/parser';
import { resolveVariables } from './core/variables';
import { DEFAULT_TERMINAL_COLUMNS, DEFAULT_TERMINAL_ROWS, getDetailPanelHeight } from './utils/layout';
import { getDetailsTotalLines } from './utils/scroll';

function toRequestError(error: unknown): RequestError {
  if (error instanceof Error) {
    const errorWithCode = error as Error & { code?: string };

    return {
      message: error.message,
      code: errorWithCode.code,
    };
  }

  return { message: String(error) };
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
  if (state.showRequestDetails && selectedRequest) {
    const resolved = resolveVariables(selectedRequest, state.variables);
    const totalContentLines = getDetailsTotalLines({
      method: resolved.method,
      url: resolved.url,
      headers: resolved.headers,
      body: resolved.body,
    });
    detailPanelHeight = getDetailPanelHeight(totalContentLines, detailPanelMaxContent);
  }
  const responseAvailableHeight = rows - 1 - detailPanelHeight;

  const sendSelectedRequest = async (): Promise<void> => {
    if (state.isLoading) {
      return;
    }

    const request = state.requests[state.selectedIndex];

    if (!request) {
      return;
    }

    dispatch({ type: 'SEND_REQUEST' });

    try {
      const resolvedRequest = resolveVariables(request, state.variables);
      const result = await executeRequest(resolvedRequest, props.executorConfig);

      if (isRequestError(result)) {
        dispatch({ type: 'REQUEST_ERROR', error: result });
        return;
      }

      dispatch({ type: 'RECEIVE_RESPONSE', response: result });
    } catch (error) {
      dispatch({ type: 'REQUEST_ERROR', error: toRequestError(error) });
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
          const parseResult = parseHttpFile(content);

          if (parseResult.requests.length === 0) {
            dispatch({ type: 'SET_FILE_LOAD_ERROR', error: `No requests found in ${inputPath}` });
            return;
          }

          dispatch({
            type: 'LOAD_FILE',
            requests: parseResult.requests,
            variables: parseResult.variables,
            filePath: resolvedPath,
          });
          setTimeout(() => dispatch({ type: 'CLEAR_RELOAD_MESSAGE' }), 2000);
        } catch (error) {
          dispatch({ type: 'SET_FILE_LOAD_ERROR', error: toRequestError(error).message });
        }

        return;
      }

      if (key.backspace || key.delete) {
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
        const headerOffset = 1 + (state.verbose && state.response ? Object.keys(state.response.headers).length : 0) + 1;
        const maxOffset = computeVerticalMaxOffset(state, columns, responseAvailableHeight, detailPanelMaxContent);
        dispatch({ type: 'CONFIRM_SEARCH', headerOffset, maxOffset });
        return;
      }

      if (key.backspace || key.delete) {
        dispatch({ type: 'UPDATE_SEARCH_INPUT', value: state.searchQuery.slice(0, -1) });
        return;
      }

      if (input && !key.ctrl && !key.meta) {
        dispatch({ type: 'UPDATE_SEARCH_INPUT', value: state.searchQuery + input });
      }

      return;
    }

    if (key.escape && (state.searchMatches.length > 0 || state.lastSearchQuery)) {
      dispatch({ type: 'CANCEL_SEARCH' });
      return;
    }

    if ((key.ctrl && input === 'c') || input === 'q') {
      exit();
      return;
    }

    if (input === '?') {
      dispatch({ type: 'TOGGLE_HELP' });
      return;
    }

    if (key.tab) {
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

    if (input === 'd') {
      dispatch({ type: 'TOGGLE_REQUEST_DETAILS' });
      return;
    }

    if (input === 'o') {
      dispatch({ type: 'ENTER_FILE_LOAD' });
      return;
    }

    if (input === '/') {
      dispatch({ type: 'ENTER_SEARCH' });
      return;
    }

    if (input === 'n' && state.searchMatches.length > 0) {
      const headerOffset = 1 + (state.verbose && state.response ? Object.keys(state.response.headers).length : 0) + 1;
      const maxOffset = computeVerticalMaxOffset(state, columns, responseAvailableHeight, detailPanelMaxContent);
      dispatch({ type: 'NEXT_MATCH', headerOffset, maxOffset });
      return;
    }

    if (input === 'N' && state.searchMatches.length > 0) {
      const headerOffset = 1 + (state.verbose && state.response ? Object.keys(state.response.headers).length : 0) + 1;
      const maxOffset = computeVerticalMaxOffset(state, columns, responseAvailableHeight, detailPanelMaxContent);
      dispatch({ type: 'PREV_MATCH', headerOffset, maxOffset });
      return;
    }

    if (input === 'R') {
      try {
        const content = readFileSync(state.filePath, 'utf8');
        const parseResult = parseHttpFile(content);
        dispatch({ type: 'RELOAD_FILE', requests: parseResult.requests, variables: parseResult.variables });
        setTimeout(() => dispatch({ type: 'CLEAR_RELOAD_MESSAGE' }), 2000);
      } catch (error) {
        dispatch({ type: 'REQUEST_ERROR', error: toRequestError(error) });
      }

      return;
    }

    if (key.return) {
      void sendSelectedRequest();
      return;
    }

    if (input === 'g') {
      dispatch({ type: 'JUMP_VERTICAL', direction: 'start' });
      return;
    }

    if (input === 'G') {
      const maxOffset = computeVerticalMaxOffset(state, columns, responseAvailableHeight, detailPanelMaxContent);
      dispatch({ type: 'JUMP_VERTICAL', direction: 'end', maxOffset });
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
      dispatch({ type: 'MOVE_SELECTION', direction: isUp ? 'up' : 'down' });
      return;
    }

    if (state.focusedPanel === 'details' && selectedRequest) {
      const maxOffset = computeVerticalMaxOffset(state, columns, responseAvailableHeight, detailPanelMaxContent);
      dispatch({ type: 'SCROLL', direction: isUp ? 'up' : 'down', maxOffset });
      return;
    }

    if (state.focusedPanel === 'response' && state.response) {
      const maxOffset = computeVerticalMaxOffset(state, columns, responseAvailableHeight, detailPanelMaxContent);
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
          focused={state.focusedPanel === 'requests'}
          scrollOffset={state.requestScrollOffset}
          horizontalOffset={state.requestHorizontalOffset}
        />
      }
      right={
        <ResponseView
          response={state.response}
          error={state.error}
          isLoading={state.isLoading}
          verbose={state.verbose}
          focused={state.focusedPanel === 'response'}
          scrollOffset={state.responseScrollOffset}
          horizontalOffset={state.responseHorizontalOffset}
          wrapMode={state.wrapMode}
          rawMode={state.rawMode}
          availableHeight={responseAvailableHeight}
          searchMatches={state.searchMatches}
          currentMatchIndex={state.currentMatchIndex}
          isSearchMode={state.mode === 'search'}
          lastSearchQuery={state.lastSearchQuery}
          searchQuery={state.searchQuery}
        />
      }
      bottom={
        <StatusBar
          filePath={state.filePath}
          requestCount={state.requests.length}
          selectedIndex={state.selectedIndex}
          insecure={state.insecure}
          reloadMessage={state.reloadMessage}
        />
      }
      overlay={state.showHelp ? <HelpOverlay visible={state.showHelp} /> : state.mode === 'fileLoad' ? <FileLoadOverlay value={state.fileLoadInput} error={state.fileLoadError} /> : undefined}
      detailPanel={state.showRequestDetails && selectedRequest ? (
        <RequestDetailsView
          request={selectedRequest}
          variables={state.variables}
          maxHeight={detailPanelMaxContent}
          focused={state.focusedPanel === 'details'}
          scrollOffset={state.detailsScrollOffset}
          horizontalOffset={state.detailsHorizontalOffset}
        />
      ) : undefined}
    />
  );
}