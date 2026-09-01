import { readFileSync, statSync } from 'node:fs';
import { basename, dirname } from 'node:path';

import type { Dispatch } from 'react';
import type { SuspendTerminal } from 'ink';

import { runEditorHandoff } from '../core/editor-launcher';
import { executeRequest, isErrorInfo, toErrorInfo } from '../core/executor';
import type { CertConfig } from '../core/executor';
import { matchCertificate, loadCertFiles } from '../core/certificates';
import { copyToClipboard, readFromClipboard, type ClipboardRunner } from '../core/clipboard';
import { toCurlCommand } from '../core/curl-serializer';
import { parseCurlCommand } from '../core/curl-parser';
import { parseAnyFormat } from '../core/format-detector';
import { resolveVariables } from '../core/variables';
import type { Action, AppState, CertEntry, ExecutorConfig, FileVariable, ParsedRequest } from '../core/types';

export async function sendSelectedRequest({ state, executorConfig, abortControllerRef, dispatch }: {
  state: AppState;
  executorConfig: ExecutorConfig;
  abortControllerRef: { current: AbortController | null };
  dispatch: Dispatch<Action>;
}): Promise<void> {
  if (state.isLoading) {
    return;
  }

  const request = state.requests[state.selectedIndex];

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for out-of-bounds access
  if (!request) {
    return;
  }

  dispatch({ type: 'SEND_REQUEST' });

  const controller = new AbortController();
  abortControllerRef.current = controller;

  try {
    const resolvedRequest = resolveVariables(request, state.variables, dirname(state.filePath));

    let certConfig: CertConfig | undefined;
    if (state.certificates) {
      const matchedEntry = matchCertificate(resolvedRequest.url, state.certificates);
      if (matchedEntry) {
        const hostname = new URL(resolvedRequest.url).hostname;
        certConfig = loadCertFiles(matchedEntry, '', hostname);
      }
    }

    const result = await executeRequest(resolvedRequest, executorConfig, certConfig, controller.signal);

    if (controller.signal.aborted) {
      return;
    }

    if (isErrorInfo(result)) {
      dispatch({ type: 'REQUEST_ERROR', error: result });
      return;
    }

    dispatch({ type: 'RECEIVE_RESPONSE', response: result });
  } catch (error) {
    if (controller.signal.aborted) {
      return;
    }
    dispatch({ type: 'REQUEST_ERROR', error: toErrorInfo(error) });
  } finally {
    if (abortControllerRef.current === controller) {
      abortControllerRef.current = null;
    }
  }
}

export async function performEditorHandoff({ filePath, editor, suspend, dispatch }: {
  filePath: string;
  editor: string | undefined;
  suspend: SuspendTerminal;
  dispatch: Dispatch<Action>;
}): Promise<void> {
  let mtimeMs: number;
  try {
    mtimeMs = statSync(filePath).mtimeMs;
  } catch (error) {
    dispatch({ type: 'SET_TRANSIENT_ERROR', error: toErrorInfo(error).message });
    return;
  }

  try {
    await runEditorHandoff({ filePath, suspend, editor });
  } catch (error) {
    dispatch({ type: 'SET_TRANSIENT_ERROR', error: toErrorInfo(error).message });
    return;
  }

  try {
    if (statSync(filePath).mtimeMs === mtimeMs) {
      return;
    }

    const content = readFileSync(filePath, 'utf8');
    const parseResult = parseAnyFormat(filePath, content);

    if (parseResult.requests.length === 0) {
      dispatch({ type: 'SET_TRANSIENT_MESSAGE', message: `No requests found in ${basename(filePath)}` });
      return;
    }

    dispatch({ type: 'RELOAD_FILE', requests: parseResult.requests, variables: parseResult.variables });
  } catch (error) {
    dispatch({ type: 'SET_TRANSIENT_ERROR', error: toErrorInfo(error).message });
  }
}

export async function copySelectedAsCurl({ request, variables, baseDir, certificates, insecure, clipboardRunner, dispatch }: {
  request: ParsedRequest | undefined;
  variables: FileVariable[];
  baseDir: string;
  certificates: Record<string, CertEntry> | undefined;
  insecure: boolean;
  clipboardRunner: ClipboardRunner | undefined;
  dispatch: Dispatch<Action>;
}): Promise<void> {
  if (!request) {
    return;
  }

  try {
    const resolvedRequest = resolveVariables(request, variables, baseDir);

    let certificate: CertEntry | undefined;
    if (certificates) {
      certificate = matchCertificate(resolvedRequest.url, certificates);
    }

    const command = toCurlCommand(resolvedRequest, { insecure, certificate });

    await copyToClipboard(command, clipboardRunner === undefined ? undefined : { runner: clipboardRunner });
    dispatch({ type: 'SET_TRANSIENT_MESSAGE', message: 'Copied as curl' });
  } catch (error) {
    dispatch({ type: 'SET_TRANSIENT_ERROR', error: error instanceof Error ? error.message : 'Could not copy to clipboard' });
  }
}

export async function pasteFromClipboard({ clipboardReadRunner, dispatch }: {
  clipboardReadRunner: ClipboardRunner | undefined;
  dispatch: Dispatch<Action>;
}): Promise<void> {
  let text: string;
  try {
    text = await readFromClipboard({ runner: clipboardReadRunner });
  } catch (error) {
    dispatch({ type: 'SET_TRANSIENT_ERROR', error: error instanceof Error ? error.message : 'Could not read clipboard' });
    return;
  }

  const result = parseCurlCommand(text);
  if (!result.ok) {
    dispatch({ type: 'SET_TRANSIENT_ERROR', error: result.error });
    return;
  }

  dispatch({ type: 'APPEND_REQUEST', request: result.request });
  if (result.skipped) {
    dispatch({ type: 'SET_TRANSIENT_WARNING', warning: 'Pasted request — some curl options were skipped' });
  } else {
    dispatch({ type: 'SET_TRANSIENT_MESSAGE', message: 'Pasted request' });
  }
}
