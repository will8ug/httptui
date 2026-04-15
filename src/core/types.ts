export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS';

export interface ParsedRequest {
  name: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body: string | undefined;
  lineNumber: number;
}

export interface ResolvedRequest {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body: string | undefined;
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

export interface RequestError {
  message: string;
  code?: string;
}

export interface ExecutorConfig {
  insecure: boolean;
}

export type FocusedPanel = 'requests' | 'response';
export type AppMode = 'normal' | 'fileLoad';
export type WrapMode = 'nowrap' | 'wrap';

export interface AppState {
  requests: ParsedRequest[];
  variables: FileVariable[];
  selectedIndex: number;
  focusedPanel: FocusedPanel;
  response: ResponseData | null;
  isLoading: boolean;
  error: RequestError | null;
  insecure: boolean;
  verbose: boolean;
  showHelp: boolean;
  filePath: string;
  responseScrollOffset: number;
  requestScrollOffset: number;
  requestHorizontalOffset: number;
  responseHorizontalOffset: number;
  reloadMessage: string | null;
  mode: AppMode;
  fileLoadInput: string;
  fileLoadError: string | null;
  wrapMode: WrapMode;
  showRequestDetails: boolean;
}

export type Action =
  | { type: 'SELECT_REQUEST'; index: number }
  | { type: 'MOVE_SELECTION'; direction: 'up' | 'down' }
  | { type: 'SEND_REQUEST' }
  | { type: 'RECEIVE_RESPONSE'; response: ResponseData }
  | { type: 'REQUEST_ERROR'; error: RequestError }
  | { type: 'SWITCH_PANEL' }
  | { type: 'TOGGLE_VERBOSE' }
  | { type: 'TOGGLE_HELP' }
  | { type: 'SCROLL'; direction: 'up' | 'down' }
  | { type: 'SCROLL_HORIZONTAL'; direction: 'left' | 'right'; columns?: number }
  | { type: 'CLOSE_HELP' }
  | { type: 'RELOAD_FILE'; requests: ParsedRequest[]; variables: FileVariable[] }
  | { type: 'CLEAR_RELOAD_MESSAGE' }
  | { type: 'ENTER_FILE_LOAD' }
  | { type: 'UPDATE_FILE_LOAD_INPUT'; value: string }
  | { type: 'SET_FILE_LOAD_ERROR'; error: string }
  | { type: 'LOAD_FILE'; requests: ParsedRequest[]; variables: FileVariable[]; filePath: string }
  | { type: 'CANCEL_FILE_LOAD' }
  | { type: 'TOGGLE_WRAP' }
  | { type: 'TOGGLE_REQUEST_DETAILS' };
