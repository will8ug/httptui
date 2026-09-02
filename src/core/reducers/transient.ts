import type { Action, AppState } from '../types';
import { setTransient } from './helpers';

type TransientAction = Extract<Action, { type: 'CLEAR_TRANSIENT_MESSAGE' | 'SET_TRANSIENT_MESSAGE' | 'SET_TRANSIENT_WARNING' | 'SET_TRANSIENT_ERROR' }>;

export function reduceTransient(state: AppState, action: TransientAction): AppState {
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
