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
        <FileLoadOverlay value="path/to/api.http" error={null} cursor={16} completions={null} />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Open File');
      expect(frame).toContain('path/to/api.http');
    });
  });

  describe('error rendering', () => {
    it('renders error message when error is provided', () => {
      const { lastFrame } = render(
        <FileLoadOverlay value="" error="File not found" cursor={0} completions={null} />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('File not found');
    });

    it('does not render an error when error is null', () => {
      const { lastFrame } = render(
        <FileLoadOverlay value="" error={null} cursor={0} completions={null} />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Press Enter to load, Tab to complete, Esc to cancel');
      expect(frame).not.toContain('File not found');
    });
  });

  describe('cursor rendering', () => {
    it('inverts the character at the cursor position mid-string', () => {
      const previousLevel = chalk.level;
      chalk.level = 3;
      try {
        const { lastFrame } = render(
          <FileLoadOverlay value="api.http" error={null} cursor={3} completions={null} />,
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
          <FileLoadOverlay value="api.http" error={null} cursor={8} completions={null} />,
        );

        const frame = lastFrame() ?? '';
        expect(frame).toContain(`${INVERSE_ON} ${INVERSE_OFF}`);
      } finally {
        chalk.level = previousLevel;
      }
    });
  });

  describe('completion candidates', () => {
    it('renders candidate names joined with two spaces beneath the input', () => {
      const { lastFrame } = render(
        <FileLoadOverlay
          value="users"
          error={null}
          cursor={5}
          completions={['users-staging.http', 'users.http']}
        />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('users-staging.http  users.http');
    });

    it('renders no candidate row when completions is null', () => {
      const { lastFrame } = render(
        <FileLoadOverlay value="" error={null} cursor={0} completions={null} />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).not.toContain('users.http');
    });

    it('renders no candidate row when completions is empty', () => {
      const { lastFrame } = render(
        <FileLoadOverlay value="" error={null} cursor={0} completions={[]} />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).not.toContain('… +');
    });

    it('clips an overflowing list to the overlay width with a hidden count', () => {
      const first = `${'a'.repeat(30)}.http`;
      const { lastFrame } = render(
        <FileLoadOverlay
          value="a"
          error={null}
          cursor={1}
          completions={[first, `${'b'.repeat(30)}.http`, `${'c'.repeat(30)}.http`]}
        />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain(`${first} … +2`);
      expect(frame).not.toContain('bbbb');
    });

    // Candidate row max width: 80-col test terminal → overlay width 72 → 72 - 6 box chrome = 66;
    // expectations use 66 - 1 (ellipsis) = 65.
    it('hard-truncates a single candidate longer than the overlay width', () => {
      const { lastFrame } = render(
        <FileLoadOverlay value="d" error={null} cursor={1} completions={['d'.repeat(80)]} />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain(`${'d'.repeat(65)}…`);
      expect(frame).not.toContain('d'.repeat(66));
    });

    // Candidate row max width: 80-col test terminal → overlay width 72 → 72 - 6 box chrome = 66;
    // expectations use 66 - 5 (" … +1") = 61.
    it('truncates an overlong first candidate and counts the rest', () => {
      const { lastFrame } = render(
        <FileLoadOverlay value="e" error={null} cursor={1} completions={['e'.repeat(80), 'f.http']} />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain(`${'e'.repeat(61)} … +1`);
      expect(frame).not.toContain('f.http');
    });
  });
});
