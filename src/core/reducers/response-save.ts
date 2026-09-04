import type { Action, AppState } from '../types';
import { deriveResponseSaveFilename } from '../response-save';
import { setTransient } from './helpers';

type ResponseSaveAction = Extract<Action, { type: 'ENTER_RESPONSE_SAVE' | 'UPDATE_RESPONSE_SAVE_INPUT' | 'MOVE_RESPONSE_SAVE_CURSOR' | 'SET_RESPONSE_SAVE_ERROR' | 'SAVE_RESPONSE_FILE' | 'CANCEL_RESPONSE_SAVE' }>;

export function reduceResponseSave(state: AppState, action: ResponseSaveAction): AppState {
  switch (action.type) {
    case 'ENTER_RESPONSE_SAVE': {
      const request = state.requests[state.selectedIndex];
      const defaultFilename = deriveResponseSaveFilename(request.name, state.response?.body ?? '');
      return {
        ...state,
        mode: 'responseSave',
        responseSaveInput: defaultFilename,
        responseSaveCursor: defaultFilename.length,
        responseSaveError: null,
      };
    }

    case 'UPDATE_RESPONSE_SAVE_INPUT':
      return {
        ...state,
        responseSaveInput: action.value,
        responseSaveCursor: action.cursor,
        responseSaveError: null,
      };

    case 'MOVE_RESPONSE_SAVE_CURSOR':
      return {
        ...state,
        responseSaveCursor: action.cursor,
      };

    case 'SET_RESPONSE_SAVE_ERROR':
      return {
        ...state,
        responseSaveError: action.error,
      };

    case 'SAVE_RESPONSE_FILE':
      return {
        ...state,
        mode: 'normal',
        responseSaveInput: '',
        responseSaveCursor: 0,
        responseSaveError: null,
        ...setTransient({ message: action.message }),
      };

    case 'CANCEL_RESPONSE_SAVE':
      return {
        ...state,
        mode: 'normal',
        responseSaveInput: '',
        responseSaveCursor: 0,
        responseSaveError: null,
      };
  }
}
