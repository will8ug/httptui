import { basename } from 'node:path';

import React from 'react';
import { Box, Text, useStdout } from 'ink';

import { SHORTCUTS } from '../core/shortcuts';

interface StatusBarProps {
  filePath: string;
  requestCount: number;
  selectedIndex: number;
  insecure: boolean;
  reloadMessage: string | null;
}

function truncateText(value: string, maxWidth: number): string {
  if (maxWidth <= 0) {
    return '';
  }

  if (value.length <= maxWidth) {
    return value;
  }

  if (maxWidth === 1) {
    return '…';
  }

  return `${value.slice(0, maxWidth - 1)}…`;
}

export function StatusBar({
  filePath,
  requestCount,
  selectedIndex,
  insecure,
  reloadMessage,
}: StatusBarProps): React.ReactElement {
  const { stdout } = useStdout();
  const columns = stdout.columns || 80;
  const barShortcuts = SHORTCUTS.filter((s) => s.showInBar);
  const leftText = barShortcuts.map((s) => `[${s.key}] ${s.label}`).join('  ');
  const rightText = `${basename(filePath)}  ${selectedIndex + 1}/${requestCount}`;
  const insecureLabelWidth = insecure ? 10 : 0;
  const reloadLabelWidth = reloadMessage ? reloadMessage.length + 2 : 0;
  const availableLeftWidth = Math.max(0, columns - rightText.length - insecureLabelWidth - reloadLabelWidth - 1);

  return (
    <Box width="100%" justifyContent="space-between">
      <Text color="gray">{truncateText(leftText, availableLeftWidth)}</Text>
      <Box>
        {reloadMessage ? <Text color="green" bold>{reloadMessage}  </Text> : null}
        {insecure ? <Text color="yellow" bold>INSECURE  </Text> : null}
        <Text color="gray">{rightText}</Text>
      </Box>
    </Box>
  );
}
