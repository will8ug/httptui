import React from 'react';
import { Spinner } from '@inkjs/ui';
import { Box, Text, useStdout } from 'ink';

import {
  computeResponseViewport,
  sliceVisibleLines,
} from '../core/response-viewport';
import type { ResponseViewportGeometry } from '../core/response-viewport';
import type { ErrorInfo, ResponseData, WrapMode } from '../core/types';
import { DEFAULT_TERMINAL_COLUMNS } from '../utils/layout';
import { cellWidth, clampSegmentsToWidth, shiftText, truncateText } from '../utils/text';
import type { ColorSegment } from '../utils/wrap';

interface SearchViewProps {
  query: string;
  cursor: number;
  matches: number[];
  currentMatchIndex: number;
  lastQuery: string;
  visible: boolean;
  isSearchMode: boolean;
}

interface ResponseViewProps {
  response: ResponseData | null;
  error: ErrorInfo | null;
  isLoading: boolean;
  verbose: boolean;
  focused: boolean;
  scrollOffset: number;
  horizontalOffset: number;
  wrapMode: WrapMode;
  rawMode: boolean;
  fullscreen: boolean;
  availableHeight: number;
  search: SearchViewProps;
}

type LineTransform =
  | { kind: 'pass' }
  | { kind: 'truncate' }
  | { kind: 'shift'; offset: number };

function flattenSegmentText(segments: ColorSegment[]): string {
  let text = '';
  for (const segment of segments) {
    text += segment.text;
  }
  return text;
}

function truncateSegments(segments: ColorSegment[], maxWidth: number): ColorSegment[] {
  const flat = flattenSegmentText(segments);
  if (cellWidth(flat) <= maxWidth) {
    return segments;
  }
  const truncated = truncateText(flat, maxWidth);
  return [{ text: truncated, color: segments[0]?.color ?? 'white' }];
}

function renderVisualLine(
  segments: ColorSegment[],
  transform: LineTransform,
  key: string,
  widthBudget: number,
): React.ReactElement {
  if (transform.kind === 'shift') {
    const displayText = shiftText(flattenSegmentText(segments), transform.offset, widthBudget);
    return <Text key={key}>{displayText}</Text>;
  }

  let finalSegments: ColorSegment[];

  if (transform.kind === 'truncate') {
    finalSegments = truncateSegments(segments, widthBudget);
  } else {
    finalSegments = segments;
  }

  finalSegments = clampSegmentsToWidth(finalSegments, widthBudget);

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
  fullscreen,
  availableHeight,
  search,
}: ResponseViewProps): React.ReactElement {
  const { stdout } = useStdout();
  const columns = stdout.columns || DEFAULT_TERMINAL_COLUMNS;
  const geometry: ResponseViewportGeometry = {
    columns,
    availableHeight,
    fullscreen,
    searchVisible: search.visible,
  };

  let content: React.ReactNode;

  if (isLoading) {
    content = (
      <Box flexDirection="column">
        <Spinner label="Sending request" />
        <Text color="gray">(Esc to cancel)</Text>
      </Box>
    );
  } else if (error) {
    const label = error.code ? `${error.message} (${error.code})` : error.message;
    content = <Text color="red">{label}</Text>;
  } else if (!response) {
    content = <Text color="gray">Press Enter to send a request</Text>;
  } else {
    const model = computeResponseViewport({ response, verbose, rawMode, wrapMode, geometry });
    const contentWidth = model.contentWidth;

    const transform: LineTransform =
      wrapMode === 'wrap'
        ? { kind: 'pass' }
        : horizontalOffset > 0
          ? { kind: 'shift', offset: horizontalOffset }
          : { kind: 'truncate' };

    const matchVisualIndices = new Set(search.matches.map((i) => model.bodyVisualStart[i]));
    const currentMatchVisualIndex = search.matches.length > 0
      ? model.bodyVisualStart[search.matches[search.currentMatchIndex]]
      : -1;

    content = sliceVisibleLines(model, scrollOffset, model.visibleHeight).map(
      (segments, sliceIndex) => {
        const absoluteVisualIndex = scrollOffset + sliceIndex;
        const isMatch = matchVisualIndices.has(absoluteVisualIndex);
        const widthBudget = isMatch ? contentWidth - 1 : contentWidth;
        const line = renderVisualLine(segments, transform, `vl-${absoluteVisualIndex}`, widthBudget);
        if (!isMatch) {
          return line;
        }
        const isCurrent = absoluteVisualIndex === currentMatchVisualIndex;
        return (
          <Box key={`search-${absoluteVisualIndex}`} flexDirection="row">
            <Text color={isCurrent ? 'cyanBright' : 'gray'}>{isCurrent ? '►' : '·'}</Text>
            {line}
          </Box>
        );
      },
    );
  }

  let searchBar: React.ReactNode = null;
  if (search.isSearchMode) {
    searchBar = (
      <Text color="cyanBright">
        /{search.query.slice(0, search.cursor)}
        <Text inverse>{search.query[search.cursor] ?? ' '}</Text>
        {search.query.slice(search.cursor + 1)}
        <Text color="gray">  (Esc to cancel)</Text>
      </Text>
    );
  } else if (search.lastQuery) {
    const matchInfo = search.matches.length > 0
      ? `[${search.currentMatchIndex + 1}/${search.matches.length}]`
      : '[No matches]';
    searchBar = (
      <Text>
        <Text color="gray">/{search.lastQuery}</Text>
        <Text color={search.matches.length > 0 ? 'cyanBright' : 'yellow'}> {matchInfo}</Text>
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
