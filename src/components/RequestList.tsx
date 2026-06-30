import React from 'react';
import { Box, Text, useStdout } from 'ink';

import type { FileVariable, ParsedRequest } from '../core/types';
import { resolveVariables } from '../core/variables';
import { getMethodColor } from '../utils/colors';
import { DEFAULT_TERMINAL_COLUMNS, DEFAULT_TERMINAL_ROWS, getRequestContentWidth, getRequestVisibleHeight } from '../utils/layout';
import { getRequestTarget } from '../utils/request';
import { truncateText } from '../utils/text';

interface RequestListProps {
  requests: ParsedRequest[];
  selectedIndex: number;
  focused: boolean;
  scrollOffset: number;
  horizontalOffset: number;
  variables: FileVariable[];
  baseDir?: string;
  contentWidthOverride?: number;
  visibleHeightOverride?: number;
}

export function RequestList({
  requests,
  selectedIndex,
  focused,
  scrollOffset,
  horizontalOffset,
  variables,
  baseDir,
  contentWidthOverride,
  visibleHeightOverride,
}: RequestListProps): React.ReactElement {
  const { stdout } = useStdout();
  const contentWidth = contentWidthOverride ?? getRequestContentWidth(stdout.columns || DEFAULT_TERMINAL_COLUMNS);
  const visibleHeight = visibleHeightOverride ?? getRequestVisibleHeight(stdout.rows || DEFAULT_TERMINAL_ROWS);
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
        const resolved = resolveVariables(request, variables, baseDir);
        const target = getRequestTarget(resolved.url);

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
