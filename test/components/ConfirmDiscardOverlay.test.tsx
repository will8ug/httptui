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
];

describe('ConfirmDiscardOverlay', () => {
  describe('pending action variants', () => {
    it.each(actionVariations)('renders the description for $action', ({ action, description }) => {
      const { lastFrame } = render(<ConfirmDiscardOverlay pendingAction={action} />);
      const frame = lastFrame() ?? '';
      expect(frame).toContain('Unsaved Changes');
      expect(frame).toContain(description);
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
