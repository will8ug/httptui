import { basename, extname } from 'node:path';

import type { Action, AppState } from '../types';
import { setTransient } from './helpers';

type SaveLoadAction = Extract<Action, { type: 'ENTER_SAVE' | 'UPDATE_SAVE_INPUT' | 'MOVE_SAVE_CURSOR' | 'SET_SAVE_ERROR' | 'SAVE_FILE' | 'CANCEL_SAVE' }>;

export function reduceSaveLoad(state: AppState, action: SaveLoadAction): AppState {
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
