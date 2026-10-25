import { basename, extname } from 'node:path';

import { applyEditOp, mutatesText } from '../editor';
import type { Action, AppState } from '../types';
import { INITIAL_SAVE_LOAD, setTransient } from './helpers';

type SaveLoadAction = Extract<Action, { type: 'ENTER_SAVE' | 'SAVE_KEY' | 'SET_SAVE_ERROR' | 'SAVE_FILE' | 'CANCEL_SAVE' }>;

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

    case 'SAVE_KEY': {
      const next = applyEditOp(
        { text: state.saveLoad.input, cursor: state.saveLoad.cursor },
        action.op,
        action.insert,
      );
      return {
        ...state,
        saveLoad: {
          ...state.saveLoad,
          input: next.text,
          cursor: next.cursor,
          error: mutatesText(action.op) ? null : state.saveLoad.error,
        },
      };
    }

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
