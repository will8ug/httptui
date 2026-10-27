import type { ImportFormat } from './importer';
import type { ClipboardRunner } from './clipboard';

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS';

export interface FormDataParam {
  key: string;
  value: string;
  type: 'text' | 'file';
}

export interface ParsedRequest {
  name: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body: string | undefined;
  formdataFields?: FormDataParam[];
  lineNumber?: number;
  isDirty: boolean;
}

export interface ResolvedRequest {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body: string | undefined;
  formdataFields?: FormDataParam[];
}

export interface FileVariable {
  name: string;
  value: string;
}

export interface ParseResult {
  requests: ParsedRequest[];
  variables: FileVariable[];
}

export interface ResponseData {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  rawBody: string;
  timing: {
    durationMs: number;
  };
  size: {
    bodyBytes: number;
  };
}

export interface ErrorInfo {
  message: string;
  code?: string;
}

export interface CertEntry {
  cert?: string;
  key?: string;
  pfx?: string;
  passphrase?: string;
  ca?: string;
}

export interface EnvironmentConfig {
  name: string;
  file: string;
}

export interface EnvOption {
  name: string;
  file: string | null;
}

export interface HttptuiConfig {
  certificates?: Record<string, CertEntry>;
  environments?: EnvironmentConfig[];
  editor?: string;
}

export interface ExecutorConfig {
  insecure: boolean;
  certificates?: Record<string, CertEntry>;
  editor?: string;
}

export type FocusedPanel = 'requests' | 'details' | 'response';

export interface TerminalGeometry {
  rows: number;
  columns: number;
}

export type AppMode =
  | 'normal'
  | 'fileLoad'
  | 'search'
  | 'envSelect'
  | 'saveLoad'
  | 'responseSave'
  | 'edit'
  | 'confirmDiscard'
  | 'confirmInPlaceSave';

export type WrapMode = 'nowrap' | 'wrap';

export type EditTarget = 'body' | 'headers' | 'url';

export const EDIT_TAB_ORDER: readonly EditTarget[] = ['url', 'headers', 'body'];

export type PendingDiscardAction = 'reload' | 'fileLoad' | 'quit' | 'editorHandoff';

export type EditOp =
  | 'insert'
  | 'deleteBackward'
  | 'deleteForward'
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'lineStart'
  | 'lineEnd';

export interface TextEntryState {
  input: string;
  cursor: number;
  error: string | null;
}

export interface FileLoadState extends TextEntryState {
  completions: string[] | null;
}

export interface EnvSelectState {
  selectedIndex: number;
  scrollOffset: number;
  error: string | null;
}

export interface EditState {
  target: EditTarget;
  buffers: Record<EditTarget, { text: string; cursor: number }>;
  scrollOffset: number;
  horizontalOffset: number;
  escapeArmedAt: number | null;
}

export interface ConfirmState {
  pendingDiscardAction: PendingDiscardAction | null;
}

export interface SearchState {
  query: string;
  cursor: number;
  matches: number[];
  currentMatchIndex: number;
  lastQuery: string;
}

export type SearchBar =
  | { kind: 'hidden' }
  | { kind: 'active'; query: string; cursor: number }
  | { kind: 'lingering'; lastQuery: string };

export interface AppState {
  geometry: TerminalGeometry;
  requests: ParsedRequest[];
  variables: FileVariable[];
  environmentVariables: FileVariable[];
  selectedIndex: number;
  focusedPanel: FocusedPanel;
  response: ResponseData | null;
  isLoading: boolean;
  requestError: ErrorInfo | null;
  insecure: boolean;
  verbose: boolean;
  showHelp: boolean;
  filePath: string;
  sourceFormat: ImportFormat;
  responseScrollOffset: number;
  requestScrollOffset: number;
  requestHorizontalOffset: number;
  responseHorizontalOffset: number;
  detailsScrollOffset: number;
  detailsHorizontalOffset: number;
  transientMessage: string | null;
  transientError: string | null;
  transientWarning: string | null;
  mode: AppMode;
  fileLoad: FileLoadState;
  saveLoad: TextEntryState;
  responseSave: TextEntryState;
  envSelect: EnvSelectState;
  edit: EditState;
  confirm: ConfirmState;
  fileVariables: FileVariable[];
  activeEnvName: string | null;
  availableEnvironments: EnvOption[];
  wrapMode: WrapMode;
  showRequestDetails: boolean;
  rawMode: boolean;
  search: SearchState;
  // Invariant: when non-null, equals focusedPanel. Fullscreen entry maximizes
  // the focused panel, and nothing reachable while maximized changes focus
  // (Tab is dead there; ENTER_SEARCH re-focuses the already-maximized response).
  maximizedPanel: FocusedPanel | null;
  certificates?: Record<string, CertEntry>;
  editor?: string;
}

export interface AppProps {
  filePath: string;
  sourceFormat: ImportFormat;
  requests: ParsedRequest[];
  variables: FileVariable[];
  environmentVariables: FileVariable[];
  fileVariables: FileVariable[];
  activeEnvName: string | null;
  availableEnvironments: EnvOption[];
  executorConfig: ExecutorConfig;
  clipboardRunner?: ClipboardRunner;
  clipboardReadRunner?: ClipboardRunner;
}

export type Action =
  | { type: 'SET_GEOMETRY'; rows: number; columns: number }
  | { type: 'SELECT_REQUEST'; index: number }
  | { type: 'APPEND_REQUEST'; request: ParsedRequest }
  | { type: 'MOVE_SELECTION'; direction: 'up' | 'down' }
  | { type: 'SEND_REQUEST' }
  | { type: 'RECEIVE_RESPONSE'; response: ResponseData }
  | { type: 'REQUEST_ERROR'; error: ErrorInfo }
  | { type: 'REQUEST_CANCEL'; warning: string }
  | { type: 'SWITCH_PANEL' }
  | { type: 'TOGGLE_VERBOSE' }
  | { type: 'TOGGLE_HELP' }
  | { type: 'SCROLL'; direction: 'up' | 'down' }
  | { type: 'SCROLL_HORIZONTAL'; direction: 'left' | 'right' }
  | { type: 'CLOSE_HELP' }
  | { type: 'RELOAD_FILE'; requests: ParsedRequest[]; variables: FileVariable[]; format: ImportFormat }
  | { type: 'SET_TRANSIENT_MESSAGE'; message: string }
  | { type: 'SET_TRANSIENT_WARNING'; warning: string }
  | { type: 'SET_TRANSIENT_ERROR'; error: string }
  | { type: 'CLEAR_TRANSIENT_MESSAGE' }
  | { type: 'ENTER_FILE_LOAD' }
  | { type: 'UPDATE_FILE_LOAD_INPUT'; value: string; cursor: number }
  | { type: 'FILE_LOAD_KEY'; op: EditOp; insert?: string }
  | { type: 'SET_FILE_LOAD_ERROR'; error: string }
  | { type: 'SET_FILE_LOAD_COMPLETIONS'; completions: string[] | null }
  | { type: 'LOAD_FILE'; requests: ParsedRequest[]; variables: FileVariable[]; filePath: string; format: ImportFormat; executorConfig?: ExecutorConfig }
  | { type: 'CANCEL_FILE_LOAD' }
  | { type: 'TOGGLE_WRAP' }
  | { type: 'TOGGLE_RAW' }
  | { type: 'TOGGLE_REQUEST_DETAILS' }
  | { type: 'JUMP_VERTICAL'; direction: 'start' | 'end' }
  | { type: 'JUMP_HORIZONTAL'; direction: 'start' | 'end' }
  | { type: 'ENTER_SEARCH' }
  | { type: 'SEARCH_KEY'; op: EditOp; insert?: string }
  | { type: 'CONFIRM_SEARCH'; firstMatchVisualIndex?: number }
  | { type: 'CANCEL_SEARCH' }
  | { type: 'NEXT_MATCH'; targetVisualIndex: number }
  | { type: 'PREV_MATCH'; targetVisualIndex: number }
  | { type: 'TOGGLE_FULLSCREEN' }
  | { type: 'ENTER_ENV_SELECT' }
  | { type: 'MOVE_ENV_SELECTION'; direction: 'up' | 'down' }
  | { type: 'JUMP_ENV_SELECTION'; target: 'top' | 'bottom' }
  | { type: 'SWITCH_ENV'; environmentVariables: FileVariable[]; envName: string | null }
  | { type: 'CANCEL_ENV_SELECT' }
  | { type: 'SET_ENV_SELECT_ERROR'; error: string }
  | { type: 'ENTER_SAVE' }
  | { type: 'SAVE_KEY'; op: EditOp; insert?: string }
  | { type: 'SAVE_FILE'; message: string; filePath: string }
  | { type: 'SET_SAVE_ERROR'; error: string }
  | { type: 'CANCEL_SAVE' }
  | { type: 'ENTER_RESPONSE_SAVE' }
  | { type: 'RESPONSE_SAVE_KEY'; op: EditOp; insert?: string }
  | { type: 'SET_RESPONSE_SAVE_ERROR'; error: string }
  | { type: 'SAVE_RESPONSE_FILE'; message: string }
  | { type: 'CANCEL_RESPONSE_SAVE' }
  | { type: 'ENTER_EDIT'; buffers: Record<EditTarget, string> }
  | { type: 'EDIT_KEY'; op: EditOp; insert?: string }
  | { type: 'SWITCH_EDIT_TAB'; target: EditTarget }
  | { type: 'COMMIT_EDIT' }
  | { type: 'CANCEL_EDIT' }
  | { type: 'ARM_EDIT_CANCEL'; now: number }
  | { type: 'REQUEST_DISCARD_CONFIRM'; action: PendingDiscardAction }
  | { type: 'CONFIRM_DISCARD' }
  | { type: 'CANCEL_DISCARD' }
  | { type: 'ENTER_IN_PLACE_SAVE_CONFIRM' }
  | { type: 'CONFIRM_IN_PLACE_SAVE' }
  | { type: 'CANCEL_IN_PLACE_SAVE' };
