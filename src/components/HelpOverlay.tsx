import React from 'react';
import { Box, Text, useStdout } from 'ink';

import { SHORTCUTS, SHORTCUT_GROUP_LABELS, HELP_COLUMN_GROUPS } from '../core/shortcuts';
import type { ShortcutGroup } from '../core/shortcuts';
import { DEFAULT_TERMINAL_COLUMNS } from '../utils/layout';

interface HelpOverlayProps {
  visible: boolean;
}

function groupShortcutsByGroup(): Map<ShortcutGroup, typeof SHORTCUTS[number][]> {
  const groups = new Map<ShortcutGroup, typeof SHORTCUTS[number][]>();
  for (const shortcut of SHORTCUTS) {
    if (!shortcut.showInHelp) continue;
    const existing = groups.get(shortcut.group);
    if (existing) {
      existing.push(shortcut);
    } else {
      groups.set(shortcut.group, [shortcut]);
    }
  }
  return groups;
}

export function HelpOverlay({ visible }: HelpOverlayProps): React.ReactElement | null {
  const { stdout } = useStdout();

  if (!visible) {
    return null;
  }

  const width = Math.min(90, Math.max(64, (stdout.columns || DEFAULT_TERMINAL_COLUMNS) - 6));
  const grouped = groupShortcutsByGroup();

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
        <Box flexDirection="row">
          {HELP_COLUMN_GROUPS.map((columnGroups, colIndex) => (
            <Box key={colIndex} flexDirection="column" width="50%" marginRight={colIndex === 0 ? 2 : 0}>
              {columnGroups.map((groupKey) => {
                const shortcuts = grouped.get(groupKey);
                if (!shortcuts?.length) return null;
                return (
                  <React.Fragment key={groupKey}>
                    <Text color="cyanBright" bold>
                      {SHORTCUT_GROUP_LABELS[groupKey]}
                    </Text>
                    {shortcuts.map((shortcut) => (
                      <Text key={shortcut.key}>
                        <Text color="yellow">{shortcut.key.padEnd(8, ' ')}</Text>
                        <Text color="white"> {shortcut.description}</Text>
                      </Text>
                    ))}
                    <Text>{' '}</Text>
                  </React.Fragment>
                );
              })}
            </Box>
          ))}
        </Box>
        <Text color="gray">Press Escape or ? to close this overlay</Text>
      </Box>
    </Box>
  );
}
