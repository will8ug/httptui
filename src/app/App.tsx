import { basename, dirname } from 'node:path';

import React, { useEffect, useReducer, useRef } from 'react';
import { useApp, useInput, useStdout } from 'ink';

import { FileLoadOverlay } from '../components/FileLoadOverlay';
import { HelpOverlay } from '../components/HelpOverlay';
import { SaveOverlay } from '../components/SaveOverlay';
import { EditOverlay } from '../components/EditOverlay';
import { ConfirmDiscardOverlay } from '../components/ConfirmDiscardOverlay';
import { ConfirmInPlaceSaveOverlay } from '../components/ConfirmInPlaceSaveOverlay';
import { Layout } from '../components/Layout';
import { RequestList } from '../components/RequestList';
import { RequestDetailsView } from '../components/RequestDetailsView';
import { ResponseView } from '../components/ResponseView';
import { StatusBar } from '../components/StatusBar';
import { EnvSelectOverlay } from '../components/EnvSelectOverlay';
import { createInitialState, reducer } from '../core/reducer';
import type { AppProps } from '../core/types';
import { EDIT_TAB_ORDER } from '../core/types';
import { DEFAULT_TERMINAL_COLUMNS, DEFAULT_TERMINAL_ROWS } from '../utils/layout';
import { computeLayoutMetrics } from '../utils/layout-metrics';
import { TRANSIENT_CLEAR_MS } from '../utils/timing';
import { hasUnsavedChanges } from '../utils/request';
import { getResponseTotalLines } from '../utils/scroll';
import { handleConfirmDiscardInput, handleConfirmInPlaceSaveInput, handleEditInput, handleEnvSelectInput, handleFileLoadInput, handleHelpInput, handleNormalInput, handleResponseSaveInput, handleSaveInput, handleSearchInput } from './input-handlers';

export function App(props: AppProps): React.ReactElement {
  const { exit, suspendTerminal } = useApp();
  const { stdout } = useStdout();
  const [state, dispatch] = useReducer(reducer, props, createInitialState);
  const abortControllerRef = useRef<AbortController | null>(null);

  const rows = stdout.rows || DEFAULT_TERMINAL_ROWS;
  const columns = stdout.columns || DEFAULT_TERMINAL_COLUMNS;
  const selectedRequest = state.requests[state.selectedIndex];
  const {
    detailsTotalLines,
    responseAvailableHeight,
    fullscreenContentWidth,
    fullscreenRequestContentWidth,
    fullscreenVisibleHeight,
    editorContentWidth,
    editorVisibleHeight,
    effectiveResponseHeight,
    effectiveDetailMaxContent,
  } = computeLayoutMetrics(state, selectedRequest, rows, columns);

  useEffect(() => {
    if (state.transientMessage === null && state.transientError === null && state.transientWarning === null) {
      return;
    }
    const timer = setTimeout(() => { dispatch({ type: 'CLEAR_TRANSIENT_MESSAGE' }); }, TRANSIENT_CLEAR_MS);
    return () => { clearTimeout(timer); };
  }, [state.transientMessage, state.transientError, state.transientWarning]);

  useInput((input, key) => {
    if (state.showHelp) {
      handleHelpInput({ input, key, dispatch });
      return;
    }

    if (state.mode === 'fileLoad') {
      handleFileLoadInput({ state, input, key, executorConfig: props.executorConfig, dispatch });
      return;
    }

    if (state.mode === 'search') {
      handleSearchInput({ state, columns, effectiveResponseHeight, effectiveDetailMaxContent, input, key, dispatch });
      return;
    }

    if (state.mode === 'envSelect') {
      handleEnvSelectInput({ state, input, key, dispatch });
      return;
    }

    if (state.mode === 'saveLoad') {
      handleSaveInput({ state, input, key, dispatch });
      return;
    }

    if (state.mode === 'responseSave') {
      handleResponseSaveInput({ state, input, key, dispatch });
      return;
    }

    if (state.mode === 'edit') {
      handleEditInput({ state, selectedRequest, editorVisibleHeight, editorContentWidth, input, key, dispatch });
      return;
    }

    if (state.mode === 'confirmDiscard') {
      handleConfirmDiscardInput({ state, exit, suspend: suspendTerminal, input, key, dispatch });
      return;
    }

    if (state.mode === 'confirmInPlaceSave') {
      handleConfirmInPlaceSaveInput({ state, input, key, dispatch });
      return;
    }

    handleNormalInput({
      state,
      selectedRequest,
      columns,
      rows,
      effectiveResponseHeight,
      effectiveDetailMaxContent,
      editorVisibleHeight,
      editorContentWidth,
      exit,
      suspend: suspendTerminal,
      executorConfig: props.executorConfig,
      clipboardRunner: props.clipboardRunner,
      clipboardReadRunner: props.clipboardReadRunner,
      abortControllerRef,
      input,
      key,
      dispatch,
    });
  });

return (
    <Layout
      left={
        <RequestList
          requests={state.requests}
          selectedIndex={state.selectedIndex}
          focused={state.focusedPanel === 'requests' || state.maximizedPanel === 'requests'}
          scrollOffset={state.requestScrollOffset}
          horizontalOffset={state.requestHorizontalOffset}
          // Recomputed by SWITCH_ENV/RELOAD_FILE/LOAD_FILE via mergeVariables — free env reactivity.
          variables={state.variables}
          baseDir={dirname(state.filePath)}
          contentWidthOverride={state.maximizedPanel === 'requests' ? fullscreenRequestContentWidth : undefined}
          visibleHeightOverride={state.maximizedPanel === 'requests' ? fullscreenVisibleHeight : undefined}
        />
      }
      right={
        <ResponseView
          response={state.response}
          error={state.requestError}
          isLoading={state.isLoading}
          verbose={state.verbose}
          focused={state.focusedPanel === 'response' || state.maximizedPanel === 'response'}
          scrollOffset={state.responseScrollOffset}
          horizontalOffset={state.responseHorizontalOffset}
          wrapMode={state.wrapMode}
          rawMode={state.rawMode}
          availableHeight={state.maximizedPanel === 'response' ? effectiveResponseHeight : responseAvailableHeight}
          searchMatches={state.searchMatches}
          currentMatchIndex={state.currentMatchIndex}
          isSearchMode={state.mode === 'search'}
          lastSearchQuery={state.lastSearchQuery}
          searchQuery={state.searchQuery}
          contentWidthOverride={state.maximizedPanel === 'response' ? fullscreenContentWidth : undefined}
        />
      }
      bottom={
        <StatusBar
          filePath={state.filePath}
          requestCount={state.requests.length}
          selectedIndex={state.selectedIndex}
          insecure={state.insecure}
          transientMessage={state.transientMessage}
          transientError={state.transientError}
          transientWarning={state.transientWarning}
          focusedPanel={state.focusedPanel}
          detailsScrollOffset={state.detailsScrollOffset}
          detailsTotalLines={detailsTotalLines}
          responseScrollOffset={state.responseScrollOffset}
          responseTotalLines={state.response ? getResponseTotalLines({
            response: state.response,
            verbose: state.verbose,
            rawMode: state.rawMode,
            wrapMode: state.wrapMode,
            columns,
          }) : 0}
          hasResponse={!!state.response}
          envName={state.activeEnvName}
          isDirty={hasUnsavedChanges(state.requests)}
        />
      }
      overlay={
        state.showHelp ? <HelpOverlay visible={state.showHelp} /> :
        state.mode === 'fileLoad' ? <FileLoadOverlay value={state.fileLoadInput} cursor={state.fileLoadCursor} error={state.fileLoadError} completions={state.fileLoadCompletions} /> :
        state.mode === 'saveLoad' ? <SaveOverlay value={state.saveInput} cursor={state.saveCursor} error={state.saveError} /> :
        state.mode === 'responseSave' ? <SaveOverlay title="Save response" value={state.responseSaveInput} cursor={state.responseSaveCursor} error={state.responseSaveError} /> :
        state.mode === 'envSelect' ? <EnvSelectOverlay options={state.availableEnvironments} selectedIndex={state.envSelectIndex} scrollOffset={state.envSelectScrollOffset} activeEnvName={state.activeEnvName} error={state.envSelectError} /> :
        state.mode === 'edit' ? <EditOverlay title="Edit Request" tabs={EDIT_TAB_ORDER} activeTab={state.editTarget} buffer={state.editBuffers[state.editTarget].text} cursor={state.editBuffers[state.editTarget].cursor} scrollOffset={state.editScrollOffset} horizontalOffset={state.editHorizontalOffset} visibleHeight={editorVisibleHeight} contentWidth={editorContentWidth} /> :
        state.mode === 'confirmDiscard' && state.pendingDiscardAction !== null ? <ConfirmDiscardOverlay pendingAction={state.pendingDiscardAction} /> :
        state.mode === 'confirmInPlaceSave' ? <ConfirmInPlaceSaveOverlay fileName={basename(state.filePath)} markedCount={state.requests.filter(r => r.isDirty).length} /> :
        undefined
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for out-of-bounds access
      detailPanel={state.showRequestDetails && selectedRequest ? (
        <RequestDetailsView
          request={selectedRequest}
          variables={state.variables}
          maxHeight={effectiveDetailMaxContent}
          focused={state.focusedPanel === 'details' || state.maximizedPanel === 'details'}
          scrollOffset={state.detailsScrollOffset}
          horizontalOffset={state.detailsHorizontalOffset}
          contentWidthOverride={state.maximizedPanel === 'details' ? fullscreenContentWidth : undefined}
        />
      ) : undefined}
      maximizedPanel={state.maximizedPanel}
    />
  );
}