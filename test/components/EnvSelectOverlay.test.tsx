import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from 'ink-testing-library';

import { EnvSelectOverlay } from '../../src/components/EnvSelectOverlay';
import type { EnvOption } from '../../src/core/types';

const options: EnvOption[] = [
  { name: '(none)', file: null },
  { name: 'Development', file: 'env/dev.json' },
  { name: 'Staging', file: 'env/staging.json' },
];

const manyOptions: EnvOption[] = [
  { name: '(none)', file: null },
  { name: 'Dev', file: 'env/dev.json' },
  { name: 'Staging', file: 'env/staging.json' },
  { name: 'QA', file: 'env/qa.json' },
  { name: 'Prod', file: 'env/prod.json' },
  { name: 'Sandbox', file: 'env/sandbox.json' },
  { name: 'Local', file: 'env/local.json' },
  { name: 'CI', file: 'env/ci.json' },
  { name: 'Beta', file: 'env/beta.json' },
  { name: 'Alpha', file: 'env/alpha.json' },
  { name: 'Test', file: 'env/test.json' },
  { name: 'Demo', file: 'env/demo.json' },
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
          scrollOffset={0}
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
          scrollOffset={0}
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
          scrollOffset={0}
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
          scrollOffset={0}
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
          scrollOffset={0}
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
          scrollOffset={0}
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
          scrollOffset={0}
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
          scrollOffset={0}
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
          scrollOffset={0}
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

  describe('position counter', () => {
    it('renders the position counter {selectedIndex+1}/{total}', () => {
      const { lastFrame } = render(
        <EnvSelectOverlay
          options={options}
          selectedIndex={1}
          scrollOffset={0}
          activeEnvName={null}
          error={null}
        />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('2/3');
    });

    it('renders 1/12 for first of many options', () => {
      const { lastFrame } = render(
        <EnvSelectOverlay
          options={manyOptions}
          selectedIndex={0}
          scrollOffset={0}
          activeEnvName={null}
          error={null}
        />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('1/12');
    });

    it('renders correct position when scrolled', () => {
      const { lastFrame } = render(
        <EnvSelectOverlay
          options={manyOptions}
          selectedIndex={9}
          scrollOffset={2}
          activeEnvName={null}
          error={null}
        />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('10/12');
    });
  });

  describe('footer hints', () => {
    it('renders g/G top/bottom hint', () => {
      const { lastFrame } = render(
        <EnvSelectOverlay
          options={options}
          selectedIndex={0}
          scrollOffset={0}
          activeEnvName={null}
          error={null}
        />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).toContain('g/G');
      expect(frame).toContain('top/bottom');
    });
  });

  describe('visible window slicing', () => {
    it('renders only visible options when scrollOffset > 0', () => {
      const { lastFrame } = render(
        <EnvSelectOverlay
          options={manyOptions}
          selectedIndex={9}
          scrollOffset={2}
          activeEnvName={null}
          error={null}
        />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).not.toContain('Dev');
      expect(frame).toContain('Staging');
      expect(frame).toContain('Alpha');
      expect(frame).not.toContain('Test');
      expect(frame).not.toContain('Demo');
    });

    it('renders all options when count is below the cap', () => {
      const { lastFrame } = render(
        <EnvSelectOverlay
          options={options}
          selectedIndex={0}
          scrollOffset={0}
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

  describe('highlight with scroll offset', () => {
    it('highlights the option at the global selectedIndex, not the slice-local index', () => {
      const { lastFrame } = render(
        <EnvSelectOverlay
          options={manyOptions}
          selectedIndex={5}
          scrollOffset={3}
          activeEnvName={null}
          error={null}
        />,
      );

      const frame = lastFrame() ?? '';
      expect(frame).not.toContain('Staging');
      expect(frame).toContain('QA');
      expect(frame).toContain('Test');
      expect(frame).not.toContain('Demo');
    });
  });
});
