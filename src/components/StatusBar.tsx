import { basename } from 'node:path';

import React from 'react';
import { Box, Text, useStdout } from 'ink';

import { SHORTCUTS } from '../core/shortcuts';
import type { FocusedPanel } from '../core/types';
import { DEFAULT_TERMINAL_COLUMNS } from '../utils/layout';
import { truncateText } from '../utils/text';

interface StatusBarProps {
  filePath: string;
  requestCount: number;
  selectedIndex: number;
  insecure: boolean;
  transientMessage: string | null;
  transientError: string | null;
  transientWarning: string | null;
  focusedPanel: FocusedPanel;
  detailsScrollOffset: number;
  detailsTotalLines: number;
  responseScrollOffset: number;
  responseTotalLines: number;
  hasResponse: boolean;
  envName: string | null;
  isDirty: boolean;
}

function getStatusText(props: StatusBarProps): string {
  const fileName = basename(props.filePath);
  const prefix = props.isDirty ? '*' : '';
  const displayName = `${prefix}${fileName}`;

  switch (props.focusedPanel) {
    case 'requests': {
      return `${displayName} | ${props.selectedIndex + 1}/${props.requestCount}`;
    }
    case 'details': {
      return `${displayName} | ↕ ${props.detailsScrollOffset + 1}/${props.detailsTotalLines} lines`;
    }
    case 'response': {
      if (!props.hasResponse) {
        return displayName;
      }
      return `${displayName} | ↕ ${props.responseScrollOffset + 1}/${props.responseTotalLines} lines`;
    }
    default: {
      return displayName;
    }
  }
}

const LABEL_SUFFIX = '  ';
const INSECURE_LABEL = 'INSECURE';

function labelWidth(text: string | null): number {
  return text ? text.length + LABEL_SUFFIX.length : 0;
}

export function StatusBar({
  filePath,
  requestCount,
  selectedIndex,
  insecure,
  transientMessage,
  transientError,
  transientWarning,
  focusedPanel,
  detailsScrollOffset,
  detailsTotalLines,
  responseScrollOffset,
  responseTotalLines,
  hasResponse,
  envName,
  isDirty,
}: StatusBarProps): React.ReactElement {
  const { stdout } = useStdout();
  const columns = stdout.columns || DEFAULT_TERMINAL_COLUMNS;
  const barShortcuts = SHORTCUTS.filter((s) => s.showInBar);
  const leftText = barShortcuts.map((s) => `[${s.key}] ${s.label}`).join('  ');
  const rightText = getStatusText({
    filePath,
    requestCount,
    selectedIndex,
    insecure,
    transientMessage,
    transientError,
    transientWarning,
    focusedPanel,
    detailsScrollOffset,
    detailsTotalLines,
    responseScrollOffset,
    responseTotalLines,
    hasResponse,
    envName,
    isDirty,
  });
  const reloadLabelWidth =
    labelWidth(transientMessage) + labelWidth(transientError) + labelWidth(transientWarning);
  const envNameLabelWidth = labelWidth(envName);
  const insecureLabelWidth = labelWidth(insecure ? INSECURE_LABEL : null);
  const availableLeftWidth = Math.max(
    0,
    columns - rightText.length - reloadLabelWidth - envNameLabelWidth - insecureLabelWidth - 1,
  );

  return (
    <Box width="100%" justifyContent="space-between">
      <Text color="gray">{truncateText(leftText, availableLeftWidth)}</Text>
      <Box>
        {transientMessage ? (
          <Text key="reload-message" color="green" bold>{transientMessage + LABEL_SUFFIX}</Text>
        ) : null}
        {transientError ? <Text key="error-message" color="red" bold>{transientError + LABEL_SUFFIX}</Text> : null}
        {transientWarning ? (
          <Text key="warning-message" color="yellow" bold>{transientWarning + LABEL_SUFFIX}</Text>
        ) : null}
        {envName ? <Text key="env-name" color="magenta" bold>{envName + LABEL_SUFFIX}</Text> : null}
        {insecure ? <Text key="insecure" color="yellow" bold>{INSECURE_LABEL + LABEL_SUFFIX}</Text> : null}
        <Text key="status-text" color="gray">{rightText}</Text>
      </Box>
    </Box>
  );
}
