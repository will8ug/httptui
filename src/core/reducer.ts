import { getDetailsTotalLines, getMaxScrollOffset, getResponseTotalLines, RESPONSE_PANEL_VERTICAL_CHROME } from '../utils/scroll';

import type { Action, AppProps, AppState } from './types';
import { resolveVariables } from './variables';
import { reduceConfirmDiscard, reduceConfirmInPlaceSave } from './reducers/confirm';
import { reduceEdit } from './reducers/edit';
import { reduceEnvSelect } from './reducers/env-select';
import { reduceFileLoad } from './reducers/file-load';
import { EMPTY_EDIT_BUFFERS } from './reducers/helpers';
import { reduceRequestLifecycle } from './reducers/lifecycle';
import { reduceNavigation } from './reducers/navigation';
import { reduceSaveLoad } from './reducers/save-load';
import { reduceSearch } from './reducers/search';
import { reduceToggles } from './reducers/toggles';
import { reduceTransient } from './reducers/transient';

export { clamp, clampScrollOffsetToCursor, CLEAR_SEARCH_STATE, computeSearchScrollOffset } from './reducers/helpers';

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
