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
  lineNumber: number;
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
}

export interface ExecutorConfig {
  insecure: boolean;
  certificates?: Record<string, CertEntry>;
}

export type FocusedPanel = 'requests' | 'details' | 'response';

export type AppMode =
  | 'normal'
  | 'fileLoad'
  | 'search'
  | 'envSelect'
  | 'saveLoad'
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

export interface AppState {
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
  responseScrollOffset: number;
  requestScrollOffset: number;
  requestHorizontalOffset: number;
  responseHorizontalOffset: number;
  detailsScrollOffset: number;
  detailsHorizontalOffset: number;
  transientMessage: string | null;
  transientError: string | null;
  mode: AppMode;
  fileLoadInput: string;
  fileLoadCursor: number;
  fileLoadError: string | null;
  saveInput: string;
  saveCursor: number;
  saveError: string | null;
  fileVariables: FileVariable[];
  activeEnvName: string | null;
  availableEnvironments: EnvOption[];
  envSelectIndex: number;
  envSelectScrollOffset: number;
  envSelectError: string | null;
  wrapMode: WrapMode;
  showRequestDetails: boolean;
  rawMode: boolean;
  searchQuery: string;
  searchMatches: number[];
  currentMatchIndex: number;
  lastSearchQuery: string;
  maximizedPanel: FocusedPanel | null;
  editTarget: EditTarget;
  editBuffers: Record<EditTarget, { text: string; cursor: number }>;
  editScrollOffset: number;
  editHorizontalOffset: number;
  editEscapeArmedAt: number | null;
  pendingDiscardAction: PendingDiscardAction | null;
  certificates?: Record<string, CertEntry>;
}

export interface AppProps {
  filePath: string;
  requests: ParsedRequest[];
  variables: FileVariable[];
  environmentVariables: FileVariable[];
  fileVariables: FileVariable[];
  activeEnvName: string | null;
  availableEnvironments: EnvOption[];
  executorConfig: ExecutorConfig;
}

export type Action =
  | { type: 'SELECT_REQUEST'; index: number; rows?: number }
  | { type: 'MOVE_SELECTION'; direction: 'up' | 'down'; rows?: number }
  | { type: 'SEND_REQUEST' }
  | { type: 'RECEIVE_RESPONSE'; response: ResponseData }
  | { type: 'REQUEST_ERROR'; error: ErrorInfo }
  | { type: 'RELOAD_ERROR'; error: ErrorInfo }
  | { type: 'SWITCH_PANEL' }
  | { type: 'TOGGLE_VERBOSE' }
  | { type: 'TOGGLE_HELP' }
  | { type: 'SCROLL'; direction: 'up' | 'down'; maxOffset?: number }
  | { type: 'SCROLL_HORIZONTAL'; direction: 'left' | 'right'; columns?: number }
  | { type: 'CLOSE_HELP' }
  | { type: 'RELOAD_FILE'; requests: ParsedRequest[]; variables: FileVariable[] }
  | { type: 'SET_TRANSIENT_MESSAGE'; message: string }
  | { type: 'CLEAR_TRANSIENT_MESSAGE' }
  | { type: 'ENTER_FILE_LOAD' }
  | { type: 'UPDATE_FILE_LOAD_INPUT'; value: string; cursor: number }
  | { type: 'MOVE_FILE_LOAD_CURSOR'; cursor: number }
  | { type: 'SET_FILE_LOAD_ERROR'; error: string }
  | { type: 'LOAD_FILE'; requests: ParsedRequest[]; variables: FileVariable[]; filePath: string; executorConfig?: ExecutorConfig }
  | { type: 'CANCEL_FILE_LOAD' }
  | { type: 'TOGGLE_WRAP' }
  | { type: 'TOGGLE_RAW' }
  | { type: 'TOGGLE_REQUEST_DETAILS' }
  | { type: 'JUMP_VERTICAL'; direction: 'start' | 'end'; maxOffset?: number; rows?: number }
  | { type: 'JUMP_HORIZONTAL'; direction: 'start' | 'end'; columns?: number }
  | { type: 'ENTER_SEARCH' }
  | { type: 'UPDATE_SEARCH_INPUT'; value: string }
  | { type: 'CONFIRM_SEARCH'; firstMatchVisualIndex?: number; maxOffset?: number }
  | { type: 'CANCEL_SEARCH' }
  | { type: 'NEXT_MATCH'; targetVisualIndex: number; maxOffset?: number }
  | { type: 'PREV_MATCH'; targetVisualIndex: number; maxOffset?: number }
  | { type: 'TOGGLE_FULLSCREEN' }
  | { type: 'ENTER_ENV_SELECT' }
  | { type: 'MOVE_ENV_SELECTION'; direction: 'up' | 'down' }
  | { type: 'JUMP_ENV_SELECTION'; target: 'top' | 'bottom' }
  | { type: 'SWITCH_ENV'; environmentVariables: FileVariable[]; envName: string | null }
  | { type: 'CANCEL_ENV_SELECT' }
  | { type: 'SET_ENV_SELECT_ERROR'; error: string }
  | { type: 'ENTER_SAVE' }
  | { type: 'UPDATE_SAVE_INPUT'; value: string; cursor: number }
  | { type: 'MOVE_SAVE_CURSOR'; cursor: number }
  | { type: 'SAVE_FILE'; message: string; filePath: string }
  | { type: 'SET_SAVE_ERROR'; error: string }
  | { type: 'CANCEL_SAVE' }
  | { type: 'ENTER_EDIT'; buffers: Record<EditTarget, string>; visibleHeight: number; visibleWidth: number }
  | { type: 'EDIT_KEY'; op: EditOp; insert?: string; visibleHeight: number; visibleWidth: number }
  | { type: 'SWITCH_EDIT_TAB'; target: EditTarget; visibleHeight: number; visibleWidth: number }
  | { type: 'COMMIT_EDIT' }
  | { type: 'CANCEL_EDIT' }
  | { type: 'ARM_EDIT_CANCEL'; now: number }
  | { type: 'REQUEST_DISCARD_CONFIRM'; action: PendingDiscardAction }
  | { type: 'CONFIRM_DISCARD' }
  | { type: 'CANCEL_DISCARD' }
  | { type: 'ENTER_IN_PLACE_SAVE_CONFIRM' }
  | { type: 'CONFIRM_IN_PLACE_SAVE' }
  | { type: 'CANCEL_IN_PLACE_SAVE' };
