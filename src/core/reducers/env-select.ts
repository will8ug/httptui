import { getEnvPickerVisibleHeight } from '../../utils/layout';
import type { Action, AppState } from '../types';
import { mergeVariables } from '../variables';
import { clamp, clampScrollOffsetToCursor, CLEAR_SEARCH_STATE, INITIAL_ENV_SELECT } from './helpers';

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
      const visibleCount = getEnvPickerVisibleHeight(state.geometry.rows);
      return {
        ...state,
        mode: 'envSelect',
        envSelect: {
          ...INITIAL_ENV_SELECT,
          selectedIndex: initialIndex,
          scrollOffset: clampScrollOffsetToCursor(initialIndex, state.envSelect.scrollOffset, visibleCount),
        },
      };
    }

    case 'MOVE_ENV_SELECTION': {
      const optionCount = state.availableEnvironments.length;
      if (optionCount === 0) {
        return state;
      }
      const delta = action.direction === 'up' ? -1 : 1;
      const nextIndex = clamp(state.envSelect.selectedIndex + delta, 0, optionCount - 1);
      const visibleCount = getEnvPickerVisibleHeight(state.geometry.rows);
      return {
        ...state,
        envSelect: {
          ...state.envSelect,
          selectedIndex: nextIndex,
          scrollOffset: clampScrollOffsetToCursor(nextIndex, state.envSelect.scrollOffset, visibleCount),
        },
      };
    }

    case 'JUMP_ENV_SELECTION': {
      const optionCount = state.availableEnvironments.length;
      if (optionCount === 0) {
        return state;
      }
      const nextIndex = action.target === 'top' ? 0 : optionCount - 1;
      const visibleCount = getEnvPickerVisibleHeight(state.geometry.rows);
      return {
        ...state,
        envSelect: {
          ...state.envSelect,
          selectedIndex: nextIndex,
          scrollOffset: clampScrollOffsetToCursor(nextIndex, state.envSelect.scrollOffset, visibleCount),
        },
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
        envSelect: INITIAL_ENV_SELECT,
        ...CLEAR_SEARCH_STATE,
      };

    case 'CANCEL_ENV_SELECT':
      return {
        ...state,
        mode: 'normal',
        envSelect: INITIAL_ENV_SELECT,
      };

    case 'SET_ENV_SELECT_ERROR':
      return {
        ...state,
        envSelect: {
          ...state.envSelect,
          error: action.error,
        },
      };
  }
}
