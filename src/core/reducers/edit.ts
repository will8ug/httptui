import { expandTabs } from '../../utils/text';
import { applyEditOp, offsetToLineCol } from '../editor';
import { headersEqual, parseHeadersText } from '../headers';
import type { Action, AppState } from '../types';
import { EMPTY_EDIT_BUFFERS, clampScrollOffsetToCursor, setTransient } from './helpers';

type EditAction = Extract<Action, { type: 'ENTER_EDIT' | 'EDIT_KEY' | 'SWITCH_EDIT_TAB' | 'COMMIT_EDIT' | 'CANCEL_EDIT' | 'ARM_EDIT_CANCEL' }>;

export function reduceEdit(state: AppState, action: EditAction): AppState {
  switch (action.type) {
    case 'ENTER_EDIT': {
      const urlText = action.buffers.url;
      const bodyText = action.buffers.body;
      const headersText = action.buffers.headers;
      const { line, col } = offsetToLineCol(urlText, urlText.length);
      const cursorLineText = urlText.split('\n')[line] ?? '';
      const visualCol = expandTabs(cursorLineText.slice(0, col)).length;
      return {
        ...state,
        mode: 'edit',
        editTarget: 'url',
        editBuffers: {
          url: { text: urlText, cursor: urlText.length },
          body: { text: bodyText, cursor: bodyText.length },
          headers: { text: headersText, cursor: headersText.length },
        },
        editScrollOffset: clampScrollOffsetToCursor(line, 0, action.visibleHeight),
        editHorizontalOffset: clampScrollOffsetToCursor(visualCol, 0, action.visibleWidth),
      };
    }

    case 'EDIT_KEY': {
      const active = state.editBuffers[state.editTarget];
      const insert = state.editTarget === 'url' && action.insert !== undefined
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
      return {
        ...state,
        editBuffers: {
          ...state.editBuffers,
          [state.editTarget]: updated,
        },
        editScrollOffset: clampScrollOffsetToCursor(line, state.editScrollOffset, action.visibleHeight),
        editHorizontalOffset: clampScrollOffsetToCursor(visualCol, state.editHorizontalOffset, action.visibleWidth),
      };
    }

    case 'SWITCH_EDIT_TAB': {
      if (action.target === state.editTarget) {
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
      const buffer = state.editBuffers[action.target];
      const { line, col } = offsetToLineCol(buffer.text, buffer.cursor);
      const cursorLineText = buffer.text.split('\n')[line] ?? '';
      const visualCol = expandTabs(cursorLineText.slice(0, col)).length;
      return {
        ...state,
        editTarget: action.target,
        editScrollOffset: clampScrollOffsetToCursor(line, 0, action.visibleHeight),
        editHorizontalOffset: clampScrollOffsetToCursor(visualCol, 0, action.visibleWidth),
      };
    }

    case 'COMMIT_EDIT': {
      const request = state.requests[state.selectedIndex];
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for out-of-bounds access
      if (!request) {
        return state;
      }
      const parsedHeaders = parseHeadersText(state.editBuffers.headers.text);
      if (!parsedHeaders.ok) {
        return {
          ...state,
          ...setTransient({ error: `Cannot save: header line ${parsedHeaders.line} is ${parsedHeaders.error}` }),
        };
      }
      const nextBody = state.editBuffers.body.text === '' ? undefined : state.editBuffers.body.text;
      const nextUrl = state.editBuffers.url.text;
      const nextHeaders = parsedHeaders.headers;
      const changed = nextUrl !== request.url || nextBody !== request.body || !headersEqual(nextHeaders, request.headers);
      const updatedRequests = state.requests.map((req, i) =>
        i === state.selectedIndex ? { ...req, headers: nextHeaders, body: nextBody, url: nextUrl, isDirty: req.isDirty || changed } : req,
      );
      return {
        ...state,
        requests: updatedRequests,
        mode: 'normal',
        editTarget: 'url',
        editBuffers: EMPTY_EDIT_BUFFERS,
        editScrollOffset: 0,
        editHorizontalOffset: 0,
        editEscapeArmedAt: null,
        ...setTransient({ message: changed ? 'Request updated' : null }),
      };
    }

    case 'CANCEL_EDIT':
      return {
        ...state,
        mode: 'normal',
        editTarget: 'url',
        editBuffers: EMPTY_EDIT_BUFFERS,
        editScrollOffset: 0,
        editHorizontalOffset: 0,
        editEscapeArmedAt: null,
        ...setTransient({}),
      };

    case 'ARM_EDIT_CANCEL':
      return {
        ...state,
        editEscapeArmedAt: action.now,
        ...setTransient({ message: 'Press Esc again to discard changes' }),
      };
  }
}
