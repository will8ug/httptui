import { basename, extname } from 'node:path';

import type { Action, AppState } from '../types';
import { INITIAL_SAVE_LOAD, setTransient } from './helpers';

type SaveLoadAction = Extract<Action, { type: 'ENTER_SAVE' | 'UPDATE_SAVE_INPUT' | 'MOVE_SAVE_CURSOR' | 'SET_SAVE_ERROR' | 'SAVE_FILE' | 'CANCEL_SAVE' }>;

export function reduceSaveLoad(state: AppState, action: SaveLoadAction): AppState {
  switch (action.type) {
    case 'ENTER_SAVE': {
      const defaultPath = `${basename(state.filePath, extname(state.filePath))}.http`;
      return {
        ...state,
        mode: 'saveLoad',
        saveLoad: { ...INITIAL_SAVE_LOAD, input: defaultPath, cursor: defaultPath.length },
      };
    }

    case 'UPDATE_SAVE_INPUT':
      return {
        ...state,
        saveLoad: {
          ...state.saveLoad,
          input: action.value,
          cursor: action.cursor,
          error: null,
        },
      };

    case 'MOVE_SAVE_CURSOR':
      return {
        ...state,
        saveLoad: {
          ...state.saveLoad,
          cursor: action.cursor,
        },
      };

    case 'SET_SAVE_ERROR':
      return {
        ...state,
        saveLoad: {
          ...state.saveLoad,
          error: action.error,
        },
      };

    case 'SAVE_FILE':
      return {
        ...state,
        mode: 'normal',
        requests: state.requests.map(r => ({ ...r, isDirty: false })),
        filePath: action.filePath,
        saveLoad: INITIAL_SAVE_LOAD,
        ...setTransient({ message: action.message }),
      };

    case 'CANCEL_SAVE':
      return {
        ...state,
        mode: 'normal',
        saveLoad: INITIAL_SAVE_LOAD,
      };
  }
}
