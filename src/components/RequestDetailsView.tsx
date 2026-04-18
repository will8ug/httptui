import React from 'react';
import { Box, Text } from 'ink';

import type { FileVariable, ParsedRequest } from '../core/types';
import { resolveVariables } from '../core/variables';
import { getMethodColor } from '../utils/colors';

interface RequestDetailsViewProps {
  request: ParsedRequest;
  variables: FileVariable[];
  maxHeight: number;
  focused: boolean;
  scrollOffset: number;
  horizontalOffset: number;
}

export function RequestDetailsView({
  request,
  variables,
  maxHeight,
  focused,
  scrollOffset,
  horizontalOffset,
}: RequestDetailsViewProps): React.ReactElement {
  const resolved = resolveVariables(request, variables);
  const headerEntries = Object.entries(resolved.headers);
  const bodyLines = resolved.body !== undefined ? resolved.body.split('\n') : [];

  const allLines: React.ReactNode[] = [];

  allLines.push(
    <Text key="title" color={focused ? 'cyanBright' : 'gray'} bold>
      Request Details
    </Text>,
  );

  allLines.push(
    <Text key="request-line">
      <Text color={getMethodColor(resolved.method)} bold>{resolved.method}</Text>
      <Text> </Text>
      <Text color="white">{resolved.url}</Text>
    </Text>,
  );

  allLines.push(
    <Text key="separator-request" color="gray">{'─'.repeat(40)}</Text>,
  );

  if (headerEntries.length > 0) {
    for (const [name, value] of headerEntries) {
      allLines.push(
        <Text key={`header-${name}`}>
          <Text color="cyan">{name}</Text>
          <Text color="gray">: </Text>
          <Text color="gray">{value}</Text>
        </Text>,
      );
    }

    allLines.push(
      <Text key="separator-headers" color="gray">{'─'.repeat(40)}</Text>,
    );
  }

  for (let i = 0; i < bodyLines.length; i += 1) {
    allLines.push(
      <Text key={`body-${i}`}>{bodyLines[i] || ' '}</Text>,
    );
  }

  const totalLines = allLines.length;
  const visibleHeight = maxHeight;
  const visibleLines = allLines.slice(scrollOffset, scrollOffset + visibleHeight);
  const hasOverflow = totalLines > visibleHeight;

  if (hasOverflow) {
    visibleLines.push(
      <Text key="scroll-indicator" color="gray" dimColor>
        ↕ {scrollOffset + 1}/{totalLines} lines
      </Text>,
    );
  }

  return (
    <Box
      borderStyle="round"
      borderColor={focused ? 'cyanBright' : 'gray'}
      flexDirection="column"
      paddingX={1}
      width="100%"
    >
      <Box flexDirection="column" marginLeft={horizontalOffset > 0 ? -horizontalOffset : 0}>
        {visibleLines}
      </Box>
    </Box>
  );
}
