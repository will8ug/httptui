import React from 'react';
import { Box, Text, useStdout } from 'ink';

import { CENTERED_OVERLAY_MARGIN, DEFAULT_TERMINAL_COLUMNS } from '../utils/layout';

/** Border (1 + 1) + paddingX (2 + 2) of the overlay box */
const OVERLAY_HORIZONTAL_CHROME = 6;

interface FileLoadOverlayProps {
  value: string;
  error: string | null;
  cursor: number;
  completions: string[] | null;
}

function formatCompletions(names: string[], maxWidth: number): string {
  const joined = names.join('  ');
  if (joined.length <= maxWidth) {
    return joined;
  }

  for (let shown = names.length - 1; shown >= 1; shown -= 1) {
    const suffix = ` … +${names.length - shown}`;
    const line = names.slice(0, shown).join('  ');
    if (line.length + suffix.length <= maxWidth) {
      return line + suffix;
    }
  }

  const [first, ...rest] = names;
  if (rest.length === 0) {
    return `${first.slice(0, maxWidth - 1)}…`;
  }

  const suffix = ` … +${rest.length}`;
  return first.slice(0, Math.max(0, maxWidth - suffix.length)) + suffix;
}

export function FileLoadOverlay({ value, error, cursor, completions }: FileLoadOverlayProps): React.ReactElement {
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
          Open File
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
        <Text color="gray">Press Enter to load, Tab to complete, Esc to cancel</Text>
      </Box>
    </Box>
  );
}