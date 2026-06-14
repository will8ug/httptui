import React from 'react';
import { Box, Text, useStdout } from 'ink';

import type { EnvOption } from '../core/types';
import { DEFAULT_TERMINAL_COLUMNS } from '../utils/layout';

interface EnvSelectOverlayProps {
  options: EnvOption[];
  selectedIndex: number;
  activeEnvName: string | null;
  error: string | null;
}

export function EnvSelectOverlay({
  options,
  selectedIndex,
  activeEnvName,
  error,
}: EnvSelectOverlayProps): React.ReactElement {
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
          Select Environment
        </Text>
        <Text>{' '}</Text>
        {options.map((option, index) => {
          const isHighlighted = selectedIndex === index;
          const isActive = activeEnvName === option.name && option.name !== '(none)';

          return (
            <Text key={option.name}>
              {isActive ? <Text color="magenta">{'\u25CF '} </Text> : null}
              <Text color={isHighlighted ? 'cyan' : 'white'} bold={isHighlighted}>
                {option.name}
              </Text>
            </Text>
          );
        })}
        {error ? (
          <Box>
            <Text color="red">{error}</Text>
          </Box>
        ) : null}
        <Text>{' '}</Text>
        <Text color="gray">{'\u2191\u2193'} move {'\u00B7'} Enter apply {'\u00B7'} Esc cancel</Text>
      </Box>
    </Box>
  );
}
