import React from 'react';
import { Box, Text, useStdout } from 'ink';

import type { PendingDiscardAction } from '../core/types';
import { DEFAULT_TERMINAL_COLUMNS } from '../utils/layout';

interface ConfirmDiscardOverlayProps {
  pendingAction: PendingDiscardAction;
}

export function ConfirmDiscardOverlay({ pendingAction }: ConfirmDiscardOverlayProps): React.ReactElement {
  const { stdout } = useStdout();
  const width = Math.min(72, Math.max(48, (stdout.columns || DEFAULT_TERMINAL_COLUMNS) - 6));

  const actionText = (() => {
    switch (pendingAction) {
      case 'reload':
        return 'reloading the file';
      case 'fileLoad':
        return 'opening a different file';
      case 'quit':
        return 'quitting';
    }
  })();

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
          Unsaved Changes
        </Text>
        <Text>{' '}</Text>
        <Text>There are unsaved changes.</Text>
        <Box>
          <Text>Confirm to proceed with </Text>
          <Text bold>{actionText}</Text>
          <Text>.</Text>
        </Box>
        <Text>{' '}</Text>
        <Text color="gray">y to proceed, n or Esc to cancel</Text>
      </Box>
    </Box>
  );
}
