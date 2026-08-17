import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from 'ink-testing-library';

import { ConfirmDiscardOverlay } from '../../src/components/ConfirmDiscardOverlay';
import type { PendingDiscardAction } from '../../src/core/types';

afterEach(() => {
  cleanup();
});

const actionVariations: Array<{ action: PendingDiscardAction; description: string }> = [
  { action: 'reload', description: 'reloading the file' },
  { action: 'fileLoad', description: 'opening a different file' },
  { action: 'quit', description: 'quitting' },
  { action: 'editorHandoff', description: 'opening external editor' },
];

// The overlay caps at 72 columns, so a long description wraps onto a second
// frame line. Drop the box borders and collapse whitespace so the prompt can be
// compared against the unwrapped source text.
const unwrapFrame = (frame: string): string =>
  frame.replace(/[│╭╮╰╯─]/g, ' ').replace(/\s+/g, ' ');

describe('ConfirmDiscardOverlay', () => {
  describe('pending action variants', () => {
    it.each(actionVariations)('renders the description for $action', ({ action, description }) => {
      const { lastFrame } = render(<ConfirmDiscardOverlay pendingAction={action} />);
      const frame = unwrapFrame(lastFrame() ?? '');
      expect(frame).toContain('Unsaved Changes');
      expect(frame).toContain(`Confirm to proceed with ${description}.`);
    });
  });

  describe('key hint', () => {
    it('shows the y / n / Esc hint', () => {
      const { lastFrame } = render(<ConfirmDiscardOverlay pendingAction="reload" />);
      const frame = lastFrame() ?? '';
      expect(frame).toContain('y to proceed, n or Esc to cancel');
    });
  });
});
