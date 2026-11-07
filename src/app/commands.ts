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
import { parseCurlCommand } from '../core/importers/curl';
import { importContent } from '../core/importer';
import { resolveVariables } from '../core/variables';
import { ChunkCoalescer } from '../utils/chunk-coalescer';
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

  // One coalescer per send paces the appends. It carries only the raw text as
  // its windowing string; the display copy and byte count ride alongside in
  // unflushed.
  const unflushed = { raw: '', display: '', bytes: 0 };
  const coalescer = new ChunkCoalescer(() => {
    // A window can still fire between an Esc-cancel and the settled executor
    // rejecting; this is the same late-discard check the other callbacks use.
    if (controller.signal.aborted) {
      return;
    }
    dispatch({ type: 'APPEND_RESPONSE_BODY', chunk: { raw: unflushed.raw, display: unflushed.display, bytes: unflushed.bytes } });
    unflushed.raw = '';
    unflushed.display = '';
    unflushed.bytes = 0;
  });

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

    const result = await executeRequest(resolvedRequest, executorConfig, certConfig, controller.signal, {
      onHeaders: (response) => {
        if (controller.signal.aborted) {
          return;
        }
        dispatch({ type: 'RECEIVE_RESPONSE_HEADERS', response });
      },
      onChunk: (chunk) => {
        if (controller.signal.aborted) {
          return;
        }
        // Accumulating and pushing stay paired only because the executor never
        // emits an empty raw: an empty raw would accumulate without arming a
        // window, stranding its display text and bytes unflushed.
        unflushed.raw += chunk.raw;
        unflushed.display += chunk.display;
        unflushed.bytes += chunk.bytes;
        coalescer.push(chunk.raw);
      },
    });

    if (controller.signal.aborted) {
      coalescer.abort();
      return;
    }

    if (isErrorInfo(result)) {
      coalescer.abort();
      dispatch({ type: 'REQUEST_ERROR', error: result });
      return;
    }

    // complete() flushes anything still coalesced synchronously, so the tail
    // append lands before the response is replaced wholesale.
    coalescer.complete();
    dispatch({ type: 'RECEIVE_RESPONSE', response: result });
  } catch (error) {
    coalescer.abort();
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
    const outcome = importContent(filePath, content);

    if (!outcome.ok) {
      dispatch({ type: 'SET_TRANSIENT_ERROR', error: outcome.error });
      return;
    }

    if (outcome.requests.length === 0) {
      dispatch({ type: 'SET_TRANSIENT_MESSAGE', message: `No requests found in ${basename(filePath)}` });
      return;
    }

    dispatch({ type: 'RELOAD_FILE', requests: outcome.requests, variables: outcome.variables, format: outcome.format, warningCount: outcome.warnings.length });
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

  const outcome = parseCurlCommand(text);
  if (!outcome.ok) {
    dispatch({ type: 'SET_TRANSIENT_ERROR', error: outcome.error });
    return;
  }

  dispatch({ type: 'APPEND_REQUEST', request: outcome.requests[0] });
  if (outcome.warnings.length > 0) {
    dispatch({ type: 'SET_TRANSIENT_WARNING', warning: `Pasted request — ${outcome.warnings.join(', ')}` });
  } else {
    dispatch({ type: 'SET_TRANSIENT_MESSAGE', message: 'Pasted request' });
  }
}
