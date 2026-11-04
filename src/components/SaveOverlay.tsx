import React from 'react';
import { Box, Text, useStdout } from 'ink';

import { CENTERED_OVERLAY_MARGIN, DEFAULT_TERMINAL_COLUMNS, OVERLAY_HORIZONTAL_CHROME } from '../utils/layout';
import { formatCompletions } from '../utils/format-completions';

interface SaveOverlayProps {
  value: string;
  error: string | null;
  cursor: number;
  completions: string[] | null;
  title?: string;
}

export function SaveOverlay({ value, error, cursor, completions, title = 'Save as .http' }: SaveOverlayProps): React.ReactElement {
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
          {title}
        </Text>
        <Text>{' '}</Text>
        <Box>
          <Text color="gray">File: </Text>
          <Text color="white">
            <Text>{value.slice(0, cursor)}</Text>
            <Text inverse>{value[cursor] ?? ' '}</Text>
            <Text>{value.slice(cursor + 1)}</Text>
          </Text>
        </Box>
        {completions && completions.length > 0 ? (
          <Box>
            <Text color="gray">{formatCompletions(completions, width - OVERLAY_HORIZONTAL_CHROME)}</Text>
          </Box>
        ) : null}
        {error ? (
          <Box>
            <Text color="red">{error}</Text>
          </Box>
        ) : null}
        <Text>{' '}</Text>
        <Text color="gray">Press Enter to save, Tab to complete, Esc to cancel</Text>
      </Box>
    </Box>
  );
}
