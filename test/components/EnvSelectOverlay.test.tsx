import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from 'ink-testing-library';

import { EnvSelectOverlay } from '../../src/components/EnvSelectOverlay';
import type { EnvOption } from '../../src/core/types';

const options: EnvOption[] = [
  { name: '(none)', file: null },
  { name: 'Development', file: 'env/dev.json' },
  { name: 'Staging', file: 'env/staging.json' },
];

afterEach(() => {
  cleanup();
});

describe('EnvSelectOverlay', () => {
  describe('option rendering', () => {
    it('renders the selected option name', () => {
      const { lastFrame } = render(
        <EnvSelectOverlay
          options={options}
          selectedIndex={1}
          activeEnvName={null}
          error={null}
        />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Development');
    });
  });

  describe('active marker', () => {
    it('prefixes the active environment with bullet', () => {
      const { lastFrame } = render(
        <EnvSelectOverlay
          options={options}
          selectedIndex={0}
          activeEnvName="Development"
          error={null}
        />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('●');
      const bulletIndex = frame.indexOf('●');
      const devIndex = frame.indexOf('Development');
      expect(bulletIndex).toBeLessThan(devIndex);
    });

    it('does not show active marker for (none) option', () => {
      const { lastFrame } = render(
        <EnvSelectOverlay
          options={options}
          selectedIndex={0}
          activeEnvName="(none)"
          error={null}
        />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).not.toContain('●');
    });

    it('shows no active marker when activeEnvName is null', () => {
      const { lastFrame } = render(
        <EnvSelectOverlay
          options={options}
          selectedIndex={0}
          activeEnvName={null}
          error={null}
        />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).not.toContain('●');
    });
  });

  describe('error rendering', () => {
    it('renders error message when present', () => {
      const { lastFrame } = render(
        <EnvSelectOverlay
          options={options}
          selectedIndex={0}
          activeEnvName={null}
          error="Failed to load environment file"
        />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Failed to load environment file');
    });

    it('does not render error when error is null', () => {
      const { lastFrame } = render(
        <EnvSelectOverlay
          options={options}
          selectedIndex={0}
          activeEnvName={null}
          error={null}
        />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).not.toContain('Failed to load environment file');
    });
  });

  describe('overlay structure', () => {
    it('renders the title "Select Environment"', () => {
      const { lastFrame } = render(
        <EnvSelectOverlay
          options={options}
          selectedIndex={0}
          activeEnvName={null}
          error={null}
        />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('Select Environment');
    });

    it('renders the footer hint', () => {
      const { lastFrame } = render(
        <EnvSelectOverlay
          options={options}
          selectedIndex={0}
          activeEnvName={null}
          error={null}
        />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('move');
      expect(frame).toContain('apply');
      expect(frame).toContain('cancel');
    });

    it('renders all option names', () => {
      const { lastFrame } = render(
        <EnvSelectOverlay
          options={options}
          selectedIndex={0}
          activeEnvName={null}
          error={null}
        />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('(none)');
      expect(frame).toContain('Development');
      expect(frame).toContain('Staging');
    });
  });
});
