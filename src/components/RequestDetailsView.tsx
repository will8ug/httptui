import React from 'react';
import { Box, Text } from 'ink';

import type { FileVariable, ParsedRequest } from '../core/types';
import { resolveVariables } from '../core/variables';
import { getMethodColor } from '../utils/colors';

interface RequestDetailsViewProps {
  request: ParsedRequest;
  variables: FileVariable[];
  maxHeight: number;
}

export function RequestDetailsView({
  request,
  variables,
  maxHeight,
}: RequestDetailsViewProps): React.ReactElement {
  const resolved = resolveVariables(request, variables);
  const headerEntries = Object.entries(resolved.headers);
  const bodyLines = resolved.body !== undefined ? resolved.body.split('\n') : [];

  const FIXED_LINE_COUNT = 3;
  const HEADER_SEPARATOR_COUNT = headerEntries.length > 0 ? 1 : 0;
  const availableForContent = maxHeight - FIXED_LINE_COUNT - HEADER_SEPARATOR_COUNT;

  let remainingLines = availableForContent;
  const lines: React.ReactNode[] = [];

  lines.push(
    <Text key="title" color="cyanBright" bold>
      Request Details
    </Text>,
  );

  lines.push(
    <Text key="request-line">
      <Text color={getMethodColor(resolved.method)} bold>{resolved.method}</Text>
      <Text> </Text>
      <Text color="white">{resolved.url}</Text>
    </Text>,
  );

  lines.push(
    <Text key="separator-request" color="gray">{'─'.repeat(40)}</Text>,
  );

  if (headerEntries.length > 0 && remainingLines > 0) {
    const headersToShow = Math.min(headerEntries.length, remainingLines);
    for (let i = 0; i < headersToShow; i += 1) {
      const [name, value] = headerEntries[i];
      lines.push(
        <Text key={`header-${name}`}>
          <Text color="cyan">{name}</Text>
          <Text color="gray">: </Text>
          <Text color="gray">{value}</Text>
        </Text>,
      );
    }
    remainingLines -= headersToShow;

    if (remainingLines > 0) {
      lines.push(
        <Text key="separator-headers" color="gray">{'─'.repeat(40)}</Text>,
      );
      remainingLines -= 1;
    }
  }

  if (bodyLines.length > 0 && remainingLines > 0) {
    const bodyToShow = Math.min(bodyLines.length, remainingLines);
    for (let i = 0; i < bodyToShow; i += 1) {
      lines.push(
        <Text key={`body-${i}`}>{bodyLines[i] || ' '}</Text>,
      );
    }

    if (bodyLines.length > bodyToShow) {
      lines[lines.length - 1] = (
        <Text key="body-truncated" color="gray">
          … ({bodyLines.length - bodyToShow} more lines)
        </Text>,
      );
    }
  }

  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      flexDirection="column"
      paddingX={1}
      width="100%"
    >
      {lines}
    </Box>
  );
}