import React from 'react';
import { Box, Text, useStdout } from 'ink';

import type { EditTarget } from '../core/types';
import { offsetToLineCol } from '../core/editor';
import { DEFAULT_TERMINAL_COLUMNS, DEFAULT_TERMINAL_ROWS, getEditorBoxHeight, getEditorBoxWidth } from '../utils/layout';
import { expandTabs, shiftText, truncateText } from '../utils/text';

interface EditOverlayProps {
  title: string;
  tabs: readonly EditTarget[];
  activeTab: EditTarget;
  buffer: string;
  cursor: number;
  scrollOffset: number;
  horizontalOffset: number;
  visibleHeight: number;
  contentWidth: number;
}

export function EditOverlay({
  title,
  tabs,
  activeTab,
  buffer,
  cursor,
  scrollOffset,
  horizontalOffset,
  visibleHeight,
  contentWidth,
}: EditOverlayProps): React.ReactElement {
  const { stdout } = useStdout();
  const columns = stdout.columns || DEFAULT_TERMINAL_COLUMNS;
  const rows = stdout.rows || DEFAULT_TERMINAL_ROWS;

  const width = getEditorBoxWidth(columns);
  const height = getEditorBoxHeight(rows);

  const lines = buffer.split('\n');
  const { line: cursorLine, col: cursorCol } = offsetToLineCol(buffer, cursor);

  const visibleLines = lines.slice(scrollOffset, scrollOffset + visibleHeight);

  return (
    <Box width="100%" height="100%" justifyContent="center" alignItems="center">
      <Box
        borderStyle="round"
        borderColor="cyanBright"
        flexDirection="column"
        paddingX={1}
        width={width}
        height={height}
      >
        <Text color="cyanBright" bold>
          {title}
        </Text>
        <Box flexDirection="row" gap={1}>
          {tabs.map((tab, index) => (
            <React.Fragment key={tab}>
              {index > 0 && <Text color="gray">|</Text>}
              {tab === activeTab ? (
                <Text inverse>{tab}</Text>
              ) : (
                <Text color="gray">{tab}</Text>
              )}
            </React.Fragment>
          ))}
        </Box>
        <Text>{' '}</Text>
        <Box flexDirection="column" flexGrow={1}>
          {visibleLines.map((line, i) => {
            const actualLineIndex = scrollOffset + i;
            const isCursorLine = actualLineIndex === cursorLine;

            if (!isCursorLine) {
              return (
                <Text key={actualLineIndex}>
                  {shiftText(expandTabs(line || ' '), horizontalOffset, contentWidth)}
                </Text>
              );
            }

            const expandedBefore = expandTabs(line.slice(0, cursorCol));
            const visualCol = expandedBefore.length;

            if (visualCol < horizontalOffset || visualCol >= horizontalOffset + contentWidth) {
              return (
                <Text key={actualLineIndex}>
                  {shiftText(expandTabs(line || ' '), horizontalOffset, contentWidth)}
                </Text>
              );
            }

            const expandedLine = expandTabs(line);
            const isAtEnd = cursorCol === line.length;

            const expandedLineWithCursor = expandedLine + (isAtEnd ? ' ' : '');
            const shifted = expandedLineWithCursor.slice(horizontalOffset);
            const visibleLine = truncateText(shifted, contentWidth);

            const cursorIndex = visualCol - horizontalOffset;

            const beforeCursor = visibleLine.slice(0, cursorIndex);
            const atCursor = visibleLine[cursorIndex];
            const afterCursor = visibleLine.slice(cursorIndex + 1);

            return (
              <Text key={actualLineIndex}>
                <Text>{beforeCursor}</Text>
                <Text inverse>{atCursor}</Text>
                <Text>{afterCursor}</Text>
              </Text>
            );
          })}
        </Box>
        <Text>{' '}</Text>
        <Text color="gray">Shift+Tab to switch, Ctrl+S to save, Esc to cancel</Text>
      </Box>
    </Box>
  );
}
