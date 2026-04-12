import React from 'react';
import { Spinner } from '@inkjs/ui';
import { Box, Text, useStdout } from 'ink';

import type { RequestError, ResponseData } from '../core/types';
import { colorizeJson, getStatusColor } from '../utils/colors';

interface ResponseViewProps {
  response: ResponseData | null;
  error: RequestError | null;
  isLoading: boolean;
  verbose: boolean;
  focused: boolean;
  scrollOffset: number;
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

function isJson(value: string): boolean {
  if (value.trim() === '') {
    return false;
  }

  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

function renderJsonLine(line: string, key: string): React.ReactElement {
  const segments = colorizeJson(line);

  if (segments.length === 0) {
    return <Text key={key}>{' '}</Text>;
  }

  return (
    <Text key={key}>
      {segments.map((segment, index) => (
        <Text key={`${key}-${index}`} color={segment.color}>
          {segment.text}
        </Text>
      ))}
    </Text>
  );
}

export function ResponseView({
  response,
  error,
  isLoading,
  verbose,
  focused,
  scrollOffset,
}: ResponseViewProps): React.ReactElement {
  const { stdout } = useStdout();
  const columns = stdout.columns || 80;
  const rows = stdout.rows || 24;
  const leftPanelWidth = getLeftPanelWidth(columns);
  const contentWidth = Math.max(20, columns - leftPanelWidth - 6);
  const visibleHeight = Math.max(1, rows - 5);

  let content: React.ReactNode;

  if (isLoading) {
    content = <Spinner label="Sending request" />;
  } else if (error) {
    const label = error.code ? `${error.message} (${error.code})` : error.message;
    content = <Text color="red">{label}</Text>;
  } else if (!response) {
    content = <Text color="gray">Press Enter to send a request</Text>;
  } else {
    const responseBody = response.body;
    const isJsonBody = isJson(responseBody);
    const responseLines: React.ReactNode[] = [];

    responseLines.push(
      <Text key="status">
        <Text color="gray">HTTP/1.1 </Text>
        <Text color={getStatusColor(response.statusCode)}>
          {response.statusCode} {response.statusText}
        </Text>
        <Text color="gray">  {Math.round(response.timing.durationMs)}ms</Text>
      </Text>,
    );

    if (verbose) {
      for (const [headerName, headerValue] of Object.entries(response.headers)) {
        responseLines.push(
          <Text key={`header-${headerName}`} color="gray">
            {truncateText(`${headerName}: ${headerValue}`, contentWidth)}
          </Text>,
        );
      }
    }

    responseLines.push(
      <Text key="separator" color="gray">
        {'─'.repeat(contentWidth)}
      </Text>,
    );

    const bodyLines = responseBody.split('\n');

    bodyLines.forEach((line, index) => {
      const displayLine = line === '' ? ' ' : truncateText(line, contentWidth);

      responseLines.push(
        isJsonBody
          ? renderJsonLine(displayLine, `body-${index}`)
          : (
            <Text key={`body-${index}`}>{displayLine}</Text>
          ),
      );
    });

    content = responseLines.slice(scrollOffset, scrollOffset + visibleHeight);
  }

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
        Response
      </Text>
      {content}
    </Box>
  );
}
