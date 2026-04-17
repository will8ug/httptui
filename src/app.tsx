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
import type { Action, AppState, ExecutorConfig, FileVariable, ParsedRequest, RequestError } from './core/types';
import { parseHttpFile } from './core/parser';
import { resolveVariables } from './core/variables';
import { DEFAULT_TERMINAL_COLUMNS, DEFAULT_TERMINAL_ROWS, getDetailPanelHeight, getRequestContentWidth, getResponseContentWidth } from './utils/layout';
import { getRequestTarget } from './utils/request';

function getMaxRequestLineWidth(requests: readonly ParsedRequest[]): number {
  if (requests.length === 0) {
    return 0;
  }

  return Math.max(...requests.map((r) => 2 + 7 + getRequestTarget(r.url).length));
}

function getMaxResponseLineWidth(state: AppState): number {
  if (!state.response) {
    return 0;
  }

  const lines: string[] = [];
  const res = state.response;

  lines.push(`HTTP/1.1 ${res.statusCode} ${res.statusText}  ${Math.round(res.timing.durationMs)}ms`);

  if (state.verbose) {
    for (const [name, value] of Object.entries(res.headers)) {
      lines.push(`${name}: ${value}`);
    }
  }

  lines.push(...res.body.split('\n'));

  return Math.max(0, ...lines.map((l) => l.length));
}

function getMaxDetailsLineWidth(state: AppState): number {
  const request = state.requests[state.selectedIndex];
  if (!request) {
    return 0;
  }

  const resolved = resolveVariables(request, state.variables);
  const lines: string[] = [];

  lines.push(`${resolved.method} ${resolved.url}`);

  for (const [name, value] of Object.entries(resolved.headers)) {
    lines.push(`${name}: ${value}`);
  }

  if (resolved.body !== undefined) {
    lines.push(...resolved.body.split('\n'));
  }

  return Math.max(0, ...lines.map((l) => l.length));
}

interface AppProps {
  filePath: string;
  requests: ParsedRequest[];
  variables: FileVariable[];
  executorConfig: ExecutorConfig;
}

const REQUEST_SCROLL_WINDOW = 12;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getVisibleRequestOffset(selectedIndex: number, currentOffset: number): number {
  if (selectedIndex < currentOffset) {
    return selectedIndex;
  }

  if (selectedIndex >= currentOffset + REQUEST_SCROLL_WINDOW) {
    return selectedIndex - REQUEST_SCROLL_WINDOW + 1;
  }

  return currentOffset;
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SELECT_REQUEST': {
      const nextIndex = clamp(action.index, 0, state.requests.length - 1);

      return {
        ...state,
        selectedIndex: nextIndex,
        requestScrollOffset: getVisibleRequestOffset(nextIndex, state.requestScrollOffset),
        requestHorizontalOffset: 0,
        detailsScrollOffset: 0,
        detailsHorizontalOffset: 0,
      };
    }

    case 'MOVE_SELECTION': {
      const delta = action.direction === 'up' ? -1 : 1;
      const nextIndex = clamp(state.selectedIndex + delta, 0, state.requests.length - 1);

      return {
        ...state,
        selectedIndex: nextIndex,
        requestScrollOffset: getVisibleRequestOffset(nextIndex, state.requestScrollOffset),
        requestHorizontalOffset: 0,
        detailsScrollOffset: 0,
        detailsHorizontalOffset: 0,
      };
    }

    case 'SEND_REQUEST':
      return {
        ...state,
        isLoading: true,
        error: null,
        responseScrollOffset: 0,
        responseHorizontalOffset: 0,
      };

    case 'RECEIVE_RESPONSE':
      return {
        ...state,
        response: action.response,
        error: null,
        isLoading: false,
        responseScrollOffset: 0,
      };

    case 'REQUEST_ERROR':
      return {
        ...state,
        response: null,
        error: action.error,
        isLoading: false,
        responseScrollOffset: 0,
      };

    case 'SWITCH_PANEL': {
      const nextPanel = (() => {
        switch (state.focusedPanel) {
          case 'requests':
            return state.showRequestDetails ? 'details' : 'response';
          case 'details':
            return 'response';
          case 'response':
            return 'requests';
        }
      })();
      return {
        ...state,
        focusedPanel: nextPanel,
      };
    }

    case 'TOGGLE_VERBOSE':
      return {
        ...state,
        verbose: !state.verbose,
      };

    case 'TOGGLE_HELP':
      return {
        ...state,
        showHelp: !state.showHelp,
      };

    case 'CLOSE_HELP':
      return {
        ...state,
        showHelp: false,
      };

    case 'SCROLL': {
      const delta = action.direction === 'up' ? -1 : 1;

      if (state.focusedPanel === 'details') {
        return {
          ...state,
          detailsScrollOffset: Math.max(0, state.detailsScrollOffset + delta),
        };
      }

      if (state.focusedPanel === 'response') {
        return {
          ...state,
          responseScrollOffset: Math.max(0, state.responseScrollOffset + delta),
        };
      }

      return {
        ...state,
        requestScrollOffset: Math.max(0, state.requestScrollOffset + delta),
      };
    }

    case 'SCROLL_HORIZONTAL': {
      if (state.focusedPanel === 'response' && state.wrapMode === 'wrap') {
        return state;
      }

      const columns = action.columns ?? 80;
      const horizontalDelta = action.direction === 'left' ? -2 : 2;

      if (state.focusedPanel === 'details') {
        const contentWidth = getResponseContentWidth(columns);
        const maxOffset = Math.max(0, getMaxDetailsLineWidth(state) - contentWidth);
        return {
          ...state,
          detailsHorizontalOffset: Math.min(Math.max(0, state.detailsHorizontalOffset + horizontalDelta), maxOffset),
        };
      }

      if (state.focusedPanel === 'response') {
        const contentWidth = getResponseContentWidth(columns);
        const maxOffset = Math.max(0, getMaxResponseLineWidth(state) - contentWidth);
        return {
          ...state,
          responseHorizontalOffset: Math.min(Math.max(0, state.responseHorizontalOffset + horizontalDelta), maxOffset),
        };
      }

      const contentWidth = getRequestContentWidth(columns);
      const maxOffset = Math.max(0, getMaxRequestLineWidth(state.requests) - contentWidth);
      return {
        ...state,
        requestHorizontalOffset: Math.min(Math.max(0, state.requestHorizontalOffset + horizontalDelta), maxOffset),
      };
    }

    case 'TOGGLE_WRAP':
      return {
        ...state,
        wrapMode: state.wrapMode === 'nowrap' ? 'wrap' : 'nowrap',
        responseScrollOffset: 0,
        responseHorizontalOffset: 0,
      };

    case 'TOGGLE_RAW':
      return {
        ...state,
        rawMode: !state.rawMode,
      };

    case 'TOGGLE_REQUEST_DETAILS': {
      const hiding = state.showRequestDetails;
      return {
        ...state,
        showRequestDetails: !state.showRequestDetails,
        ...(hiding && {
          detailsScrollOffset: 0,
          detailsHorizontalOffset: 0,
          ...(state.focusedPanel === 'details' && { focusedPanel: 'response' as const }),
        }),
      };
    }

    case 'RELOAD_FILE': {
      const currentRequestName = state.requests[state.selectedIndex]?.name;
      const newIndex = currentRequestName
        ? action.requests.findIndex((req) => req.name === currentRequestName)
        : -1;

      return {
        ...state,
        requests: action.requests,
        variables: action.variables,
        selectedIndex: newIndex >= 0 ? newIndex : 0,
        response: null,
        error: null,
        responseScrollOffset: 0,
        requestScrollOffset: 0,
        detailsScrollOffset: 0,
        detailsHorizontalOffset: 0,
        reloadMessage: 'Reloaded',
      };
    }

    case 'CLEAR_RELOAD_MESSAGE':
      return {
        ...state,
        reloadMessage: null,
      };

    case 'ENTER_FILE_LOAD':
      return {
        ...state,
        mode: 'fileLoad',
        fileLoadInput: '',
        fileLoadError: null,
      };

    case 'UPDATE_FILE_LOAD_INPUT':
      return {
        ...state,
        fileLoadInput: action.value,
      };

    case 'SET_FILE_LOAD_ERROR':
      return {
        ...state,
        fileLoadError: action.error,
      };

    case 'LOAD_FILE': {
      const currentRequestName = state.requests[state.selectedIndex]?.name;
      const newIndex = currentRequestName
        ? action.requests.findIndex((req) => req.name === currentRequestName)
        : -1;

      return {
        ...state,
        requests: action.requests,
        variables: action.variables,
        filePath: action.filePath,
        selectedIndex: newIndex >= 0 ? newIndex : 0,
        response: null,
        error: null,
        responseScrollOffset: 0,
        requestScrollOffset: 0,
        detailsScrollOffset: 0,
        detailsHorizontalOffset: 0,
        mode: 'normal',
        fileLoadInput: '',
        fileLoadError: null,
        reloadMessage: `Loaded: ${action.filePath.split('/').pop()}`,
      };
    }

    case 'CANCEL_FILE_LOAD':
      return {
        ...state,
        mode: 'normal',
        fileLoadInput: '',
        fileLoadError: null,
      };

    default:
      return state;
  }
}

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

function createInitialState(props: AppProps): AppState {
  return {
    requests: props.requests,
    variables: props.variables,
    selectedIndex: 0,
    focusedPanel: 'requests',
    response: null,
    isLoading: false,
    error: null,
    verbose: false,
    showHelp: false,
    filePath: props.filePath,
    responseScrollOffset: 0,
    requestScrollOffset: 0,
    requestHorizontalOffset: 0,
    responseHorizontalOffset: 0,
    detailsScrollOffset: 0,
    detailsHorizontalOffset: 0,
    insecure: props.executorConfig.insecure,
    reloadMessage: null,
    mode: 'normal',
    fileLoadInput: '',
    fileLoadError: null,
    wrapMode: 'nowrap',
    showRequestDetails: false,
    rawMode: false,
  };
}

export function App(props: AppProps): React.ReactElement {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [state, dispatch] = useReducer(reducer, props, createInitialState);

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

    const isUp = input === 'k' || key.upArrow;
    const isDown = input === 'j' || key.downArrow;
    const isLeft = input === 'h' || key.leftArrow;
    const isRight = input === 'l' || key.rightArrow;

    if (isLeft || isRight) {
      dispatch({ type: 'SCROLL_HORIZONTAL', direction: isLeft ? 'left' : 'right', columns: stdout.columns || DEFAULT_TERMINAL_COLUMNS });
      return;
    }

    if (!isUp && !isDown) {
      return;
    }

    if (state.focusedPanel === 'requests') {
      dispatch({ type: 'MOVE_SELECTION', direction: isUp ? 'up' : 'down' });
      return;
    }

    dispatch({ type: 'SCROLL', direction: isUp ? 'up' : 'down' });
  });

  const rows = stdout.rows || DEFAULT_TERMINAL_ROWS;
  const selectedRequest = state.requests[state.selectedIndex];
  const detailPanelMaxContent = 10;
  let detailPanelHeight = 0;
  if (state.showRequestDetails && selectedRequest) {
    const resolved = resolveVariables(selectedRequest, state.variables);
    const headerCount = Object.keys(resolved.headers).length;
    const bodyLineCount = resolved.body !== undefined ? resolved.body.split('\n').length : 0;
    detailPanelHeight = getDetailPanelHeight(headerCount, bodyLineCount, detailPanelMaxContent);
  }
  const responseAvailableHeight = rows - 1 - detailPanelHeight;

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
