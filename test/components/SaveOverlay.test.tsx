import { afterEach, describe, expect, it } from 'vitest';
import chalk from 'chalk';
import { cleanup, render } from 'ink-testing-library';

import { SaveOverlay } from '../../src/components/SaveOverlay';

afterEach(() => {
  cleanup();
});

const INVERSE_ON = '\u001b[7m';
const INVERSE_OFF = '\u001b[27m';

describe('SaveOverlay', () => {
  describe('title and value rendering', () => {
    it('renders the "Save as .http" title and the current file path value', () => {
      const { lastFrame } = render(
        <SaveOverlay value="output/api.http" error={null} cursor={15} />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Save as .http');
      expect(frame).toContain('output/api.http');
    });
  });

  describe('error rendering', () => {
    it('renders error message when error is provided', () => {
      const { lastFrame } = render(
        <SaveOverlay value="" error="Permission denied" cursor={0} />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Permission denied');
    });

    it('does not render an error when error is null', () => {
      const { lastFrame } = render(
        <SaveOverlay value="" error={null} cursor={0} />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Press Enter to save, Esc to cancel');
      expect(frame).not.toContain('Permission denied');
    });
  });

  describe('cursor rendering', () => {
    it('inverts the character at the cursor position mid-string', () => {
      const previousLevel = chalk.level;
      chalk.level = 3;
      try {
        const { lastFrame } = render(
          <SaveOverlay value="api.http" error={null} cursor={3} />,
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
          <SaveOverlay value="api.http" error={null} cursor={8} />,
        );

        const frame = lastFrame() ?? '';
        expect(frame).toContain(`${INVERSE_ON} ${INVERSE_OFF}`);
      } finally {
        chalk.level = previousLevel;
      }
    });
  });
});
