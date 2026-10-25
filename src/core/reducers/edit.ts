import { getEditorContentWidth, getEditorVisibleHeight } from '../../utils/layout';
import { expandTabs } from '../../utils/text';
import { applyEditOp, offsetToLineCol } from '../editor';
import { headersEqual, parseHeadersText } from '../headers';
import type { Action, AppState } from '../types';
import { INITIAL_EDIT, clampScrollOffsetToCursor, setTransient } from './helpers';

type EditAction = Extract<Action, { type: 'ENTER_EDIT' | 'EDIT_KEY' | 'SWITCH_EDIT_TAB' | 'COMMIT_EDIT' | 'CANCEL_EDIT' | 'ARM_EDIT_CANCEL' }>;

function editVisibleWindow(state: AppState): { height: number; width: number } {
  return {
    height: getEditorVisibleHeight(state.geometry.rows),
    width: getEditorContentWidth(state.geometry.columns),
  };
}

export function reduceEdit(state: AppState, action: EditAction): AppState {
  switch (action.type) {
    case 'ENTER_EDIT': {
      const urlText = action.buffers.url;
      const bodyText = action.buffers.body;
      const headersText = action.buffers.headers;
      const { line, col } = offsetToLineCol(urlText, urlText.length);
      const cursorLineText = urlText.split('\n')[line] ?? '';
      const visualCol = expandTabs(cursorLineText.slice(0, col)).length;
      const view = editVisibleWindow(state);
      return {
        ...state,
        mode: 'edit',
        edit: {
          ...INITIAL_EDIT,
          buffers: {
            url: { text: urlText, cursor: urlText.length },
            body: { text: bodyText, cursor: bodyText.length },
            headers: { text: headersText, cursor: headersText.length },
          },
          scrollOffset: clampScrollOffsetToCursor(line, 0, view.height),
          horizontalOffset: clampScrollOffsetToCursor(visualCol, 0, view.width),
        },
      };
    }

    case 'EDIT_KEY': {
      const active = state.edit.buffers[state.edit.target];
      const insert = state.edit.target === 'url' && action.insert !== undefined
        ? action.insert.replace(/[\n\r]/g, '')
        : action.insert;
      const updated = applyEditOp(
        { text: active.text, cursor: active.cursor },
        action.op,
        insert,
      );
      const { line, col } = offsetToLineCol(updated.text, updated.cursor);
      const cursorLineText = updated.text.split('\n')[line] ?? '';
      const visualCol = expandTabs(cursorLineText.slice(0, col)).length;
      const view = editVisibleWindow(state);
      return {
        ...state,
        edit: {
          ...state.edit,
          buffers: {
            ...state.edit.buffers,
            [state.edit.target]: updated,
          },
          scrollOffset: clampScrollOffsetToCursor(line, state.edit.scrollOffset, view.height),
          horizontalOffset: clampScrollOffsetToCursor(visualCol, state.edit.horizontalOffset, view.width),
        },
      };
    }

    case 'SWITCH_EDIT_TAB': {
      if (action.target === state.edit.target) {
        return state;
      }
      const request = state.requests[state.selectedIndex];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for out-of-bounds access
      if (action.target === 'body' && request?.formdataFields) {
        return {
          ...state,
          ...setTransient({ message: 'form-data request body is not supported to edit for now' }),
        };
      }
      const buffer = state.edit.buffers[action.target];
      const { line, col } = offsetToLineCol(buffer.text, buffer.cursor);
      const cursorLineText = buffer.text.split('\n')[line] ?? '';
      const visualCol = expandTabs(cursorLineText.slice(0, col)).length;
      const view = editVisibleWindow(state);
      return {
        ...state,
        edit: {
          ...state.edit,
          target: action.target,
          scrollOffset: clampScrollOffsetToCursor(line, 0, view.height),
          horizontalOffset: clampScrollOffsetToCursor(visualCol, 0, view.width),
        },
      };
    }

    case 'COMMIT_EDIT': {
      const request = state.requests[state.selectedIndex];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for out-of-bounds access
      if (!request) {
        return state;
      }
      const parsedHeaders = parseHeadersText(state.edit.buffers.headers.text);
      if (!parsedHeaders.ok) {
        return {
          ...state,
          ...setTransient({ error: `Cannot save: header line ${parsedHeaders.line} is ${parsedHeaders.error}` }),
        };
      }
      const nextBody = state.edit.buffers.body.text === '' ? undefined : state.edit.buffers.body.text;
      const nextUrl = state.edit.buffers.url.text;
      const nextHeaders = parsedHeaders.headers;
      const changed = nextUrl !== request.url || nextBody !== request.body || !headersEqual(nextHeaders, request.headers);
      const updatedRequests = state.requests.map((req, i) =>
        i === state.selectedIndex ? { ...req, headers: nextHeaders, body: nextBody, url: nextUrl, isDirty: req.isDirty || changed } : req,
      );
      return {
        ...state,
        requests: updatedRequests,
        mode: 'normal',
        edit: INITIAL_EDIT,
        ...setTransient({ message: changed ? 'Request updated' : null }),
      };
    }

    case 'CANCEL_EDIT':
      return {
        ...state,
        mode: 'normal',
        edit: INITIAL_EDIT,
        ...setTransient({}),
      };

    case 'ARM_EDIT_CANCEL':
      return {
        ...state,
        edit: {
          ...state.edit,
          escapeArmedAt: action.now,
        },
        ...setTransient({ message: 'Press Esc again to discard changes' }),
      };
  }
}
