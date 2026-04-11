import React, { useReducer } from 'react';
import { useApp, useInput } from 'ink';

import { HelpOverlay } from './components/HelpOverlay';
import { Layout } from './components/Layout';
import { RequestList } from './components/RequestList';
import { ResponseView } from './components/ResponseView';
import { StatusBar } from './components/StatusBar';
import { executeRequest, isRequestError } from './core/executor';
import type { Action, AppState, ExecutorConfig, FileVariable, ParsedRequest, RequestError } from './core/types';
import { resolveVariables } from './core/variables';

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
      };
    }

    case 'MOVE_SELECTION': {
      const delta = action.direction === 'up' ? -1 : 1;
      const nextIndex = clamp(state.selectedIndex + delta, 0, state.requests.length - 1);

      return {
        ...state,
        selectedIndex: nextIndex,
        requestScrollOffset: getVisibleRequestOffset(nextIndex, state.requestScrollOffset),
      };
    }

    case 'SEND_REQUEST':
      return {
        ...state,
        isLoading: true,
        error: null,
        responseScrollOffset: 0,
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

    case 'SWITCH_PANEL':
      return {
        ...state,
        focusedPanel: state.focusedPanel === 'requests' ? 'response' : 'requests',
      };

    case 'TOGGLE_VERBOSE':
      return {
        ...state,
        verbose: !state.verbose,
      };

    case 'TOGGLE_RAW':
      return {
        ...state,
        rawMode: !state.rawMode,
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
    rawMode: false,
    showHelp: false,
    filePath: props.filePath,
    responseScrollOffset: 0,
    requestScrollOffset: 0,
    insecure: props.executorConfig.insecure,
  };
}

export function App(props: AppProps): React.ReactElement {
  const { exit } = useApp();
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

    if (input === 'r') {
      dispatch({ type: 'TOGGLE_RAW' });
      return;
    }

    if (key.return) {
      void sendSelectedRequest();
      return;
    }

    const isUp = input === 'k' || key.upArrow;
    const isDown = input === 'j' || key.downArrow;

    if (!isUp && !isDown) {
      return;
    }

    if (state.focusedPanel === 'requests') {
      dispatch({ type: 'MOVE_SELECTION', direction: isUp ? 'up' : 'down' });
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
        />
      }
      right={
        <ResponseView
          response={state.response}
          error={state.error}
          isLoading={state.isLoading}
          verbose={state.verbose}
          rawMode={state.rawMode}
          focused={state.focusedPanel === 'response'}
          scrollOffset={state.responseScrollOffset}
        />
      }
      bottom={
        <StatusBar
          filePath={state.filePath}
          requestCount={state.requests.length}
          selectedIndex={state.selectedIndex}
          insecure={state.insecure}
        />
      }
      overlay={state.showHelp ? <HelpOverlay visible={state.showHelp} /> : undefined}
    />
  );
}
