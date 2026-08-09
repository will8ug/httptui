import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from 'ink-testing-library';

import { HelpOverlay } from '../../src/components/HelpOverlay';

afterEach(() => {
  cleanup();
});

describe('HelpOverlay', () => {
  describe('visibility', () => {
    it('renders nothing when visible is false', () => {
      const { lastFrame } = render(<HelpOverlay visible={false} />);

      const frame = lastFrame() ?? '';
      expect(frame).toBe('');
    });

    it('renders the "Keyboard Shortcuts" title when visible', () => {
      const { lastFrame } = render(<HelpOverlay visible={true} />);

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Keyboard Shortcuts');
    });
  });

  describe('shortcut content', () => {
    it('renders group labels and known shortcut descriptions', () => {
      const { lastFrame } = render(<HelpOverlay visible={true} />);

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Navigation');
      expect(frame).toContain('Request');
      expect(frame).toContain('Send selected request');
      expect(frame).toContain('Quit application');
    });

    it('renders the close hint', () => {
      const { lastFrame } = render(<HelpOverlay visible={true} />);

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Press Escape or ? to close this overlay');
    });

    it('renders the Edit group header', () => {
      const { lastFrame } = render(<HelpOverlay visible={true} />);

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Edit');
    });

    it('renders the Ctrl+S shortcut description', () => {
      const { lastFrame } = render(<HelpOverlay visible={true} />);

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Commit edit or save file');
    });

    it('renders the Ctrl+A shortcut description', () => {
      const { lastFrame } = render(<HelpOverlay visible={true} />);

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Jump to start of line');
    });

    it('renders the Ctrl+E shortcut description', () => {
      const { lastFrame } = render(<HelpOverlay visible={true} />);

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Jump to end of line');
    });
  });
});