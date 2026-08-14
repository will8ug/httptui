import React from 'react';
import { Box, Text, useStdout } from 'ink';

import { CENTERED_OVERLAY_MARGIN, DEFAULT_TERMINAL_COLUMNS } from '../utils/layout';

interface SaveOverlayProps {
  value: string;
  error: string | null;
  cursor: number;
}

export function SaveOverlay({ value, error, cursor }: SaveOverlayProps): React.ReactElement {
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
          Save as .http
        </Text>
        <Text>{' '}</Text>
        <Box>
          <Text color="gray">File: </Text>
          <Text color="white">{value.slice(0, cursor)}</Text>
          <Text inverse>{value[cursor] ?? ' '}</Text>
          <Text color="white">{value.slice(cursor + 1)}</Text>
        </Box>
        {error ? (
          <Box>
            <Text color="red">{error}</Text>
          </Box>
        ) : null}
        <Text>{' '}</Text>
        <Text color="gray">Press Enter to save, Esc to cancel</Text>
      </Box>
    </Box>
  );
}
