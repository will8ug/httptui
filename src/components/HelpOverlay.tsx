import React from 'react';
import { Box, Text, useStdout } from 'ink';

interface HelpOverlayProps {
  visible: boolean;
}

const SHORTCUTS = [
  ['↑ / k', 'Previous request or scroll up'],
  ['↓ / j', 'Next request or scroll down'],
  ['Enter', 'Send selected request'],
  ['Tab', 'Switch focused panel'],
  ['v', 'Toggle verbose headers'],
  ['r', 'Toggle raw response body'],
  ['o', 'Open a different file'],
  ['R', 'Reload file from disk'],
  ['?', 'Toggle this help overlay'],
  ['q', 'Quit application'],
  ['Escape', 'Close overlay / cancel file load'],
] as const;

export function HelpOverlay({ visible }: HelpOverlayProps): React.ReactElement | null {
  const { stdout } = useStdout();

  if (!visible) {
    return null;
  }

  const width = Math.min(72, Math.max(48, (stdout.columns || 80) - 6));

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
        {SHORTCUTS.map(([keyLabel, description]) => (
          <Text key={keyLabel}>
            <Text color="yellow">{keyLabel.padEnd(8, ' ')}</Text>
            <Text color="white"> {description}</Text>
          </Text>
        ))}
        <Text>{' '}</Text>
        <Text color="gray">Press Escape or ? to close</Text>
      </Box>
    </Box>
  );
}
