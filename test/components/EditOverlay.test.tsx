import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from 'ink-testing-library';

import { EditOverlay } from '../../src/components/EditOverlay';

afterEach(() => {
  cleanup();
});

const baseProps = {
  title: 'Edit Request',
  tabs: ['url', 'body'] as const,
  activeTab: 'url' as const,
  buffer: '{"hello":"world"}',
  cursor: 0,
  scrollOffset: 0,
  horizontalOffset: 0,
  visibleHeight: 10,
  contentWidth: 40,
};

describe('EditOverlay', () => {
  describe('rendering', () => {
    it('renders the title and hint line', () => {
      const { lastFrame } = render(<EditOverlay {...baseProps} />);
      const frame = lastFrame() ?? '';
      expect(frame).toContain('Edit Request');
      expect(frame).toContain('Shift+Tab to switch, Ctrl+S to save, Esc to cancel');
    });

    it('renders an empty buffer without crashing', () => {
      const { lastFrame } = render(<EditOverlay {...baseProps} buffer="" cursor={0} />);
      const frame = lastFrame() ?? '';
      expect(frame).toContain('Edit Request');
    });
  });

  describe('tab strip', () => {
    it('renders both labels with the active one distinguished', () => {
      const { lastFrame } = render(<EditOverlay {...baseProps} activeTab="url" />);
      const frame = lastFrame() ?? '';
      expect(frame).toContain('url');
      expect(frame).toContain('body');
    });

    it('renders both labels when body is the active tab', () => {
      const { lastFrame } = render(<EditOverlay {...baseProps} activeTab="body" />);
      const frame = lastFrame() ?? '';
      expect(frame).toContain('url');
      expect(frame).toContain('body');
    });
  });

  describe('cursor rendering', () => {
    it('renders the cursor mid-line', () => {
      const { lastFrame } = render(
        <EditOverlay {...baseProps} buffer="abc" cursor={1} />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain('abc');
    });

    it('renders the cursor at the end of the line', () => {
      const { lastFrame } = render(
        <EditOverlay {...baseProps} buffer="abc" cursor={3} />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain('abc ');
    });
  });

  describe('viewport slicing', () => {
    it('hides lines outside the visible window', () => {
      const buffer = 'line1\nline2\nline3\nline4\nline5';
      const { lastFrame } = render(
        <EditOverlay
          {...baseProps}
          buffer={buffer}
          cursor={0}
          scrollOffset={1}
          visibleHeight={2}
        />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).not.toContain('line1');
      expect(frame).toContain('line2');
      expect(frame).toContain('line3');
      expect(frame).not.toContain('line4');
      expect(frame).not.toContain('line5');
    });
  });

  describe('truncation and horizontal offset', () => {
    it('truncates long lines with no overflow past the border', () => {
      const buffer = 'x'.repeat(100);
      const { lastFrame } = render(
        <EditOverlay
          {...baseProps}
          buffer={buffer}
          cursor={0}
          contentWidth={20}
        />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain('x'.repeat(19) + '…');
      expect(frame).not.toContain('x'.repeat(20));
    });

    it('shifts text when horizontalOffset is greater than zero', () => {
      const buffer = '0123456789';
      const { lastFrame } = render(
        <EditOverlay
          {...baseProps}
          buffer={buffer}
          cursor={0}
          horizontalOffset={5}
          contentWidth={20}
        />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain('56789');
      expect(frame).not.toContain('01234');
    });
  });

  describe('tab expansion', () => {
    it('renders tab-indented line expanded and stays within bounds', () => {
      const buffer = '\t\t\t\t<root>';
      const { lastFrame } = render(
        <EditOverlay
          {...baseProps}
          buffer={buffer}
          cursor={0}
          contentWidth={40}
        />,
      );
      const frame = lastFrame() ?? '';
      expect(frame).toContain('                                <root>');
      expect(frame).not.toContain('\t');
    });
  });
});
