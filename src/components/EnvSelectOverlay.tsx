import React from 'react';
import { Box, Text, useStdout } from 'ink';

import type { EnvOption } from '../core/types';
import { DEFAULT_TERMINAL_COLUMNS, DEFAULT_TERMINAL_ROWS, ENV_PICKER_VERTICAL_OVERHEAD, getEnvPickerVisibleHeight } from '../utils/layout';

interface EnvSelectOverlayProps {
  options: EnvOption[];
  selectedIndex: number;
  scrollOffset: number;
  activeEnvName: string | null;
  error: string | null;
}

export function EnvSelectOverlay({
  options,
  selectedIndex,
  scrollOffset,
  activeEnvName,
  error,
}: EnvSelectOverlayProps): React.ReactElement {
  const { stdout } = useStdout();
  const width = Math.min(72, Math.max(48, (stdout.columns || DEFAULT_TERMINAL_COLUMNS) - 6));
  const visibleCount = getEnvPickerVisibleHeight(stdout.rows || DEFAULT_TERMINAL_ROWS);
  const visibleOptions = options.slice(scrollOffset, scrollOffset + visibleCount);

  return (
    <Box width="100%" height="100%" justifyContent="center" alignItems="center">
      <Box
        borderStyle="round"
        borderColor="cyanBright"
        flexDirection="column"
        paddingX={2}
        paddingY={1}
        width={width}
        height={error ? undefined : Math.min(visibleCount, options.length) + ENV_PICKER_VERTICAL_OVERHEAD}
      >
        <Text color="cyanBright" bold>
          Select Environment
        </Text>
        <Text>{' '}</Text>
        {visibleOptions.map((option, i) => {
          const globalIndex = scrollOffset + i;
          const isHighlighted = selectedIndex === globalIndex;
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
        <Text color="gray">
          {'\u2191\u2193'} move {'\u00B7'} g/G top/bottom {'\u00B7'} Enter apply {'\u00B7'} Esc cancel {'\u00B7'} {selectedIndex + 1}/{options.length}
        </Text>
      </Box>
    </Box>
  );
}
