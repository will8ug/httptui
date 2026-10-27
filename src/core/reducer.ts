import { DEFAULT_TERMINAL_COLUMNS, DEFAULT_TERMINAL_ROWS } from '../utils/layout';

import type { Action, AppProps, AppState } from './types';
import { reduceConfirmDiscard, reduceConfirmInPlaceSave } from './reducers/confirm';
import { reduceEdit } from './reducers/edit';
import { reduceEnvSelect } from './reducers/env-select';
import { reduceFileLoad } from './reducers/file-load';
import { reduceGeometry } from './reducers/geometry';
import { INITIAL_CONFIRM, INITIAL_EDIT, INITIAL_ENV_SELECT, INITIAL_FILE_LOAD, INITIAL_RESPONSE_SAVE, INITIAL_SAVE_LOAD, INITIAL_SEARCH } from './reducers/helpers';
import { reduceRequestLifecycle } from './reducers/lifecycle';
import { reduceNavigation } from './reducers/navigation';
import { reduceResponseSave } from './reducers/response-save';
import { reduceSaveLoad } from './reducers/save-load';
import { reduceSearch } from './reducers/search';
import { reduceToggles } from './reducers/toggles';
import { reduceTransient } from './reducers/transient';

export {
  clamp,
  clampScrollOffsetToCursor,
  computeSearchScrollOffset,
  isSearchActive,
  responseViewportFromState,
  responseVisible,
  searchBarFromState,
} from './reducers/helpers';

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_GEOMETRY':
      return reduceGeometry(state, action);

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
    case 'FILE_LOAD_KEY':
    case 'SET_FILE_LOAD_ERROR':
    case 'SET_FILE_LOAD_COMPLETIONS':
    case 'LOAD_FILE':
    case 'CANCEL_FILE_LOAD':
      return reduceFileLoad(state, action);

    case 'ENTER_SAVE':
    case 'SAVE_KEY':
    case 'SET_SAVE_ERROR':
    case 'SAVE_FILE':
    case 'CANCEL_SAVE':
      return reduceSaveLoad(state, action);

    case 'ENTER_RESPONSE_SAVE':
    case 'RESPONSE_SAVE_KEY':
    case 'SET_RESPONSE_SAVE_ERROR':
    case 'SAVE_RESPONSE_FILE':
    case 'CANCEL_RESPONSE_SAVE':
      return reduceResponseSave(state, action);

    case 'ENTER_ENV_SELECT':
    case 'MOVE_ENV_SELECTION':
    case 'JUMP_ENV_SELECTION':
    case 'SWITCH_ENV':
    case 'CANCEL_ENV_SELECT':
    case 'SET_ENV_SELECT_ERROR':
      return reduceEnvSelect(state, action);

    case 'ENTER_SEARCH':
    case 'SEARCH_KEY':
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
    geometry: { rows: DEFAULT_TERMINAL_ROWS, columns: DEFAULT_TERMINAL_COLUMNS },
    requests: props.requests,
    variables: props.variables,
    environmentVariables: props.environmentVariables,
    fileVariables: props.fileVariables,
    activeEnvName: props.activeEnvName,
    availableEnvironments: props.availableEnvironments,
    selectedIndex: 0,
    focusedPanel: 'requests',
    response: null,
    isLoading: false,
    requestError: null,
    verbose: false,
    showHelp: false,
    filePath: props.filePath,
    sourceFormat: props.sourceFormat,
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
    fileLoad: INITIAL_FILE_LOAD,
    saveLoad: INITIAL_SAVE_LOAD,
    responseSave: INITIAL_RESPONSE_SAVE,
    envSelect: INITIAL_ENV_SELECT,
    edit: INITIAL_EDIT,
    confirm: INITIAL_CONFIRM,
    wrapMode: 'nowrap',
    showRequestDetails: false,
    rawMode: false,
    search: INITIAL_SEARCH,
    maximizedPanel: null,
    certificates: props.executorConfig.certificates,
    editor: props.executorConfig.editor,
  };
}
