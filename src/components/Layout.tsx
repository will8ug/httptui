import React from 'react';
import { Box, useStdout } from 'ink';

import { DEFAULT_TERMINAL_COLUMNS, DEFAULT_TERMINAL_ROWS, MIN_CONTENT_AREA_ROWS, getLeftPanelWidth } from '../utils/layout';
import type { FocusedPanel } from '../core/types';

interface LayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  bottom: React.ReactNode;
  overlay?: React.ReactNode;
  detailPanel?: React.ReactNode;
  maximizedPanel: FocusedPanel | null;
}

export function Layout({ left, right, bottom, overlay, detailPanel, maximizedPanel }: LayoutProps): React.ReactElement {
  const { stdout } = useStdout();
  const columns = stdout.columns || DEFAULT_TERMINAL_COLUMNS;
  const rows = stdout.rows || DEFAULT_TERMINAL_ROWS;
  const leftPanelWidth = getLeftPanelWidth(columns);
  const contentHeight = Math.max(MIN_CONTENT_AREA_ROWS, rows - 1);

  if (maximizedPanel !== null && !overlay) {
    const maximizedContent = (() => {
      switch (maximizedPanel) {
        case 'requests': return left;
        case 'response': return right;
        case 'details': return detailPanel;
      }
    })();

    return (
      <Box flexDirection="column" width={columns} height={rows}>
        <Box width="100%" height={contentHeight}>
          {maximizedContent}
        </Box>
        <Box height={1}>{bottom}</Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <Box flexDirection="row" flexGrow={1} height={contentHeight}>
        {overlay ? (
          <Box width="100%" height="100%">
            {overlay}
          </Box>
        ) : (
          <>
            <Box width={leftPanelWidth} flexShrink={0} height="100%">
              {left}
            </Box>
            <Box flexDirection="column" flexGrow={1} height="100%">
              {detailPanel}
              <Box flexGrow={1}>
                {right}
              </Box>
            </Box>
          </>
        )}
      </Box>
      <Box height={1}>{bottom}</Box>
    </Box>
  );
}
