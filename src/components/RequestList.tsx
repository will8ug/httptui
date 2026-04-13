import React from 'react';
import { Box, Text, useStdout } from 'ink';

import type { ParsedRequest } from '../core/types';
import { getMethodColor } from '../utils/colors';

interface RequestListProps {
  requests: ParsedRequest[];
  selectedIndex: number;
  focused: boolean;
  scrollOffset: number;
  horizontalOffset: number;
}

function getLeftPanelWidth(columns: number): number {
  const proportionalWidth = Math.floor(columns * 0.3);
  return Math.max(25, Math.min(proportionalWidth, 36));
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

function getRequestTarget(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const target = `${parsedUrl.pathname || '/'}${parsedUrl.search}`;
    return target === '' ? '/' : target;
  } catch {
    return url;
  }
}

export function RequestList({
  requests,
  selectedIndex,
  focused,
  scrollOffset,
  horizontalOffset,
}: RequestListProps): React.ReactElement {
  const { stdout } = useStdout();
  const panelWidth = getLeftPanelWidth(stdout.columns || 80);
  const contentWidth = Math.max(10, panelWidth - 4);
  const visibleHeight = Math.max(1, (stdout.rows || 24) - 5);
  const visibleRequests = requests.slice(scrollOffset, scrollOffset + visibleHeight);

  return (
    <Box
      borderStyle="round"
      borderColor={focused ? 'cyanBright' : 'gray'}
      flexDirection="column"
      paddingX={1}
      width="100%"
      height="100%"
    >
      <Text color={focused ? 'cyanBright' : 'gray'} bold>
        Requests
      </Text>
      {visibleRequests.map((request, index) => {
        const actualIndex = scrollOffset + index;
        const isSelected = actualIndex === selectedIndex;
        const prefix = isSelected ? '▸ ' : '  ';
        const methodLabel = request.method.padEnd(7, ' ');
        const target = getRequestTarget(request.url);

        if (horizontalOffset > 0) {
          const fullLine = `${prefix}${methodLabel}${target}`;
          const shiftedLine = fullLine.slice(horizontalOffset);
          const displayLine = shiftedLine === '' ? ' ' : truncateText(shiftedLine, contentWidth);

          return (
            <Text key={`${request.lineNumber}-${request.method}-${request.url}`} bold={isSelected}>
              <Text color={isSelected ? 'cyanBright' : 'white'}>{displayLine}</Text>
            </Text>
          );
        }

        const availableTargetWidth = Math.max(4, contentWidth - prefix.length - methodLabel.length - 1);

        return (
          <Text key={`${request.lineNumber}-${request.method}-${request.url}`} bold={isSelected}>
            <Text color={isSelected ? 'cyanBright' : 'white'}>{prefix}</Text>
            <Text color={getMethodColor(request.method)}>{methodLabel}</Text>
            <Text color={isSelected ? 'whiteBright' : 'gray'}>
              {truncateText(target, availableTargetWidth)}
            </Text>
          </Text>
        );
      })}
    </Box>
  );
}
