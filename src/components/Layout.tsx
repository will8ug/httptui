import React from 'react';
import { Box, useStdout } from 'ink';

import { getLeftPanelWidth } from '../utils/layout';

interface LayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  bottom: React.ReactNode;
  overlay?: React.ReactNode;
  detailPanel?: React.ReactNode;
}

export function Layout({ left, right, bottom, overlay, detailPanel }: LayoutProps): React.ReactElement {
  const { stdout } = useStdout();
  const columns = stdout.columns || 80;
  const rows = stdout.rows || 24;
  const leftPanelWidth = getLeftPanelWidth(columns);

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <Box flexDirection="row" flexGrow={1} height={Math.max(3, rows - 1)}>
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
