import React from 'react';
import { Spinner } from '@inkjs/ui';
import { Box, Text, useStdout } from 'ink';

import { formatResponseBody } from "../core/formatter";
import { computeResponseLayout } from '../core/responseLayout';
import type { RequestError, ResponseData, WrapMode } from '../core/types';
import { DEFAULT_TERMINAL_COLUMNS, getResponseContentWidth } from '../utils/layout';
import { RESPONSE_PANEL_VERTICAL_CHROME } from '../utils/scroll';
import { truncateText } from '../utils/text';
import type { ColorSegment } from '../utils/wrap';

interface ResponseViewProps {
  response: ResponseData | null;
  error: RequestError | null;
  isLoading: boolean;
  verbose: boolean;
  focused: boolean;
  scrollOffset: number;
  horizontalOffset: number;
  wrapMode: WrapMode;
  rawMode: boolean;
  availableHeight: number;
  searchMatches: number[];
  currentMatchIndex: number;
  isSearchMode: boolean;
  lastSearchQuery: string;
  searchQuery: string;
}

type LineTransform =
  | { kind: 'pass' }
  | { kind: 'truncate'; maxWidth: number }
  | { kind: 'shift'; offset: number; maxWidth: number };

function flattenSegmentText(segments: ColorSegment[]): string {
  let text = '';
  for (const segment of segments) {
    text += segment.text;
  }
  return text;
}

function shiftAndTruncate(segments: ColorSegment[], offset: number, maxWidth: number): string {
  const flat = flattenSegmentText(segments);
  if (offset <= 0) {
    return flat;
  }
  const shifted = flat.slice(offset);
  return shifted === '' ? ' ' : truncateText(shifted, maxWidth);
}

function truncateSegments(segments: ColorSegment[], maxWidth: number): ColorSegment[] {
  const flat = flattenSegmentText(segments);
  if (flat.length <= maxWidth) {
    return segments;
  }
  const truncated = truncateText(flat, maxWidth);
  return [{ text: truncated, color: segments[0]?.color ?? 'white' }];
}

function renderVisualLine(
  segments: ColorSegment[],
  transform: LineTransform,
  key: string,
): React.ReactElement {
  if (transform.kind === 'shift') {
    const displayText = shiftAndTruncate(segments, transform.offset, transform.maxWidth);
    return <Text key={key}>{displayText}</Text>;
  }

  const finalSegments = transform.kind === 'truncate'
    ? truncateSegments(segments, transform.maxWidth)
    : segments;

  if (finalSegments.length === 0) {
    return <Text key={key}>{' '}</Text>;
  }

  if (finalSegments.length === 1) {
    return <Text key={key} color={finalSegments[0].color}>{finalSegments[0].text}</Text>;
  }

  return (
    <Text key={key}>
      {finalSegments.map((segment, index) => (
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
  horizontalOffset,
  wrapMode,
  rawMode,
  availableHeight,
  searchMatches,
  currentMatchIndex,
  isSearchMode,
  lastSearchQuery,
  searchQuery,
}: ResponseViewProps): React.ReactElement {
  const { stdout } = useStdout();
  const columns = stdout.columns || DEFAULT_TERMINAL_COLUMNS;
  const contentWidth = getResponseContentWidth(columns);
  const showSearchBar = isSearchMode || (lastSearchQuery !== '' && searchMatches.length >= 0 && lastSearchQuery.length > 0);
  const searchBarHeight = showSearchBar ? 1 : 0;
  const visibleHeight = Math.max(1, availableHeight - RESPONSE_PANEL_VERTICAL_CHROME - searchBarHeight);

  let content: React.ReactNode;

  if (isLoading) {
    content = <Spinner label="Sending request" />;
  } else if (error) {
    const label = error.code ? `${error.message} (${error.code})` : error.message;
    content = <Text color="red">{label}</Text>;
  } else if (!response) {
    content = <Text color="gray">Press Enter to send a request</Text>;
  } else {
    const formattedBody = formatResponseBody(response.body, rawMode);
    const layout = computeResponseLayout({
      response,
      verbose,
      rawMode,
      wrapMode,
      contentWidth,
      formattedBody,
    });

    const transform: LineTransform =
      wrapMode === 'wrap'
        ? { kind: 'pass' }
        : horizontalOffset > 0
          ? { kind: 'shift', offset: horizontalOffset, maxWidth: contentWidth }
          : { kind: 'truncate', maxWidth: contentWidth };

    const responseLines: React.ReactElement[] = [];
    let visualIndex = 0;
    for (const section of layout.sections) {
      for (let i = 0; i < section.visualLines.length; i += 1) {
        const key = `vl-${visualIndex}`;
        responseLines.push(renderVisualLine(section.visualLines[i], transform, key));
        visualIndex += 1;
      }
    }

    const currentMatchVisualIndex = searchMatches.length > 0
      ? layout.bodyVisualStart[searchMatches[currentMatchIndex]]
      : -1;
    const matchVisualIndices = new Set(searchMatches.map((i) => layout.bodyVisualStart[i]));

    const sliced = responseLines.slice(scrollOffset, scrollOffset + visibleHeight);
    content = sliced.map((line, sliceIndex) => {
      const absoluteVisualIndex = scrollOffset + sliceIndex;
      if (matchVisualIndices.has(absoluteVisualIndex)) {
        const isCurrent = absoluteVisualIndex === currentMatchVisualIndex;
        return (
          <Box key={`search-${absoluteVisualIndex}`} flexDirection="row">
            <Text color={isCurrent ? 'cyanBright' : 'gray'}>{isCurrent ? '►' : '·'}</Text>
            {line}
          </Box>
        );
      }
      return line;
    });
  }

  let searchBar: React.ReactNode = null;
  if (isSearchMode) {
    searchBar = (
      <Text color="cyanBright">
        /{searchQuery}<Text color="white" bold>_</Text>
        <Text color="gray">  (Esc to cancel)</Text>
      </Text>
    );
  } else if (lastSearchQuery) {
    const matchInfo = searchMatches.length > 0
      ? `[${currentMatchIndex + 1}/${searchMatches.length}]`
      : '[No matches]';
    searchBar = (
      <Text>
        <Text color="gray">/{lastSearchQuery}</Text>
        <Text color={searchMatches.length > 0 ? 'cyanBright' : 'yellow'}> {matchInfo}</Text>
        <Text color="gray">  (Esc to dismiss)</Text>
      </Text>
    );
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
        {rawMode && wrapMode === 'wrap' ? 'Response [raw] [wrap]' : rawMode ? 'Response [raw]' : wrapMode === 'wrap' ? 'Response [wrap]' : 'Response'}
      </Text>
      <Box flexGrow={1} flexDirection="column">
        {content}
      </Box>
      {searchBar}
    </Box>
  );
}
