import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from 'ink-testing-library';

import { StatusBar } from '../../src/components/StatusBar';

const baseProps = {
  filePath: 'test.http',
  requestCount: 3,
  selectedIndex: 0,
  insecure: false,
  transientMessage: null as string | null,
  focusedPanel: 'requests' as const,
  detailsScrollOffset: 0,
  detailsTotalLines: 10,
  responseScrollOffset: 0,
  responseTotalLines: 20,
  hasResponse: false,
  envName: null as string | null,
};

afterEach(() => {
  cleanup();
});

describe('shortcut bar and status text', () => {
  it('renders the shortcut bar with [Enter] Send', () => {
    const { lastFrame } = render(<StatusBar {...baseProps} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('[Enter] Send');
  });

  it('shows selection position when focusedPanel is requests', () => {
    const { lastFrame } = render(<StatusBar {...baseProps} focusedPanel="requests" />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('1/3');
  });

  it('shows scroll position over detailsTotalLines when focusedPanel is details', () => {
    const { lastFrame } = render(<StatusBar {...baseProps} focusedPanel="details" />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('↕ 1/10');
  });

  it('shows scroll position over responseTotalLines when focusedPanel is response with hasResponse', () => {
    const { lastFrame } = render(
      <StatusBar {...baseProps} focusedPanel="response" hasResponse={true} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('↕ 1/20');
  });

  it('shows only the file name when focusedPanel is response without hasResponse', () => {
    const { lastFrame } = render(
      <StatusBar {...baseProps} focusedPanel="response" hasResponse={false} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('test.http');
    expect(frame).not.toContain('↕');
  });
});

describe('indicators', () => {
  it('renders transient message text when set', () => {
    const { lastFrame } = render(
      <StatusBar {...baseProps} transientMessage="File reloaded" />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('File reloaded');
  });

  it('does not render transient message when null', () => {
    const { lastFrame } = render(<StatusBar {...baseProps} transientMessage={null} />);
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('File reloaded');
  });

  it('renders environment name when set', () => {
    const { lastFrame } = render(<StatusBar {...baseProps} envName="Production" />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Production');
  });

  it('renders INSECURE when insecure is true', () => {
    const { lastFrame } = render(<StatusBar {...baseProps} insecure={true} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('INSECURE');
  });

  it('does not render INSECURE when insecure is false', () => {
    const { lastFrame } = render(<StatusBar {...baseProps} insecure={false} />);
    const frame = lastFrame() ?? '';
    expect(frame).not.toContain('INSECURE');
  });
});
