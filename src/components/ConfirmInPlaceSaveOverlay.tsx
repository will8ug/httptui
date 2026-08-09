import React from 'react';
import { Box, Text, useStdout } from 'ink';

import { CENTERED_OVERLAY_MARGIN, DEFAULT_TERMINAL_COLUMNS } from '../utils/layout';

interface ConfirmInPlaceSaveOverlayProps {
  fileName: string;
  markedCount: number;
}

export function ConfirmInPlaceSaveOverlay({ fileName, markedCount }: ConfirmInPlaceSaveOverlayProps): React.ReactElement {
  const { stdout } = useStdout();
  const width = Math.min(72, Math.max(48, (stdout.columns || DEFAULT_TERMINAL_COLUMNS) - CENTERED_OVERLAY_MARGIN));

  return (
    <Box width="100%" height="100%" justifyContent="center" alignItems="center">
      <Box
        borderStyle="round"
        borderColor="cyanBright"
        flexDirection="column"
        paddingX={2}
        paddingY={1}
        width={width}
      >
        <Text color="cyanBright" bold>
          Confirm overriding
        </Text>
        <Text>{' '}</Text>
        <Text>
          This will overwrite {fileName} with {markedCount} changed request(s).
        </Text>
        <Text>{' '}</Text>
        <Text color="gray">y to save, n or Esc to cancel</Text>
      </Box>
    </Box>
  );
}
