import type { Action, AppState } from '../types';

type ConfirmDiscardAction = Extract<Action, { type: 'REQUEST_DISCARD_CONFIRM' | 'CONFIRM_DISCARD' | 'CANCEL_DISCARD' }>;

export function reduceConfirmDiscard(state: AppState, action: ConfirmDiscardAction): AppState {
  switch (action.type) {
    case 'REQUEST_DISCARD_CONFIRM':
      return {
        ...state,
        mode: 'confirmDiscard',
        pendingDiscardAction: action.action,
      };

    case 'CONFIRM_DISCARD':
      return {
        ...state,
        mode: 'normal',
        pendingDiscardAction: null,
      };

    case 'CANCEL_DISCARD':
      return {
        ...state,
        mode: 'normal',
        pendingDiscardAction: null,
      };
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
      return {
        ...state,
        mode: 'normal',
      };

    case 'CANCEL_IN_PLACE_SAVE':
      return {
        ...state,
        mode: 'normal',
      };
  }
}
