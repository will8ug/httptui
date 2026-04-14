import React from 'react';
import { Spinner } from '@inkjs/ui';
import { Box, Text, useStdout } from 'ink';

import type { RequestError, ResponseData, WrapMode } from '../core/types';
import { colorizeJson, getStatusColor } from '../utils/colors';
import { wrapLine, wrapColorizedSegments } from '../utils/wrap';

interface ResponseViewProps {
  response: ResponseData | null;
  error: RequestError | null;
  isLoading: boolean;
  verbose: boolean;
  focused: boolean;
  scrollOffset: number;
  horizontalOffset: number;
  wrapMode: WrapMode;
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

function shiftLine(line: string, offset: number, maxWidth: number): string {
  if (offset <= 0) {
    return line;
  }

  const shifted = line.slice(offset);

  return shifted === '' ? ' ' : truncateText(shifted, maxWidth);
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

function renderWrappedJsonLine(
  segments: Array<{ text: string; color: string }>,
  contentWidth: number,
  keyPrefix: string,
): React.ReactElement[] {
  const visualLines = wrapColorizedSegments(segments, contentWidth);

  return visualLines.map((lineSegments, lineIndex) => {
    const lineKey = `${keyPrefix}-w${lineIndex}`;

    if (lineSegments.length === 0) {
      return <Text key={lineKey}>{' '}</Text>;
    }

    return (
      <Text key={lineKey}>
        {lineSegments.map((segment, segIndex) => (
          <Text key={`${lineKey}-${segIndex}`} color={segment.color}>
            {segment.text}
          </Text>
        ))}
      </Text>
    );
  });
}

export function ResponseView({
  response,
  error,
  isLoading,
  verbose,
  focused,
  scrollOffset,
  horizontalOffset,
  wrapMode,
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

    if (wrapMode === 'wrap') {
      const statusText = `HTTP/1.1 ${response.statusCode} ${response.statusText}  ${Math.round(response.timing.durationMs)}ms`;

      if (statusText.length <= contentWidth) {
        responseLines.push(
          <Text key="status">
            <Text color="gray">HTTP/1.1 </Text>
            <Text color={getStatusColor(response.statusCode)}>
              {response.statusCode} {response.statusText}
            </Text>
            <Text color="gray">  {Math.round(response.timing.durationMs)}ms</Text>
          </Text>,
        );
      } else {
        const statusVisualLines = wrapLine(statusText, contentWidth);

        statusVisualLines.forEach((line, index) => {
          if (index === 0) {
            responseLines.push(
              <Text key={`status-w${index}`} color={getStatusColor(response.statusCode)}>
                {line}
              </Text>,
            );
          } else {
            responseLines.push(
              <Text key={`status-w${index}`} color={getStatusColor(response.statusCode)}>
                {line}
              </Text>,
            );
          }
        });
      }

      if (verbose) {
        for (const [headerName, headerValue] of Object.entries(response.headers)) {
          const headerLine = `${headerName}: ${headerValue}`;
          const headerVisualLines = wrapLine(headerLine, contentWidth);

          headerVisualLines.forEach((line, index) => {
            responseLines.push(
              <Text key={`header-${headerName}-w${index}`} color="gray">
                {line}
              </Text>,
            );
          });
        }
      }

      responseLines.push(
        <Text key="separator" color="gray">
          {'─'.repeat(contentWidth)}
        </Text>,
      );

      const bodyLines = responseBody.split('\n');

      bodyLines.forEach((line, index) => {
        if (isJsonBody) {
          const segments = colorizeJson(line === '' ? ' ' : line);
          const wrappedLines = renderWrappedJsonLine(segments, contentWidth, `body-${index}`);
          for (const wrappedLine of wrappedLines) {
            responseLines.push(wrappedLine);
          }
        } else {
          const visualLines = wrapLine(line === '' ? ' ' : line, contentWidth);
          visualLines.forEach((visualLine, vIdx) => {
            responseLines.push(<Text key={`body-${index}-w${vIdx}`}>{visualLine}</Text>);
          });
        }
      });
    } else if (horizontalOffset > 0) {
      // Horizontal scroll: must flatten to plain text before shifting, losing per-segment colors
      const statusText = `HTTP/1.1 ${response.statusCode} ${response.statusText}  ${Math.round(response.timing.durationMs)}ms`;
      responseLines.push(
        <Text key="status" color={getStatusColor(response.statusCode)}>
          {shiftLine(statusText, horizontalOffset, contentWidth)}
        </Text>,
      );

      if (verbose) {
        for (const [headerName, headerValue] of Object.entries(response.headers)) {
          const headerLine = `${headerName}: ${headerValue}`;
          responseLines.push(
            <Text key={`header-${headerName}`} color="gray">
              {shiftLine(truncateText(headerLine, contentWidth + horizontalOffset), horizontalOffset, contentWidth)}
            </Text>,
          );
        }
      }

      responseLines.push(
        <Text key="separator" color="gray">
          {shiftLine('─'.repeat(contentWidth + horizontalOffset), horizontalOffset, contentWidth)}
        </Text>,
      );

      const bodyLines = responseBody.split('\n');

      bodyLines.forEach((line, index) => {
        const displayLine = shiftLine(line === '' ? ' ' : line, horizontalOffset, contentWidth);
        responseLines.push(<Text key={`body-${index}`}>{displayLine}</Text>);
      });
    } else {
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
    }

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
        {wrapMode === 'wrap' ? 'Response [wrap]' : 'Response'}
      </Text>
      {content}
    </Box>
  );
}