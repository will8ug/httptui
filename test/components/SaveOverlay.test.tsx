import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from 'ink-testing-library';

import { SaveOverlay } from '../../src/components/SaveOverlay';

afterEach(() => {
  cleanup();
});

describe('SaveOverlay', () => {
  describe('title and value rendering', () => {
    it('renders the "Save as .http" title and the current file path value', () => {
      const { lastFrame } = render(<SaveOverlay value="output/api.http" error={null} />);

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Save as .http');
      expect(frame).toContain('output/api.http');
    });
  });

  describe('error rendering', () => {
    it('renders error message when error is provided', () => {
      const { lastFrame } = render(
        <SaveOverlay value="" error="Permission denied" />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Permission denied');
    });

    it('does not render an error when error is null', () => {
      const { lastFrame } = render(<SaveOverlay value="" error={null} />);

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Press Enter to save, Esc to cancel');
      expect(frame).not.toContain('Permission denied');
    });
  });
});