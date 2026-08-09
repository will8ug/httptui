import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from 'ink-testing-library';

import { ConfirmInPlaceSaveOverlay } from '../../src/components/ConfirmInPlaceSaveOverlay';

afterEach(() => {
  cleanup();
});

describe('ConfirmInPlaceSaveOverlay', () => {
  it('renders the title', () => {
    const { lastFrame } = render(<ConfirmInPlaceSaveOverlay fileName="api.http" markedCount={3} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Confirm in-place save');
  });

  it('renders the file name in the body', () => {
    const { lastFrame } = render(<ConfirmInPlaceSaveOverlay fileName="api.http" markedCount={3} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('api.http');
  });

  it('renders the marked request count in the body', () => {
    const { lastFrame } = render(<ConfirmInPlaceSaveOverlay fileName="api.http" markedCount={3} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('3 changed request(s)');
  });

  it('shows the y / n / Esc hint', () => {
    const { lastFrame } = render(<ConfirmInPlaceSaveOverlay fileName="api.http" markedCount={3} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('y to save, n or Esc to cancel');
  });
});