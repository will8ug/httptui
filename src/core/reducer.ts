import { basename, dirname, extname } from 'node:path';

import type { Action, AppState, AppProps } from './types';
import { applyEditOp, offsetToLineCol } from './editor';
import { formatResponseBody } from './formatter';
import { headersEqual, parseHeadersText } from './headers';
import { mergeVariables, resolveVariables } from './variables';
import { expandTabs } from '../utils/text';
import { DEFAULT_TERMINAL_ROWS, getEnvPickerVisibleHeight, getRequestContentWidth, getRequestVisibleHeight, getResponseContentWidth } from '../utils/layout';
import { getDetailsTotalLines, getMaxDetailsLineWidth, getMaxRequestLineWidth, getMaxResponseLineWidth, getMaxScrollOffset, getResponseTotalLines, RESPONSE_PANEL_VERTICAL_CHROME } from '../utils/scroll';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampScrollOffsetToCursor(selectedIndex: number, currentOffset: number, visibleCount: number): number {
  if (selectedIndex < currentOffset) {
    return selectedIndex;
  }

  if (selectedIndex >= currentOffset + visibleCount) {
    return selectedIndex - visibleCount + 1;
  }

  return currentOffset;
}

export const CLEAR_SEARCH_STATE = {
  searchQuery: '',
  searchMatches: [] as number[],
  currentMatchIndex: 0,
  lastSearchQuery: '',
};

const EMPTY_EDIT_BUFFERS = {
  body: { text: '', cursor: 0 },
  headers: { text: '', cursor: 0 },
  url: { text: '', cursor: 0 },
};

function setTransient(
  transient: { message?: string | null; error?: string | null; warning?: string | null },
): Pick<AppState, 'transientMessage' | 'transientError' | 'transientWarning'> {
  return {
    transientMessage: transient.message ?? null,
    transientError: transient.error ?? null,
    transientWarning: transient.warning ?? null,
  };
}

function navigateRequests(state: AppState, nextIndex: number, rows?: number): AppState {
  const index = clamp(nextIndex, 0, state.requests.length - 1);
  const visibleCount = getRequestVisibleHeight(rows ?? DEFAULT_TERMINAL_ROWS);
  return {
    ...state,
    selectedIndex: index,
    requestScrollOffset: clampScrollOffsetToCursor(index, state.requestScrollOffset, visibleCount),
    requestHorizontalOffset: 0,
    detailsScrollOffset: 0,
    detailsHorizontalOffset: 0,
  };
}

export function computeVerticalMaxOffset(
  state: AppState,
  columns: number,
  responseAvailableHeight: number,
  detailPanelMaxContent: number,
): number | undefined {
  if (state.focusedPanel === 'details') {
    const request = state.requests[state.selectedIndex];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for out-of-bounds access
    if (!request) {
      return undefined;
    }
    const resolved = resolveVariables(request, state.variables);
    const totalContentLines = getDetailsTotalLines({
      method: resolved.method,
      url: resolved.url,
      headers: resolved.headers,
      body: resolved.body,
    });
    return getMaxScrollOffset(totalContentLines, detailPanelMaxContent);
  }

  if (state.focusedPanel === 'response' && state.response) {
    const totalLines = getResponseTotalLines({
      response: state.response,
      verbose: state.verbose,
      rawMode: state.rawMode,
      wrapMode: state.wrapMode,
      columns,
    });
    const visibleHeight = Math.max(1, responseAvailableHeight - RESPONSE_PANEL_VERTICAL_CHROME);
    return getMaxScrollOffset(totalLines, visibleHeight);
  }

  return undefined;
}

export function computeSearchScrollOffset(visualIndex: number, maxOffset?: number): number {
  if (maxOffset !== undefined) {
    return Math.min(Math.max(0, visualIndex), maxOffset);
  }
  return Math.max(0, visualIndex);
}

type FileLoadAction = Extract<Action, { type: 'ENTER_FILE_LOAD' | 'UPDATE_FILE_LOAD_INPUT' | 'MOVE_FILE_LOAD_CURSOR' | 'SET_FILE_LOAD_ERROR' | 'SET_FILE_LOAD_COMPLETIONS' | 'LOAD_FILE' | 'CANCEL_FILE_LOAD' }>;

function reduceFileLoad(state: AppState, action: FileLoadAction): AppState {
  switch (action.type) {
    case 'ENTER_FILE_LOAD':
      return {
        ...state,
        mode: 'fileLoad',
        fileLoadInput: '',
        fileLoadCursor: 0,
        fileLoadError: null,
        fileLoadCompletions: null,
      };

    case 'UPDATE_FILE_LOAD_INPUT':
      return {
        ...state,
        fileLoadInput: action.value,
        fileLoadCursor: action.cursor,
        fileLoadCompletions: null,
      };

    case 'MOVE_FILE_LOAD_CURSOR':
      return {
        ...state,
        fileLoadCursor: action.cursor,
        fileLoadCompletions: null,
      };

    case 'SET_FILE_LOAD_ERROR':
      return {
        ...state,
        fileLoadError: action.error,
      };

    case 'SET_FILE_LOAD_COMPLETIONS':
      return {
        ...state,
        fileLoadCompletions: action.completions,
      };

    case 'LOAD_FILE': {
      const currentRequestName = state.requests[state.selectedIndex]?.name;
      const newIndex = currentRequestName
        ? action.requests.findIndex((req) => req.name === currentRequestName)
        : -1;

      return {
        ...state,
        requests: action.requests,
        fileVariables: action.variables,
        variables: mergeVariables(action.variables, state.environmentVariables),
        filePath: action.filePath,
        selectedIndex: newIndex >= 0 ? newIndex : 0,
        response: null,
        requestError: null,
        responseScrollOffset: 0,
        requestScrollOffset: 0,
        detailsScrollOffset: 0,
        detailsHorizontalOffset: 0,
        mode: 'normal',
        fileLoadInput: '',
        fileLoadCursor: 0,
        fileLoadError: null,
        fileLoadCompletions: null,
        ...setTransient({ message: `Loaded: ${action.filePath.split('/').pop() ?? ''}` }),
        ...(action.executorConfig && {
          certificates: action.executorConfig.certificates,
          editor: action.executorConfig.editor,
        }),
      };
    }

    case 'CANCEL_FILE_LOAD':
      return {
        ...state,
        mode: 'normal',
        fileLoadInput: '',
        fileLoadCursor: 0,
        fileLoadError: null,
        fileLoadCompletions: null,
      };
  }
}

type SaveLoadAction = Extract<Action, { type: 'ENTER_SAVE' | 'UPDATE_SAVE_INPUT' | 'MOVE_SAVE_CURSOR' | 'SET_SAVE_ERROR' | 'SAVE_FILE' | 'CANCEL_SAVE' }>;

function reduceSaveLoad(state: AppState, action: SaveLoadAction): AppState {
  switch (action.type) {
    case 'ENTER_SAVE': {
      const defaultPath = `${basename(state.filePath, extname(state.filePath))}.http`;
      return {
        ...state,
        mode: 'saveLoad',
        saveInput: defaultPath,
        saveCursor: defaultPath.length,
        saveError: null,
      };
    }

    case 'UPDATE_SAVE_INPUT':
      return {
        ...state,
        saveInput: action.value,
        saveCursor: action.cursor,
        saveError: null,
      };

    case 'MOVE_SAVE_CURSOR':
      return {
        ...state,
        saveCursor: action.cursor,
      };

    case 'SET_SAVE_ERROR':
      return {
        ...state,
        saveError: action.error,
      };

    case 'SAVE_FILE':
      return {
        ...state,
        mode: 'normal',
        requests: state.requests.map(r => ({ ...r, isDirty: false })),
        filePath: action.filePath,
        saveInput: '',
        saveCursor: 0,
        saveError: null,
        ...setTransient({ message: action.message }),
      };

    case 'CANCEL_SAVE':
      return {
        ...state,
        mode: 'normal',
        saveInput: '',
        saveCursor: 0,
        saveError: null,
      };
  }
}

type EnvSelectAction = Extract<Action, { type: 'ENTER_ENV_SELECT' | 'MOVE_ENV_SELECTION' | 'JUMP_ENV_SELECTION' | 'SWITCH_ENV' | 'CANCEL_ENV_SELECT' | 'SET_ENV_SELECT_ERROR' }>;

function reduceEnvSelect(state: AppState, action: EnvSelectAction): AppState {
  switch (action.type) {
    case 'ENTER_ENV_SELECT': {
      const findOption = (name: string) =>
        state.availableEnvironments.findIndex((option) => option.name === name);
      // When no environment is active, default to the (none) option so the
      // user lands on the revert-to-file-vars choice rather than the first
      // listed environment. The final `>= 0` fallback handles malformed
      // configurations where (none) itself is missing.
      const activeIndex = state.activeEnvName
        ? findOption(state.activeEnvName)
        : findOption('(none)');
      const initialIndex = activeIndex >= 0 ? activeIndex : 0;
      const visibleCount = getEnvPickerVisibleHeight(DEFAULT_TERMINAL_ROWS);
      return {
        ...state,
        mode: 'envSelect',
        envSelectIndex: initialIndex,
        envSelectScrollOffset: clampScrollOffsetToCursor(initialIndex, state.envSelectScrollOffset, visibleCount),
        envSelectError: null,
      };
    }

    case 'MOVE_ENV_SELECTION': {
      const optionCount = state.availableEnvironments.length;
      if (optionCount === 0) {
        return state;
      }
      const delta = action.direction === 'up' ? -1 : 1;
      const nextIndex = clamp(state.envSelectIndex + delta, 0, optionCount - 1);
      const visibleCount = getEnvPickerVisibleHeight(DEFAULT_TERMINAL_ROWS);
      return {
        ...state,
        envSelectIndex: nextIndex,
        envSelectScrollOffset: clampScrollOffsetToCursor(nextIndex, state.envSelectScrollOffset, visibleCount),
      };
    }

    case 'JUMP_ENV_SELECTION': {
      const optionCount = state.availableEnvironments.length;
      if (optionCount === 0) {
        return state;
      }
      const nextIndex = action.target === 'top' ? 0 : optionCount - 1;
      const visibleCount = getEnvPickerVisibleHeight(DEFAULT_TERMINAL_ROWS);
      return {
        ...state,
        envSelectIndex: nextIndex,
        envSelectScrollOffset: clampScrollOffsetToCursor(nextIndex, state.envSelectScrollOffset, visibleCount),
      };
    }

    case 'SWITCH_ENV':
      return {
        ...state,
        environmentVariables: action.environmentVariables,
        variables: mergeVariables(state.fileVariables, action.environmentVariables),
        activeEnvName: action.envName,
        response: null,
        requestError: null,
        responseScrollOffset: 0,
        requestScrollOffset: 0,
        requestHorizontalOffset: 0,
        responseHorizontalOffset: 0,
        detailsScrollOffset: 0,
        detailsHorizontalOffset: 0,
        mode: 'normal',
        envSelectError: null,
      };

    case 'CANCEL_ENV_SELECT':
      return {
        ...state,
        mode: 'normal',
        envSelectError: null,
      };

    case 'SET_ENV_SELECT_ERROR':
      return {
        ...state,
        envSelectError: action.error,
      };
  }
}

type SearchAction = Extract<Action, { type: 'ENTER_SEARCH' | 'UPDATE_SEARCH_INPUT' | 'CONFIRM_SEARCH' | 'CANCEL_SEARCH' | 'NEXT_MATCH' | 'PREV_MATCH' }>;

function reduceSearch(state: AppState, action: SearchAction): AppState {
  switch (action.type) {
    case 'ENTER_SEARCH': {
      if (!state.response) {
        return state;
      }
      return {
        ...state,
        mode: 'search',
        focusedPanel: 'response',
        searchQuery: '',
        searchMatches: [],
        currentMatchIndex: 0,
      };
    }

    case 'UPDATE_SEARCH_INPUT':
      return {
        ...state,
        searchQuery: action.value,
      };

    case 'CONFIRM_SEARCH': {
      if (!state.searchQuery || !state.response) {
        return {
          ...state,
          mode: 'normal',
          ...CLEAR_SEARCH_STATE,
        };
      }

      const formattedBody = formatResponseBody(state.response.body, state.rawMode);
      const bodyLines = formattedBody.split('\n');
      const queryLower = state.searchQuery.toLowerCase();
      const matches: number[] = [];

      for (let i = 0; i < bodyLines.length; i++) {
        if (bodyLines[i].toLowerCase().includes(queryLower)) {
          matches.push(i);
        }
      }

      const scrollOffset = action.firstMatchVisualIndex !== undefined
        ? computeSearchScrollOffset(action.firstMatchVisualIndex, action.maxOffset)
        : state.responseScrollOffset;

      return {
        ...state,
        mode: 'normal',
        searchMatches: matches,
        currentMatchIndex: 0,
        lastSearchQuery: state.searchQuery,
        responseScrollOffset: scrollOffset,
      };
    }

    case 'CANCEL_SEARCH':
      return {
        ...state,
        mode: 'normal',
        ...CLEAR_SEARCH_STATE,
      };

    case 'NEXT_MATCH': {
      if (state.searchMatches.length === 0) {
        return state;
      }
      const nextIndex = (state.currentMatchIndex + 1) % state.searchMatches.length;
      const scrollOffset = computeSearchScrollOffset(action.targetVisualIndex, action.maxOffset);
      return {
        ...state,
        currentMatchIndex: nextIndex,
        responseScrollOffset: scrollOffset,
      };
    }

    case 'PREV_MATCH': {
      if (state.searchMatches.length === 0) {
        return state;
      }
      const prevIndex = (state.currentMatchIndex - 1 + state.searchMatches.length) % state.searchMatches.length;
      const scrollOffset = computeSearchScrollOffset(action.targetVisualIndex, action.maxOffset);
      return {
        ...state,
        currentMatchIndex: prevIndex,
        responseScrollOffset: scrollOffset,
      };
    }
  }
}

type EditAction = Extract<Action, { type: 'ENTER_EDIT' | 'EDIT_KEY' | 'SWITCH_EDIT_TAB' | 'COMMIT_EDIT' | 'CANCEL_EDIT' | 'ARM_EDIT_CANCEL' }>;

function reduceEdit(state: AppState, action: EditAction): AppState {
  switch (action.type) {
    case 'ENTER_EDIT': {
      const urlText = action.buffers.url;
      const bodyText = action.buffers.body;
      const headersText = action.buffers.headers;
      const { line, col } = offsetToLineCol(urlText, urlText.length);
      const cursorLineText = urlText.split('\n')[line] ?? '';
      const visualCol = expandTabs(cursorLineText.slice(0, col)).length;
      return {
        ...state,
        mode: 'edit',
        editTarget: 'url',
        editBuffers: {
          url: { text: urlText, cursor: urlText.length },
          body: { text: bodyText, cursor: bodyText.length },
          headers: { text: headersText, cursor: headersText.length },
        },
        editScrollOffset: clampScrollOffsetToCursor(line, 0, action.visibleHeight),
        editHorizontalOffset: clampScrollOffsetToCursor(visualCol, 0, action.visibleWidth),
      };
    }

    case 'EDIT_KEY': {
      const active = state.editBuffers[state.editTarget];
      const insert = state.editTarget === 'url' && action.insert !== undefined
        ? action.insert.replace(/[\n\r]/g, '')
        : action.insert;
      const updated = applyEditOp(
        { text: active.text, cursor: active.cursor },
        action.op,
        insert,
      );
      const { line, col } = offsetToLineCol(updated.text, updated.cursor);
      const cursorLineText = updated.text.split('\n')[line] ?? '';
      const visualCol = expandTabs(cursorLineText.slice(0, col)).length;
      return {
        ...state,
        editBuffers: {
          ...state.editBuffers,
          [state.editTarget]: updated,
        },
        editScrollOffset: clampScrollOffsetToCursor(line, state.editScrollOffset, action.visibleHeight),
        editHorizontalOffset: clampScrollOffsetToCursor(visualCol, state.editHorizontalOffset, action.visibleWidth),
      };
    }

    case 'SWITCH_EDIT_TAB': {
      if (action.target === state.editTarget) {
        return state;
      }
      const request = state.requests[state.selectedIndex];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for out-of-bounds access
      if (action.target === 'body' && request?.formdataFields) {
        return {
          ...state,
          ...setTransient({ message: 'form-data request body is not supported to edit for now' }),
        };
      }
      const buffer = state.editBuffers[action.target];
      const { line, col } = offsetToLineCol(buffer.text, buffer.cursor);
      const cursorLineText = buffer.text.split('\n')[line] ?? '';
      const visualCol = expandTabs(cursorLineText.slice(0, col)).length;
      return {
        ...state,
        editTarget: action.target,
        editScrollOffset: clampScrollOffsetToCursor(line, 0, action.visibleHeight),
        editHorizontalOffset: clampScrollOffsetToCursor(visualCol, 0, action.visibleWidth),
      };
    }

    case 'COMMIT_EDIT': {
      const request = state.requests[state.selectedIndex];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for out-of-bounds access
      if (!request) {
        return state;
      }
      const parsedHeaders = parseHeadersText(state.editBuffers.headers.text);
      if (!parsedHeaders.ok) {
        return {
          ...state,
          ...setTransient({ error: `Cannot save: header line ${parsedHeaders.line} is ${parsedHeaders.error}` }),
        };
      }
      const nextBody = state.editBuffers.body.text === '' ? undefined : state.editBuffers.body.text;
      const nextUrl = state.editBuffers.url.text;
      const nextHeaders = parsedHeaders.headers;
      const changed = nextUrl !== request.url || nextBody !== request.body || !headersEqual(nextHeaders, request.headers);
      const updatedRequests = state.requests.map((req, i) =>
        i === state.selectedIndex ? { ...req, headers: nextHeaders, body: nextBody, url: nextUrl, isDirty: req.isDirty || changed } : req,
      );
      return {
        ...state,
        requests: updatedRequests,
        mode: 'normal',
        editTarget: 'url',
        editBuffers: EMPTY_EDIT_BUFFERS,
        editScrollOffset: 0,
        editHorizontalOffset: 0,
        editEscapeArmedAt: null,
        ...setTransient({ message: changed ? 'Request updated' : null }),
      };
    }

    case 'CANCEL_EDIT':
      return {
        ...state,
        mode: 'normal',
        editTarget: 'url',
        editBuffers: EMPTY_EDIT_BUFFERS,
        editScrollOffset: 0,
        editHorizontalOffset: 0,
        editEscapeArmedAt: null,
        ...setTransient({}),
      };

    case 'ARM_EDIT_CANCEL':
      return {
        ...state,
        editEscapeArmedAt: action.now,
        ...setTransient({ message: 'Press Esc again to discard changes' }),
      };
  }
}

type ConfirmDiscardAction = Extract<Action, { type: 'REQUEST_DISCARD_CONFIRM' | 'CONFIRM_DISCARD' | 'CANCEL_DISCARD' }>;

function reduceConfirmDiscard(state: AppState, action: ConfirmDiscardAction): AppState {
  switch (action.type) {
    case 'REQUEST_DISCARD_CONFIRM':
      return {
        ...state,
        mode: 'confirmDiscard',
        pendingDiscardAction: action.action,
      };

    case 'CONFIRM_DISCARD':
      return {
        ...state,
        mode: 'normal',
        pendingDiscardAction: null,
      };

    case 'CANCEL_DISCARD':
      return {
        ...state,
        mode: 'normal',
        pendingDiscardAction: null,
      };
  }
}

type ConfirmInPlaceSaveAction = Extract<Action, { type: 'ENTER_IN_PLACE_SAVE_CONFIRM' | 'CONFIRM_IN_PLACE_SAVE' | 'CANCEL_IN_PLACE_SAVE' }>;

function reduceConfirmInPlaceSave(state: AppState, action: ConfirmInPlaceSaveAction): AppState {
  switch (action.type) {
    case 'ENTER_IN_PLACE_SAVE_CONFIRM':
      return {
        ...state,
        mode: 'confirmInPlaceSave',
      };

    case 'CONFIRM_IN_PLACE_SAVE':
      return {
        ...state,
        mode: 'normal',
      };

    case 'CANCEL_IN_PLACE_SAVE':
      return {
        ...state,
        mode: 'normal',
      };
  }
}

type NavigationAction = Extract<Action, { type: 'SELECT_REQUEST' | 'MOVE_SELECTION' | 'APPEND_REQUEST' | 'SWITCH_PANEL' | 'SCROLL' | 'SCROLL_HORIZONTAL' | 'JUMP_VERTICAL' | 'JUMP_HORIZONTAL' }>;

function reduceNavigation(state: AppState, action: NavigationAction): AppState {
  switch (action.type) {
    case 'SELECT_REQUEST':
      return {
        ...navigateRequests(state, action.index, action.rows),
        ...CLEAR_SEARCH_STATE,
      };

    case 'MOVE_SELECTION': {
      const delta = action.direction === 'up' ? -1 : 1;
      return {
        ...navigateRequests(state, state.selectedIndex + delta, action.rows),
        ...CLEAR_SEARCH_STATE,
      };
    }

    case 'APPEND_REQUEST': {
      // Pasted requests carry lineNumber 0 as a "no file origin" placeholder; rewrite it
      // to max(existing) + 1 solely so RequestList's `${lineNumber}-${method}-${url}`
      // React keys stay unique across repeated pastes — never a file position.
      const maxLineNumber = state.requests.reduce((max, req) => Math.max(max, req.lineNumber), 0);
      const appended = { ...action.request, lineNumber: maxLineNumber + 1 };
      const nextState = { ...state, requests: [...state.requests, appended] };
      return {
        ...navigateRequests(nextState, nextState.requests.length - 1),
        ...CLEAR_SEARCH_STATE,
      };
    }

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

    case 'SCROLL': {
      const delta = action.direction === 'up' ? -1 : 1;
      const maxOffset = action.maxOffset;

      if (state.focusedPanel === 'details') {
        const next = state.detailsScrollOffset + delta;
        return {
          ...state,
          detailsScrollOffset: maxOffset !== undefined
            ? Math.min(Math.max(0, next), maxOffset)
            : Math.max(0, next),
        };
      }

      if (state.focusedPanel === 'response') {
        const next = state.responseScrollOffset + delta;
        return {
          ...state,
          responseScrollOffset: maxOffset !== undefined
            ? Math.min(Math.max(0, next), maxOffset)
            : Math.max(0, next),
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
        const maxOffset = Math.max(0, getMaxDetailsLineWidth({ request: state.requests[state.selectedIndex], variables: state.variables }) - contentWidth);
        return {
          ...state,
          detailsHorizontalOffset: Math.min(Math.max(0, state.detailsHorizontalOffset + horizontalDelta), maxOffset),
        };
      }

      if (state.focusedPanel === 'response') {
        const contentWidth = getResponseContentWidth(columns);
        const maxOffset = Math.max(0, getMaxResponseLineWidth({ response: state.response, verbose: state.verbose, rawMode: state.rawMode }) - contentWidth);
        return {
          ...state,
          responseHorizontalOffset: Math.min(Math.max(0, state.responseHorizontalOffset + horizontalDelta), maxOffset),
        };
      }

      const contentWidth = getRequestContentWidth(columns);
      const maxOffset = Math.max(0, getMaxRequestLineWidth({ requests: state.requests, variables: state.variables, baseDir: dirname(state.filePath) }) - contentWidth);
      return {
        ...state,
        requestHorizontalOffset: Math.min(Math.max(0, state.requestHorizontalOffset + horizontalDelta), maxOffset),
      };
    }

    case 'JUMP_VERTICAL': {
      if (state.focusedPanel === 'requests') {
        const lastIndex = Math.max(0, state.requests.length - 1);
        const nextIndex = action.direction === 'start' ? 0 : lastIndex;
        const visibleCount = getRequestVisibleHeight(action.rows ?? DEFAULT_TERMINAL_ROWS);
        return {
          ...state,
          selectedIndex: nextIndex,
          requestScrollOffset: clampScrollOffsetToCursor(nextIndex, state.requestScrollOffset, visibleCount),
          requestHorizontalOffset: 0,
          detailsScrollOffset: 0,
          detailsHorizontalOffset: 0,
        };
      }

      if (state.focusedPanel === 'details') {
        if (action.direction === 'start') {
          return { ...state, detailsScrollOffset: 0 };
        }
        if (action.maxOffset === undefined) {
          return state;
        }
        return { ...state, detailsScrollOffset: Math.max(0, action.maxOffset) };
      }

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- discriminated union narrowing is correct but TS infers always-true
      if (state.focusedPanel === 'response') {
        if (action.direction === 'start') {
          return { ...state, responseScrollOffset: 0 };
        }
        if (action.maxOffset === undefined) {
          return state;
        }
        return { ...state, responseScrollOffset: Math.max(0, action.maxOffset) };
      }

      return state;
    }

    case 'JUMP_HORIZONTAL': {
      if (state.focusedPanel === 'response' && state.wrapMode === 'wrap') {
        return state;
      }

      const columns = action.columns ?? 80;

      if (state.focusedPanel === 'requests') {
        if (action.direction === 'start') {
          return { ...state, requestHorizontalOffset: 0 };
        }
        const contentWidth = getRequestContentWidth(columns);
        const maxOffset = Math.max(0, getMaxRequestLineWidth({ requests: state.requests, variables: state.variables, baseDir: dirname(state.filePath) }) - contentWidth);
        return { ...state, requestHorizontalOffset: maxOffset };
      }

      if (state.focusedPanel === 'details') {
        if (action.direction === 'start') {
          return { ...state, detailsHorizontalOffset: 0 };
        }
        const contentWidth = getResponseContentWidth(columns);
        const maxOffset = Math.max(0, getMaxDetailsLineWidth({ request: state.requests[state.selectedIndex], variables: state.variables }) - contentWidth);
        return { ...state, detailsHorizontalOffset: maxOffset };
      }

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- discriminated union narrowing is correct but TS infers always-true
      if (state.focusedPanel === 'response') {
        if (action.direction === 'start') {
          return { ...state, responseHorizontalOffset: 0 };
        }
        const contentWidth = getResponseContentWidth(columns);
        const maxOffset = Math.max(0, getMaxResponseLineWidth({ response: state.response, verbose: state.verbose, rawMode: state.rawMode }) - contentWidth);
        return { ...state, responseHorizontalOffset: maxOffset };
      }

      return state;
    }
  }
}

type RequestLifecycleAction = Extract<Action, { type: 'SEND_REQUEST' | 'RECEIVE_RESPONSE' | 'REQUEST_ERROR' | 'REQUEST_CANCEL' | 'RELOAD_FILE' }>;

function reduceRequestLifecycle(state: AppState, action: RequestLifecycleAction): AppState {
  switch (action.type) {
    case 'SEND_REQUEST':
      return {
        ...state,
        isLoading: true,
        requestError: null,
        responseScrollOffset: 0,
        responseHorizontalOffset: 0,
        ...CLEAR_SEARCH_STATE,
      };

    case 'RECEIVE_RESPONSE':
      return {
        ...state,
        response: action.response,
        requestError: null,
        isLoading: false,
        responseScrollOffset: 0,
        ...CLEAR_SEARCH_STATE,
      };

    case 'REQUEST_ERROR':
      return {
        ...state,
        response: null,
        requestError: action.error,
        isLoading: false,
        responseScrollOffset: 0,
        ...CLEAR_SEARCH_STATE,
      };

    case 'REQUEST_CANCEL':
      return {
        ...state,
        isLoading: false,
        ...setTransient({ warning: action.warning }),
      };

    case 'RELOAD_FILE': {
      const currentRequestName = state.requests[state.selectedIndex]?.name;
      const newIndex = currentRequestName
        ? action.requests.findIndex((req) => req.name === currentRequestName)
        : -1;

      return {
        ...state,
        requests: action.requests,
        fileVariables: action.variables,
        variables: mergeVariables(action.variables, state.environmentVariables),
        selectedIndex: newIndex >= 0 ? newIndex : 0,
        response: null,
        requestError: null,
        responseScrollOffset: 0,
        requestScrollOffset: 0,
        detailsScrollOffset: 0,
        detailsHorizontalOffset: 0,
        ...setTransient({ message: 'Reloaded' }),
      };
    }
  }
}

type TogglesAction = Extract<Action, { type: 'TOGGLE_VERBOSE' | 'TOGGLE_HELP' | 'CLOSE_HELP' | 'TOGGLE_WRAP' | 'TOGGLE_RAW' | 'TOGGLE_REQUEST_DETAILS' | 'TOGGLE_FULLSCREEN' }>;

function reduceToggles(state: AppState, action: TogglesAction): AppState {
  switch (action.type) {
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
        ...CLEAR_SEARCH_STATE,
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

    case 'TOGGLE_FULLSCREEN': {
      if (state.maximizedPanel === null) {
        const panel = state.focusedPanel;
        return {
          ...state,
          maximizedPanel: panel,
          ...(panel === 'requests' ? { requestHorizontalOffset: 0 } : {}),
          ...(panel === 'response' ? { responseHorizontalOffset: 0 } : {}),
          ...(panel === 'details' ? { detailsHorizontalOffset: 0 } : {}),
        };
      }

      const previousPanel = state.maximizedPanel;
      return {
        ...state,
        maximizedPanel: null,
        ...(previousPanel === 'requests' ? { requestHorizontalOffset: 0 } : {}),
        ...(previousPanel === 'response' ? { responseHorizontalOffset: 0 } : {}),
        ...(previousPanel === 'details' ? { detailsHorizontalOffset: 0 } : {}),
      };
    }
  }
}

type TransientAction = Extract<Action, { type: 'CLEAR_TRANSIENT_MESSAGE' | 'SET_TRANSIENT_MESSAGE' | 'SET_TRANSIENT_WARNING' | 'SET_TRANSIENT_ERROR' }>;

function reduceTransient(state: AppState, action: TransientAction): AppState {
  switch (action.type) {
    case 'CLEAR_TRANSIENT_MESSAGE':
      return {
        ...state,
        ...setTransient({}),
      };

    case 'SET_TRANSIENT_MESSAGE':
      return {
        ...state,
        ...setTransient({ message: action.message }),
      };

    case 'SET_TRANSIENT_WARNING':
      return {
        ...state,
        ...setTransient({ warning: action.warning }),
      };

    case 'SET_TRANSIENT_ERROR':
      return {
        ...state,
        ...setTransient({ error: action.error }),
      };
  }
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SELECT_REQUEST':
    case 'MOVE_SELECTION':
    case 'APPEND_REQUEST':
    case 'SWITCH_PANEL':
    case 'SCROLL':
    case 'SCROLL_HORIZONTAL':
    case 'JUMP_VERTICAL':
    case 'JUMP_HORIZONTAL':
      return reduceNavigation(state, action);

    case 'SEND_REQUEST':
    case 'RECEIVE_RESPONSE':
    case 'REQUEST_ERROR':
    case 'REQUEST_CANCEL':
    case 'RELOAD_FILE':
      return reduceRequestLifecycle(state, action);

    case 'TOGGLE_VERBOSE':
    case 'TOGGLE_HELP':
    case 'CLOSE_HELP':
    case 'TOGGLE_WRAP':
    case 'TOGGLE_RAW':
    case 'TOGGLE_REQUEST_DETAILS':
    case 'TOGGLE_FULLSCREEN':
      return reduceToggles(state, action);

    case 'CLEAR_TRANSIENT_MESSAGE':
    case 'SET_TRANSIENT_MESSAGE':
    case 'SET_TRANSIENT_WARNING':
    case 'SET_TRANSIENT_ERROR':
      return reduceTransient(state, action);

    case 'ENTER_FILE_LOAD':
    case 'UPDATE_FILE_LOAD_INPUT':
    case 'MOVE_FILE_LOAD_CURSOR':
    case 'SET_FILE_LOAD_ERROR':
    case 'SET_FILE_LOAD_COMPLETIONS':
    case 'LOAD_FILE':
    case 'CANCEL_FILE_LOAD':
      return reduceFileLoad(state, action);

    case 'ENTER_SAVE':
    case 'UPDATE_SAVE_INPUT':
    case 'MOVE_SAVE_CURSOR':
    case 'SET_SAVE_ERROR':
    case 'SAVE_FILE':
    case 'CANCEL_SAVE':
      return reduceSaveLoad(state, action);

    case 'ENTER_ENV_SELECT':
    case 'MOVE_ENV_SELECTION':
    case 'JUMP_ENV_SELECTION':
    case 'SWITCH_ENV':
    case 'CANCEL_ENV_SELECT':
    case 'SET_ENV_SELECT_ERROR':
      return reduceEnvSelect(state, action);

    case 'ENTER_SEARCH':
    case 'UPDATE_SEARCH_INPUT':
    case 'CONFIRM_SEARCH':
    case 'CANCEL_SEARCH':
    case 'NEXT_MATCH':
    case 'PREV_MATCH':
      return reduceSearch(state, action);

    case 'ENTER_EDIT':
    case 'EDIT_KEY':
    case 'SWITCH_EDIT_TAB':
    case 'COMMIT_EDIT':
    case 'CANCEL_EDIT':
    case 'ARM_EDIT_CANCEL':
      return reduceEdit(state, action);

    case 'REQUEST_DISCARD_CONFIRM':
    case 'CONFIRM_DISCARD':
    case 'CANCEL_DISCARD':
      return reduceConfirmDiscard(state, action);

    case 'ENTER_IN_PLACE_SAVE_CONFIRM':
    case 'CONFIRM_IN_PLACE_SAVE':
    case 'CANCEL_IN_PLACE_SAVE':
      return reduceConfirmInPlaceSave(state, action);

    default:
      return state;
  }
}

export function createInitialState(props: AppProps): AppState {
  return {
    requests: props.requests,
    variables: props.variables,
    environmentVariables: props.environmentVariables,
    fileVariables: props.fileVariables,
    activeEnvName: props.activeEnvName,
    availableEnvironments: props.availableEnvironments,
    envSelectIndex: 0,
    envSelectScrollOffset: 0,
    envSelectError: null,
    selectedIndex: 0,
    focusedPanel: 'requests',
    response: null,
    isLoading: false,
    requestError: null,
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
    transientMessage: null,
    transientError: null,
    transientWarning: null,
    mode: 'normal',
    fileLoadInput: '',
    fileLoadCursor: 0,
    fileLoadError: null,
    fileLoadCompletions: null,
    saveInput: '',
    saveCursor: 0,
    saveError: null,
    wrapMode: 'nowrap',
    showRequestDetails: false,
    rawMode: false,
    searchQuery: '',
    searchMatches: [],
    currentMatchIndex: 0,
    lastSearchQuery: '',
    maximizedPanel: null,
    certificates: props.executorConfig.certificates,
    editor: props.executorConfig.editor,
    editTarget: 'url',
    editBuffers: EMPTY_EDIT_BUFFERS,
    editScrollOffset: 0,
    editHorizontalOffset: 0,
    editEscapeArmedAt: null,
    pendingDiscardAction: null,
  };
}