import type { Action, AppState } from '../types';
import { deriveResponseSaveFilename } from '../response-save';
import { INITIAL_RESPONSE_SAVE, setTransient } from './helpers';

type ResponseSaveAction = Extract<Action, { type: 'ENTER_RESPONSE_SAVE' | 'UPDATE_RESPONSE_SAVE_INPUT' | 'MOVE_RESPONSE_SAVE_CURSOR' | 'SET_RESPONSE_SAVE_ERROR' | 'SAVE_RESPONSE_FILE' | 'CANCEL_RESPONSE_SAVE' }>;

export function reduceResponseSave(state: AppState, action: ResponseSaveAction): AppState {
  switch (action.type) {
    case 'ENTER_RESPONSE_SAVE': {
      const request = state.requests[state.selectedIndex];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for out-of-bounds access
      const requestName = request?.name ?? '';
      const defaultFilename = deriveResponseSaveFilename(requestName, state.response?.body ?? '');
      return {
        ...state,
        mode: 'responseSave',
        responseSave: { ...INITIAL_RESPONSE_SAVE, input: defaultFilename, cursor: defaultFilename.length },
      };
    }

    case 'UPDATE_RESPONSE_SAVE_INPUT':
      return {
        ...state,
        responseSave: {
          ...state.responseSave,
          input: action.value,
          cursor: action.cursor,
          error: null,
        },
      };

    case 'MOVE_RESPONSE_SAVE_CURSOR':
      return {
        ...state,
        responseSave: {
          ...state.responseSave,
          cursor: action.cursor,
        },
      };

    case 'SET_RESPONSE_SAVE_ERROR':
      return {
        ...state,
        responseSave: {
          ...state.responseSave,
          error: action.error,
        },
      };

    case 'SAVE_RESPONSE_FILE':
      return {
        ...state,
        mode: 'normal',
        responseSave: INITIAL_RESPONSE_SAVE,
        ...setTransient({ message: action.message }),
      };

    case 'CANCEL_RESPONSE_SAVE':
      return {
        ...state,
        mode: 'normal',
        responseSave: INITIAL_RESPONSE_SAVE,
      };
  }
}
