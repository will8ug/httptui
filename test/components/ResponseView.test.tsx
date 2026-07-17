import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from 'ink-testing-library';

import { ResponseView } from '../../src/components/ResponseView';
import { createMockResponse, longResponse, compactJsonResponse } from '../helpers/responses';

afterEach(() => {
  cleanup();
});

// Shared base-props object covering all ResponseViewProps fields with sensible defaults.
// Spread-override per test as needed.
const baseProps = {
  response: null,
  error: null,
  isLoading: false,
  verbose: false,
  focused: true,
  scrollOffset: 0,
  horizontalOffset: 0,
  wrapMode: 'nowrap' as const,
  rawMode: false,
  availableHeight: 20,
  searchMatches: [] as number[],
  currentMatchIndex: 0,
  isSearchMode: false,
  lastSearchQuery: '',
  searchQuery: '',
  contentWidthOverride: undefined as number | undefined,
};

describe('content states', () => {
  it('renders the Sending request spinner label when loading', () => {
    const { lastFrame } = render(<ResponseView {...baseProps} isLoading={true} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Sending request');
  });

  it('renders the error message and code', () => {
    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        error={{ message: 'Connection refused', code: 'ECONNREFUSED' }}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Connection refused');
    expect(frame).toContain('ECONNREFUSED');
  });

  it('renders the empty state prompt when no response and not loading', () => {
    const { lastFrame } = render(<ResponseView {...baseProps} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Press Enter to send a request');
  });
});

describe('display modes', () => {
  it('pretty-prints JSON by default (multi-line indented)', () => {
    const { lastFrame } = render(
      <ResponseView {...baseProps} response={compactJsonResponse} />,
    );
    const frame = lastFrame() ?? '';
    // Pretty-printed JSON has a space after the colon: "id": "1"
    expect(frame).toContain('"id": "1"');
    // Raw single-line form has no space: "id":"1"
    expect(frame).not.toContain('"id":"1"');
  });

  it('renders the raw single-line body in raw mode', () => {
    const { lastFrame } = render(
      <ResponseView {...baseProps} response={compactJsonResponse} rawMode={true} />,
    );
    const frame = lastFrame() ?? '';
    // Raw body preserves compact form: "id":"1" (no space after colon)
    expect(frame).toContain('"id":"1"');
    expect(frame).not.toContain('"id": "1"');
    // Title shows [raw] indicator
    expect(frame).toContain('[raw]');
  });

  it('renders response headers in verbose mode', () => {
    const response = createMockResponse({
      body: 'hello',
      headers: { 'Content-Type': 'text/plain', 'X-Custom': 'value' },
    });
    const { lastFrame } = render(
      <ResponseView {...baseProps} response={response} verbose={true} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Content-Type');
    expect(frame).toContain('text/plain');
    expect(frame).toContain('X-Custom');
  });
});

describe('scroll and overflow', () => {
  it('slices the visible window with non-zero scrollOffset', () => {
    // 8 body lines: aaa, bbb, ..., hhh
    // Layout (nowrap, non-verbose): VL0=status, VL1=separator, VL2-9=body
    const response = createMockResponse({
      body: 'aaa\nbbb\nccc\nddd\neee\nfff\nggg\nhhh',
    });
    // availableHeight=6 -> visibleHeight = max(1, 6-3-0) = 3
    // scrollOffset=5 -> slice = VL5, VL6, VL7 = ddd, eee, fff
    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        response={response}
        scrollOffset={5}
        availableHeight={6}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('ddd');
    expect(frame).toContain('eee');
    expect(frame).toContain('fff');
    expect(frame).not.toContain('aaa');
    expect(frame).not.toContain('ggg');
  });

  it('shifts content left with horizontalOffset in nowrap mode', () => {
    // Body: 10 A's, dash, 10 B's, dash, 10 C's = 32 chars (not JSON)
    const response = createMockResponse({
      body: 'AAAAAAAAAA-BBBBBBBBBB-CCCCCCCCCC',
    });
    // horizontalOffset=11 shifts past "AAAAAAAAAA-", contentWidthOverride=20 pins width
    // Body line: flat.slice(11) = "BBBBBBBBBB-CCCCCCCCCC" (21), truncated to 20 = "BBBBBBBBBB-CCCCCCCCC…"
    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        response={response}
        horizontalOffset={11}
        contentWidthOverride={20}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('BBBBBBBBBB');
    expect(frame).not.toContain('AAAAAAAAAA');
  });

  it('truncates long lines at the content width in nowrap mode', () => {
    // longResponse body = 'x'.repeat(200) — single long line
    // contentWidthOverride=10 -> truncateText produces 9 x's + ellipsis
    const { lastFrame } = render(
      <ResponseView {...baseProps} response={longResponse} contentWidthOverride={10} />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('…');
    expect(frame).not.toContain('x'.repeat(200));
  });

  it('wraps long content onto subsequent visual lines in wrap mode', () => {
    // Body: "ABCDEFGHIJ" (10 chars, not JSON), contentWidthOverride=5
    // wrapLine("ABCDEFGHIJ", 5) -> ["ABCDE", "FGHIJ"] — two visual lines
    const response = createMockResponse({ body: 'ABCDEFGHIJ' });
    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        response={response}
        wrapMode={'wrap' as const}
        contentWidthOverride={5}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('ABCDE');
    expect(frame).toContain('FGHIJ');
    expect(frame).not.toContain('…');
    // Title shows [wrap] indicator
    expect(frame).toContain('[wrap]');
  });
});

describe('search markers', () => {
  it('marks the current search match line with ►', () => {
    // Body: 3 lines — apple, banana, cherry
    // Layout: VL0=status, VL1=separator, VL2=apple, VL3=banana, VL4=cherry
    // bodyVisualStart = [2, 3, 4]
    // searchMatches=[0,2] -> matchVisualIndices={2,4}
    // currentMatchIndex=0 -> currentMatchVisualIndex=bodyVisualStart[0]=2
    // VL2 is current -> ►, VL4 is non-current -> ·
    const response = createMockResponse({ body: 'apple\nbanana\ncherry' });
    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        response={response}
        searchMatches={[0, 2]}
        currentMatchIndex={0}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('►');
  });

  it('marks non-current search match lines with ·', () => {
    // searchMatches=[0,1,2], currentMatchIndex=0 -> current at VL2
    // scrollOffset=3 -> slice starts at VL3 (banana), VL4 (cherry)
    // Both are non-current matches -> · marker, no ► in visible slice
    const response = createMockResponse({ body: 'apple\nbanana\ncherry' });
    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        response={response}
        searchMatches={[0, 1, 2]}
        currentMatchIndex={0}
        scrollOffset={3}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('·');
    expect(frame).not.toContain('►');
  });
});

describe('search bar', () => {
  it('shows / and the query while typing in search mode', () => {
    // isSearchMode=true -> search bar renders "/{searchQuery}_  (Esc to cancel)"
    const { lastFrame } = render(
      <ResponseView {...baseProps} isSearchMode={true} searchQuery="world" />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('/world');
  });

  it('shows the match position indicator after search', () => {
    // isSearchMode=false, lastSearchQuery="a", searchMatches=[0,1,2], currentMatchIndex=0
    // -> matchInfo = "[1/3]" (currentMatchIndex+1=1, searchMatches.length=3)
    const response = createMockResponse({ body: 'apple\nbanana\ncherry' });
    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        response={response}
        lastSearchQuery="a"
        searchMatches={[0, 1, 2]}
        currentMatchIndex={0}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('[1/3]');
  });

  it('indicates no matches when searchMatches is empty', () => {
    // lastSearchQuery="xyz", searchMatches=[] -> matchInfo = "[No matches]"
    const response = createMockResponse({ body: 'apple\nbanana\ncherry' });
    const { lastFrame } = render(
      <ResponseView
        {...baseProps}
        response={response}
        lastSearchQuery="xyz"
        searchMatches={[]}
      />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('[No matches]');
  });
});
