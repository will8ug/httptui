import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from 'ink-testing-library';

import { FileLoadOverlay } from '../../src/components/FileLoadOverlay';

afterEach(() => {
  cleanup();
});

describe('FileLoadOverlay', () => {
  describe('title and value rendering', () => {
    it('renders the "Open File" title and the current file path value', () => {
      const { lastFrame } = render(<FileLoadOverlay value="path/to/api.http" error={null} />);

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Open File');
      expect(frame).toContain('path/to/api.http');
    });
  });

  describe('error rendering', () => {
    it('renders error message when error is provided', () => {
      const { lastFrame } = render(
        <FileLoadOverlay value="" error="File not found" />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('File not found');
    });

    it('does not render an error when error is null', () => {
      const { lastFrame } = render(<FileLoadOverlay value="" error={null} />);

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Press Enter to load, Esc to cancel');
      expect(frame).not.toContain('File not found');
    });
  });
});