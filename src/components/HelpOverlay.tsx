import React from 'react';
import { Box, Text, useStdout } from 'ink';

import { SHORTCUTS } from '../core/shortcuts';
import { DEFAULT_TERMINAL_COLUMNS } from '../utils/layout';

interface HelpOverlayProps {
  visible: boolean;
}

export function HelpOverlay({ visible }: HelpOverlayProps): React.ReactElement | null {
  const { stdout } = useStdout();

  if (!visible) {
    return null;
  }

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
          Keyboard Shortcuts
        </Text>
        <Text color="gray">Navigate requests, send them, and inspect responses.</Text>
        <Text>{' '}</Text>
        {SHORTCUTS.filter((s) => s.showInHelp).map((shortcut) => (
          <Text key={shortcut.key}>
            <Text color="yellow">{shortcut.key.padEnd(8, ' ')}</Text>
            <Text color="white"> {shortcut.description}</Text>
          </Text>
        ))}
        <Text>{' '}</Text>
        <Text color="gray">Press Escape or ? to close this overlay</Text>
      </Box>
    </Box>
  );
}
