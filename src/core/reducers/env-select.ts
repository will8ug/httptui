import { DEFAULT_TERMINAL_ROWS, getEnvPickerVisibleHeight } from '../../utils/layout';
import type { Action, AppState } from '../types';
import { mergeVariables } from '../variables';
import { clamp, clampScrollOffsetToCursor } from './helpers';

type EnvSelectAction = Extract<Action, { type: 'ENTER_ENV_SELECT' | 'MOVE_ENV_SELECTION' | 'JUMP_ENV_SELECTION' | 'SWITCH_ENV' | 'CANCEL_ENV_SELECT' | 'SET_ENV_SELECT_ERROR' }>;

export function reduceEnvSelect(state: AppState, action: EnvSelectAction): AppState {
  switch (action.type) {
    case 'ENTER_ENV_SELECT': {
      const findOption = (name: string) =>
        state.availableEnvironments.findIndex((option) => option.name === name);
      // When no environment is active, default to the (none) option so the
      // user lands on the revert-to-file-vars choice rather than the first
      // listed environment. The final `>= 0` fallback handles malformed
      // configurations where (none) itself is missing.
      const activeIndex = state.activeEnvName
        ? findOption(state.activeEnvName)
        : findOption('(none)');
      const initialIndex = activeIndex >= 0 ? activeIndex : 0;
      const visibleCount = getEnvPickerVisibleHeight(DEFAULT_TERMINAL_ROWS);
      return {
        ...state,
        mode: 'envSelect',
        envSelectIndex: initialIndex,
        envSelectScrollOffset: clampScrollOffsetToCursor(initialIndex, state.envSelectScrollOffset, visibleCount),
        envSelectError: null,
      };
    }

    case 'MOVE_ENV_SELECTION': {
      const optionCount = state.availableEnvironments.length;
      if (optionCount === 0) {
        return state;
      }
      const delta = action.direction === 'up' ? -1 : 1;
      const nextIndex = clamp(state.envSelectIndex + delta, 0, optionCount - 1);
      const visibleCount = getEnvPickerVisibleHeight(DEFAULT_TERMINAL_ROWS);
      return {
        ...state,
        envSelectIndex: nextIndex,
        envSelectScrollOffset: clampScrollOffsetToCursor(nextIndex, state.envSelectScrollOffset, visibleCount),
      };
    }

    case 'JUMP_ENV_SELECTION': {
      const optionCount = state.availableEnvironments.length;
      if (optionCount === 0) {
        return state;
      }
      const nextIndex = action.target === 'top' ? 0 : optionCount - 1;
      const visibleCount = getEnvPickerVisibleHeight(DEFAULT_TERMINAL_ROWS);
      return {
        ...state,
        envSelectIndex: nextIndex,
        envSelectScrollOffset: clampScrollOffsetToCursor(nextIndex, state.envSelectScrollOffset, visibleCount),
      };
    }

    case 'SWITCH_ENV':
      return {
        ...state,
        environmentVariables: action.environmentVariables,
        variables: mergeVariables(state.fileVariables, action.environmentVariables),
        activeEnvName: action.envName,
        response: null,
        requestError: null,
        responseScrollOffset: 0,
        requestScrollOffset: 0,
        requestHorizontalOffset: 0,
        responseHorizontalOffset: 0,
        detailsScrollOffset: 0,
        detailsHorizontalOffset: 0,
        mode: 'normal',
        envSelectError: null,
      };

    case 'CANCEL_ENV_SELECT':
      return {
        ...state,
        mode: 'normal',
        envSelectError: null,
      };

    case 'SET_ENV_SELECT_ERROR':
      return {
        ...state,
        envSelectError: action.error,
      };
  }
}
