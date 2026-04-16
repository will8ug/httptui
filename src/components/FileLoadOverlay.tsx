import React from 'react';
import { Box, Text, useStdout } from 'ink';

import { DEFAULT_TERMINAL_COLUMNS } from '../utils/layout';

interface FileLoadOverlayProps {
  value: string;
  error: string | null;
}

export function FileLoadOverlay({ value, error }: FileLoadOverlayProps): React.ReactElement {
  const { stdout } = useStdout();
  const width = Math.min(72, Math.max(48, (stdout.columns || DEFAULT_TERMINAL_COLUMNS) - 6));

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
          Open File
        </Text>
        <Text>{' '}</Text>
        <Box>
          <Text color="gray">File: </Text>
          <Text color="white">{value}</Text>
          <Text color="white" bold>_</Text>
        </Box>
        {error ? (
          <Box>
            <Text color="red">{error}</Text>
          </Box>
        ) : null}
        <Text>{' '}</Text>
        <Text color="gray">Press Enter to load, Esc to cancel</Text>
      </Box>
    </Box>
  );
}