import React from 'react';
import { Box, Text, useStdout } from 'ink';

import type { FileVariable, ParsedRequest } from '../core/types';
import { resolveRequestDetails } from '../utils/request';
import { getMethodColor } from '../utils/colors';
import { DEFAULT_TERMINAL_COLUMNS, getResponseContentWidth } from '../utils/layout';
import { shiftText, truncateText } from '../utils/text';

interface RequestDetailsViewProps {
  request: ParsedRequest;
  variables: FileVariable[];
  maxHeight: number;
  focused: boolean;
  scrollOffset: number;
  horizontalOffset: number;
  contentWidthOverride?: number;
}

export function RequestDetailsView({
  request,
  variables,
  maxHeight,
  focused,
  scrollOffset,
  horizontalOffset,
  contentWidthOverride,
}: RequestDetailsViewProps): React.ReactElement {
  const { stdout } = useStdout();
  const columns = stdout.columns || DEFAULT_TERMINAL_COLUMNS;
  const contentWidth = contentWidthOverride ?? getResponseContentWidth(columns);

  const resolved = resolveRequestDetails(request, variables);
  const headerEntries = Object.entries(resolved.headers);
  const bodyLines = resolved.body !== undefined ? resolved.body.split('\n') : [];

  const allLines: React.ReactNode[] = [];

  allLines.push(
    <Text key="title" color={focused ? 'cyanBright' : 'gray'} bold>
      Request Details
    </Text>,
  );

  const requestLineText = `${resolved.method} ${resolved.url}`;
  if (horizontalOffset > 0) {
    allLines.push(
      <Text key="request-line">{shiftText(requestLineText, horizontalOffset, contentWidth)}</Text>,
    );
  } else {
    const availableUrlWidth = Math.max(0, contentWidth - resolved.method.length - 1);
    allLines.push(
      <Text key="request-line">
        <Text color={getMethodColor(resolved.method)} bold>{resolved.method}</Text>
        <Text> </Text>
        <Text color="white">{truncateText(resolved.url, availableUrlWidth)}</Text>
      </Text>,
    );
  }

  allLines.push(
    <Text key="separator-request" color="gray">{truncateText('─'.repeat(40), contentWidth)}</Text>,
  );

  if (headerEntries.length > 0) {
    for (const [name, value] of headerEntries) {
      const headerText = `${name}: ${value}`;
      if (horizontalOffset > 0) {
        allLines.push(
          <Text key={`header-${name}`}>{shiftText(headerText, horizontalOffset, contentWidth)}</Text>,
        );
      } else {
        const availableValueWidth = Math.max(0, contentWidth - name.length - 2);
        allLines.push(
          <Text key={`header-${name}`}>
            <Text color="cyan">{name}</Text>
            <Text color="gray">: </Text>
            <Text color="gray">{truncateText(value, availableValueWidth)}</Text>
          </Text>,
        );
      }
    }

    allLines.push(
      <Text key="separator-headers" color="gray">{truncateText('─'.repeat(40), contentWidth)}</Text>,
    );
  }

  if (resolved.formdataFields && resolved.formdataFields.length > 0) {
    for (const field of resolved.formdataFields) {
      const fieldText = `${field.key}=${field.value}`;
      if (horizontalOffset > 0) {
        allLines.push(
          <Text key={`formdata-${field.key}`}>{shiftText(fieldText, horizontalOffset, contentWidth)}</Text>,
        );
      } else {
        const availableValueWidth = Math.max(0, contentWidth - field.key.length - 1);
        allLines.push(
          <Text key={`formdata-${field.key}`}>
            <Text color="cyan">{field.key}</Text>
            <Text color="gray">=</Text>
            <Text color="gray">{truncateText(field.value, availableValueWidth)}</Text>
          </Text>,
        );
      }
    }

    if (bodyLines.length > 0) {
      allLines.push(
        <Text key="separator-formdata" color="gray">{truncateText('─'.repeat(40), contentWidth)}</Text>,
      );
    }
  }

  for (let i = 0; i < bodyLines.length; i += 1) {
    allLines.push(
      <Text key={`body-${i}`}>{shiftText(bodyLines[i] || ' ', horizontalOffset, contentWidth)}</Text>,
    );
  }

  const totalLines = allLines.length;
  const visibleHeight = maxHeight;
  const visibleLines = allLines.slice(scrollOffset, scrollOffset + visibleHeight);

  return (
    <Box
      borderStyle="round"
      borderColor={focused ? 'cyanBright' : 'gray'}
      flexDirection="column"
      paddingX={1}
      width="100%"
    >
      <Box flexDirection="column">
        {visibleLines}
      </Box>
    </Box>
  );
}
