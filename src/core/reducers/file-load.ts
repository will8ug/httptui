import { applyEditOp, mutatesText } from '../editor';
import type { Action, AppState } from '../types';
import { mergeVariables } from '../variables';
import { INITIAL_FILE_LOAD, INITIAL_SEARCH, setTransient } from './helpers';

type FileLoadAction = Extract<Action, { type: 'ENTER_FILE_LOAD' | 'UPDATE_FILE_LOAD_INPUT' | 'FILE_LOAD_KEY' | 'SET_FILE_LOAD_ERROR' | 'SET_FILE_LOAD_COMPLETIONS' | 'LOAD_FILE' | 'CANCEL_FILE_LOAD' }>;

export function reduceFileLoad(state: AppState, action: FileLoadAction): AppState {
  switch (action.type) {
    case 'ENTER_FILE_LOAD':
      return {
        ...state,
        mode: 'fileLoad',
        fileLoad: INITIAL_FILE_LOAD,
      };

    case 'UPDATE_FILE_LOAD_INPUT':
      return {
        ...state,
        fileLoad: {
          ...state.fileLoad,
          input: action.value,
          cursor: action.cursor,
          error: null,
          completions: null,
        },
      };

    case 'FILE_LOAD_KEY': {
      const next = applyEditOp(
        { text: state.fileLoad.input, cursor: state.fileLoad.cursor },
        action.op,
        action.insert,
      );
      return {
        ...state,
        fileLoad: {
          ...state.fileLoad,
          input: next.text,
          cursor: next.cursor,
          error: mutatesText(action.op) ? null : state.fileLoad.error,
          completions: null,
        },
      };
    }

    case 'SET_FILE_LOAD_ERROR':
      return {
        ...state,
        fileLoad: {
          ...state.fileLoad,
          error: action.error,
        },
      };

    case 'SET_FILE_LOAD_COMPLETIONS':
      return {
        ...state,
        fileLoad: {
          ...state.fileLoad,
          completions: action.completions,
        },
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
        fileLoad: INITIAL_FILE_LOAD,
        ...setTransient({ message: `Loaded: ${action.filePath.split('/').pop() ?? ''}` }),
        ...(action.executorConfig && {
          certificates: action.executorConfig.certificates,
          editor: action.executorConfig.editor,
        }),
        search: INITIAL_SEARCH,
      };
    }

    case 'CANCEL_FILE_LOAD':
      return {
        ...state,
        mode: 'normal',
        fileLoad: INITIAL_FILE_LOAD,
      };
  }
}
