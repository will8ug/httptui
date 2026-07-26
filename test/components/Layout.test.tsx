import React from 'react';
import { Text } from 'ink';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from 'ink-testing-library';

import { Layout } from '../../src/components/Layout';

const Left = () => <Text>LEFT_CONTENT</Text>;
const Right = () => <Text>RIGHT_CONTENT</Text>;
const Bottom = () => <Text>BOTTOM_CONTENT</Text>;
const Overlay = () => <Text>OVERLAY_CONTENT</Text>;
const DetailPanel = () => <Text>DETAIL_CONTENT</Text>;

afterEach(() => {
  cleanup();
});

describe('Layout', () => {
  describe('split view', () => {
    it('renders left, right, and bottom panels in normal mode', () => {
      const { lastFrame } = render(
        <Layout
          left={<Left />}
          right={<Right />}
          bottom={<Bottom />}
          maximizedPanel={null}
        />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('LEFT_CONTENT');
      expect(frame).toContain('RIGHT_CONTENT');
      expect(frame).toContain('BOTTOM_CONTENT');
    });

    it('renders the detail panel above the right panel when provided', () => {
      const { lastFrame } = render(
        <Layout
          left={<Left />}
          right={<Right />}
          bottom={<Bottom />}
          detailPanel={<DetailPanel />}
          maximizedPanel={null}
        />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('DETAIL_CONTENT');
      expect(frame).toContain('RIGHT_CONTENT');
    });
  });

  describe('overlay precedence', () => {
    it('renders the overlay instead of split panels when provided', () => {
      const { lastFrame } = render(
        <Layout
          left={<Left />}
          right={<Right />}
          bottom={<Bottom />}
          overlay={<Overlay />}
          maximizedPanel={null}
        />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('OVERLAY_CONTENT');
      expect(frame).toContain('BOTTOM_CONTENT');
      expect(frame).not.toContain('LEFT_CONTENT');
      expect(frame).not.toContain('RIGHT_CONTENT');
    });
  });

  describe('maximized panel', () => {
    it('renders only the requests panel when maximizedPanel is "requests"', () => {
      const { lastFrame } = render(
        <Layout
          left={<Left />}
          right={<Right />}
          bottom={<Bottom />}
          maximizedPanel="requests"
        />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('LEFT_CONTENT');
      expect(frame).toContain('BOTTOM_CONTENT');
      expect(frame).not.toContain('RIGHT_CONTENT');
    });

    it('renders only the response panel when maximizedPanel is "response"', () => {
      const { lastFrame } = render(
        <Layout
          left={<Left />}
          right={<Right />}
          bottom={<Bottom />}
          maximizedPanel="response"
        />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('RIGHT_CONTENT');
      expect(frame).not.toContain('LEFT_CONTENT');
    });

    it('renders the detail panel when maximizedPanel is "details"', () => {
      const { lastFrame } = render(
        <Layout
          left={<Left />}
          right={<Right />}
          bottom={<Bottom />}
          detailPanel={<DetailPanel />}
          maximizedPanel="details"
        />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('DETAIL_CONTENT');
      expect(frame).not.toContain('LEFT_CONTENT');
    });
  });
});