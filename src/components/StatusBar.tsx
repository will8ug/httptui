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

export function StatusBar({
  filePath,
  requestCount,
  selectedIndex,
  insecure,
  transientMessage,
  transientError,
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
    focusedPanel,
    detailsScrollOffset,
    detailsTotalLines,
    responseScrollOffset,
    responseTotalLines,
    hasResponse,
    envName,
    isDirty,
  });
  const reloadLabelWidth = transientMessage ? transientMessage.length + 2 : transientError ? transientError.length + 2 : 0;
  const envNameLabelWidth = envName ? envName.length + 2 : 0;
  const insecureLabelWidth = insecure ? 10 : 0;
  const availableLeftWidth = Math.max(0, columns - rightText.length - reloadLabelWidth - envNameLabelWidth - insecureLabelWidth - 1);

  return (
    <Box width="100%" justifyContent="space-between">
      <Text color="gray">{truncateText(leftText, availableLeftWidth)}</Text>
      <Box>
        {transientMessage ? <Text key="reload-message" color="green" bold>{transientMessage}  </Text> : null}
        {transientError ? <Text key="error-message" color="red" bold>{transientError}  </Text> : null}
        {envName ? <Text key="env-name" color="magenta" bold>{envName}  </Text> : null}
        {insecure ? <Text key="insecure" color="yellow" bold>INSECURE  </Text> : null}
        <Text key="status-text" color="gray">{rightText}</Text>
      </Box>
    </Box>
  );
}
