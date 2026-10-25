import type { Action, AppState } from '../types';
import { INITIAL_CONFIRM } from './helpers';

type ConfirmDiscardAction = Extract<Action, { type: 'REQUEST_DISCARD_CONFIRM' | 'CONFIRM_DISCARD' | 'CANCEL_DISCARD' }>;

function exitConfirm(state: AppState): AppState {
  return {
    ...state,
    mode: 'normal',
    confirm: INITIAL_CONFIRM,
  };
}

export function reduceConfirmDiscard(state: AppState, action: ConfirmDiscardAction): AppState {
  switch (action.type) {
    case 'REQUEST_DISCARD_CONFIRM':
      return {
        ...state,
        mode: 'confirmDiscard',
        confirm: { ...INITIAL_CONFIRM, pendingDiscardAction: action.action },
      };

    case 'CONFIRM_DISCARD':
    case 'CANCEL_DISCARD':
      return exitConfirm(state);
  }
}

type ConfirmInPlaceSaveAction = Extract<Action, { type: 'ENTER_IN_PLACE_SAVE_CONFIRM' | 'CONFIRM_IN_PLACE_SAVE' | 'CANCEL_IN_PLACE_SAVE' }>;

export function reduceConfirmInPlaceSave(state: AppState, action: ConfirmInPlaceSaveAction): AppState {
  switch (action.type) {
    case 'ENTER_IN_PLACE_SAVE_CONFIRM':
      return {
        ...state,
        mode: 'confirmInPlaceSave',
      };

    case 'CONFIRM_IN_PLACE_SAVE':
    case 'CANCEL_IN_PLACE_SAVE':
      return exitConfirm(state);
  }
}
