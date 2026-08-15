import { afterEach, describe, expect, it } from 'vitest';
import chalk from 'chalk';
import { cleanup, render } from 'ink-testing-library';

import { FileLoadOverlay } from '../../src/components/FileLoadOverlay';

afterEach(() => {
  cleanup();
});

const INVERSE_ON = '\u001b[7m';
const INVERSE_OFF = '\u001b[27m';

describe('FileLoadOverlay', () => {
  describe('title and value rendering', () => {
    it('renders the "Open File" title and the current file path value', () => {
      const { lastFrame } = render(
        <FileLoadOverlay value="path/to/api.http" error={null} cursor={16} />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Open File');
      expect(frame).toContain('path/to/api.http');
    });
  });

  describe('error rendering', () => {
    it('renders error message when error is provided', () => {
      const { lastFrame } = render(
        <FileLoadOverlay value="" error="File not found" cursor={0} />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('File not found');
    });

    it('does not render an error when error is null', () => {
      const { lastFrame } = render(
        <FileLoadOverlay value="" error={null} cursor={0} />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Press Enter to load, Esc to cancel');
      expect(frame).not.toContain('File not found');
    });
  });

  describe('cursor rendering', () => {
    it('inverts the character at the cursor position mid-string', () => {
      const previousLevel = chalk.level;
      chalk.level = 3;
      try {
        const { lastFrame } = render(
          <FileLoadOverlay value="api.http" error={null} cursor={3} />,
        );

        const frame = lastFrame() ?? '';
        expect(frame).toContain(`${INVERSE_ON}.${INVERSE_OFF}`);
        expect(frame).not.toContain(`${INVERSE_ON}a`);
        expect(frame).not.toContain(`${INVERSE_ON}h`);
      } finally {
        chalk.level = previousLevel;
      }
    });

    it('renders an inverted trailing space when the cursor is at the end', () => {
      const previousLevel = chalk.level;
      chalk.level = 3;
      try {
        const { lastFrame } = render(
          <FileLoadOverlay value="api.http" error={null} cursor={8} />,
        );

        const frame = lastFrame() ?? '';
        expect(frame).toContain(`${INVERSE_ON} ${INVERSE_OFF}`);
      } finally {
        chalk.level = previousLevel;
      }
    });
  });
});
