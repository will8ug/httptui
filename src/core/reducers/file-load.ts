import type { Action, AppState } from '../types';
import { mergeVariables } from '../variables';
import { setTransient } from './helpers';

type FileLoadAction = Extract<Action, { type: 'ENTER_FILE_LOAD' | 'UPDATE_FILE_LOAD_INPUT' | 'MOVE_FILE_LOAD_CURSOR' | 'SET_FILE_LOAD_ERROR' | 'SET_FILE_LOAD_COMPLETIONS' | 'LOAD_FILE' | 'CANCEL_FILE_LOAD' }>;

export function reduceFileLoad(state: AppState, action: FileLoadAction): AppState {
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
